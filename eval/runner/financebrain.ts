#!/usr/bin/env bun
/**
 * FinanceBrain eval runner
 *
 * Indexes all pages from eval/data/financebrain-v1/ into a PGLite brain,
 * then runs queries against four adapters and scores Recall@K.
 *
 * For the smoke-test / end-to-end validation, pass --queries test to run
 * just the 9 dummy queries (one per source_type category). For a full
 * benchmark run, pass --queries <path-to-questions.json>.
 *
 * Usage:
 *   bun eval/runner/financebrain.ts --queries test              # smoke test
 *   bun eval/runner/financebrain.ts --queries test --keyword-only
 *   bun eval/runner/financebrain.ts --queries eval/data/financebrain-v1/questions.json
 *   bun eval/runner/financebrain.ts --adapters keyword,hybrid
 *   bun eval/runner/financebrain.ts --top-k 5 --limit 20
 *
 * Env vars required for vector/hybrid adapters:
 *   LITELLM_BASE_URL      LiteLLM proxy URL (default: http://localhost:4000)
 *   LITELLM_API_KEY       optional proxy auth key
 *   ANTHROPIC_API_KEY     query expansion via Claude Haiku
 *
 * Embedding model (set in gbrain.yml or via env, default: litellm:text-embedding-004):
 *   GBRAIN_EMBEDDING_MODEL      e.g. litellm:text-embedding-004
 *   GBRAIN_EMBEDDING_DIMENSIONS e.g. 768 (Google text-embedding-004)
 *
 * The LiteLLM proxy should be configured to route the embedding model to
 * Vertex AI. Example litellm proxy config snippet:
 *   model_list:
 *     - model_name: text-embedding-004
 *       litellm_params:
 *         model: vertex_ai/text-embedding-004
 *         vertex_project: <your-gcp-project>
 *         vertex_location: us-central1
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PGLiteEngine } from 'gbrain/pglite-engine';
import { importFromContent } from 'gbrain/import-file';
import { hybridSearch } from 'gbrain/search/hybrid';
import { expandQuery } from 'gbrain/search/expansion';
import { loadConfig } from 'gbrain/config';
import type { SearchResult } from 'gbrain/types';
import {
  configureGateway,
  __setEmbedTransportForTests,
} from '../../node_modules/gbrain/src/core/ai/gateway.ts';
import { embed } from '../../node_modules/gbrain/src/core/embedding.ts';
import { EmbeddingCache, makeCachingTransport } from './longmemeval-cache.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

type FinancePage = {
  slug: string;
  source_type: string;
  title: string;
  published_at: string;
  compiled_truth: string;
  companies_mentioned: string[];
  quarter_context?: Record<string, unknown>;
};

type TestQuery = {
  id: string;
  category: string;
  question: string;
  answer_slugs: string[];
  answer_slug_pattern?: string;
  notes?: string;
};

type AdapterMode = 'keyword' | 'vector' | 'hybrid' | 'hybrid+expansion';

type QueryResult = {
  query_id: string;
  category: string;
  question: string;
  adapter: AdapterMode;
  top_k: number;
  retrieved_slugs: string[];
  answer_slugs: string[];
  hit: boolean;
  latency_ms: number;
};

// ── CLI ────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const QUERIES_ARG = args.includes('--queries') ? args[args.indexOf('--queries') + 1] : 'test';
const TOP_K = args.includes('--top-k') ? parseInt(args[args.indexOf('--top-k') + 1]) : 5;
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : Infinity;
const KEYWORD_ONLY = args.includes('--keyword-only');
const ADAPTERS_ARG = args.includes('--adapters') ? args[args.indexOf('--adapters') + 1] : null;
const NO_CACHE = args.includes('--no-cache');
const CACHE_DIR = 'eval/data/financebrain-v1/embed-cache';
const CORPUS_DIR = 'eval/data/financebrain-v1';
const REPORTS_DIR = 'eval/reports/financebrain';

const ALL_ADAPTERS: AdapterMode[] = KEYWORD_ONLY
  ? ['keyword']
  : ADAPTERS_ARG
    ? (ADAPTERS_ARG.split(',') as AdapterMode[])
    : ['keyword', 'vector', 'hybrid', 'hybrid+expansion'];

// ── Corpus loader ─────────────────────────────────────────────────────────────

function walkJson(dir: string): string[] {
  const results: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) results.push(...walkJson(p));
    else if (f.endsWith('.json') && !f.startsWith('_') && f !== 'test-queries.json') results.push(p);
  }
  return results;
}

function loadCorpus(): FinancePage[] {
  const files = walkJson(CORPUS_DIR);
  const pages: FinancePage[] = [];
  for (const f of files) {
    try {
      const p = JSON.parse(readFileSync(f, 'utf8')) as FinancePage;
      if (p.slug && p.compiled_truth) pages.push(p);
    } catch { /* skip malformed */ }
  }
  return pages;
}

function loadQueries(): TestQuery[] {
  if (QUERIES_ARG === 'test') {
    const raw = JSON.parse(readFileSync(join(CORPUS_DIR, 'test-queries.json'), 'utf8'));
    return raw.queries as TestQuery[];
  }
  const raw = JSON.parse(readFileSync(QUERIES_ARG, 'utf8'));
  return (raw.queries ?? raw) as TestQuery[];
}

// ── Engine helpers ────────────────────────────────────────────────────────────

async function resetEngine(engine: PGLiteEngine) {
  const tables = await engine.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  for (const { tablename } of tables.rows) {
    await engine.query(`TRUNCATE TABLE ${tablename} CASCADE`);
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9/_-]/g, '-');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });
  mkdirSync(CACHE_DIR, { recursive: true });

  const corpus = loadCorpus();
  const queries = loadQueries().slice(0, LIMIT === Infinity ? undefined : LIMIT);

  console.log(`Corpus: ${corpus.length} pages`);
  console.log(`Queries: ${queries.length}`);
  console.log(`Adapters: ${ALL_ADAPTERS.join(', ')}  |  top-K: ${TOP_K}`);
  console.log();

  // Source type breakdown
  const byType: Record<string, number> = {};
  for (const p of corpus) byType[p.source_type] = (byType[p.source_type] ?? 0) + 1;
  console.log('Source types:');
  for (const [t, n] of Object.entries(byType).sort()) console.log(`  ${t.padEnd(20)} ${n}`);
  console.log();

  // Configure embedding gateway for vector adapters.
  // Embeddings route through LiteLLM proxy → Vertex AI (Google).
  // GBRAIN_EMBEDDING_MODEL / GBRAIN_EMBEDDING_DIMENSIONS are read by
  // loadConfig() from env, but we also set explicit defaults here so the
  // runner works without a gbrain.yml file.
  const needsEmbeddings = ALL_ADAPTERS.some(a => a !== 'keyword');
  let cache: EmbeddingCache | null = null;
  if (needsEmbeddings) {
    const cfg = loadConfig() || ({} as any);

    // LiteLLM proxy → Vertex AI: gemini-embedding-001 @ 1536 dims.
    // The proxy must be running (see eval/litellm_config.yaml for setup).
    const embeddingModel = cfg.embedding_model ?? 'litellm:gemini-embedding-001';
    const embeddingDims  = cfg.embedding_dimensions ?? 1536;
    const litellmBaseUrl = process.env.LITELLM_BASE_URL ?? 'http://localhost:4000';

    configureGateway({
      embedding_model:      embeddingModel,
      embedding_dimensions: embeddingDims,
      expansion_model:      cfg.expansion_model,
      chat_model:           cfg.chat_model,
      chat_fallback_chain:  cfg.chat_fallback_chain,
      // Merge file-level base_urls with the LiteLLM proxy URL so the litellm
      // recipe resolves correctly regardless of gbrain.yml contents.
      base_urls: { ...cfg.provider_base_urls, litellm: litellmBaseUrl },
      env: { ...process.env },
    });

    console.log(`Embedding: ${embeddingModel} (${embeddingDims}d) via ${litellmBaseUrl}`);

    if (!NO_CACHE) {
      const cacheKey = `${embeddingModel}@${embeddingDims}`;
      const cachePath = join(CACHE_DIR, `embed-cache-${cacheKey.replace(/[^a-z0-9@-]/gi, '_')}.sqlite`);
      cache = new EmbeddingCache(cachePath, cacheKey);

      // gbrain's openai-compatible path calls textEmbeddingModel(id) without
      // dimensions, so the AI SDK omits it from the request and the proxy
      // returns the model default (3072 for gemini-embedding-001). Bypass the
      // AI SDK entirely and call the LiteLLM proxy directly with explicit
      // dimensions so Vertex AI returns exactly embeddingDims vectors.
      const modelId = embeddingModel.replace(/^litellm:/, ''); // 'gemini-embedding-001'
      const litellmApiKey = process.env.LITELLM_API_KEY;
      const realTransport = async (params: { values: string[] } & Record<string, unknown>) => {
        const res = await fetch(`${litellmBaseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(litellmApiKey ? { Authorization: `Bearer ${litellmApiKey}` } : {}),
          },
          body: JSON.stringify({ model: modelId, input: params.values, dimensions: embeddingDims }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`LiteLLM embedding error ${res.status}: ${err.slice(0, 200)}`);
        }
        const data = await res.json() as { data: Array<{ embedding: number[] }> };
        return { embeddings: data.data.map(d => d.embedding) };
      };

      __setEmbedTransportForTests(makeCachingTransport(realTransport, cache));
      console.log(`Embedding cache: ${cachePath}`);
    }
  }

  const allResults: QueryResult[] = [];

  for (const adapter of ALL_ADAPTERS) {
    const noEmbed = adapter === 'keyword';
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Adapter: ${adapter}`);
    console.log(`${'═'.repeat(60)}`);

    // Fresh engine per adapter
    const engine = new PGLiteEngine();
    await engine.connect({});
    await engine.initSchema();

    // Index entire corpus
    console.log(`Indexing ${corpus.length} pages (noEmbed=${noEmbed})...`);
    const indexStart = Date.now();
    let indexed = 0;
    for (const page of corpus) {
      const slug = slugify(page.slug);
      await importFromContent(engine, slug, page.compiled_truth, { noEmbed });
      indexed++;
      if (indexed % 200 === 0) process.stdout.write(`  ${indexed}/${corpus.length}...\r`);
    }
    const indexMs = Date.now() - indexStart;
    console.log(`Indexed ${indexed} pages in ${(indexMs / 1000).toFixed(1)}s`);

    // Run queries
    console.log(`\nRunning ${queries.length} queries (top-K=${TOP_K}):`);
    let hits = 0;

    for (const q of queries) {
      const qStart = Date.now();
      let searchResults: SearchResult[];

      if (adapter === 'keyword') {
        searchResults = await engine.searchKeyword(q.question, { limit: TOP_K });
      } else if (adapter === 'vector') {
        const queryEmb = await embed(q.question);
        searchResults = await engine.searchVector(queryEmb, { limit: TOP_K });
      } else if (adapter === 'hybrid') {
        searchResults = await hybridSearch(engine, q.question, { limit: TOP_K, expansion: false });
      } else {
        searchResults = await hybridSearch(engine, q.question, {
          limit: TOP_K,
          expansion: true,
          expandFn: expandQuery,
        });
      }

      const latencyMs = Date.now() - qStart;
      // Normalize retrieved slugs — results come back as original slugs
      const retrieved = searchResults.map(r => r.slug?.toLowerCase() ?? '');

      // Scoring: hit if any answer_slug appears in retrieved
      const answerSlugs = q.answer_slugs.map(s => s.toLowerCase());
      let hit = answerSlugs.length > 0 && answerSlugs.some(s => retrieved.some(r => r.includes(s)));

      // For social queries with no specific slugs, check if a social/dylan page about the company was retrieved
      if (!hit && q.answer_slug_pattern) {
        hit = retrieved.some(r => r.includes(q.answer_slug_pattern!.toLowerCase()));
      }

      if (hit) hits++;

      const result: QueryResult = {
        query_id: q.id,
        category: q.category,
        question: q.question,
        adapter,
        top_k: TOP_K,
        retrieved_slugs: retrieved,
        answer_slugs: q.answer_slugs,
        hit,
      latency_ms: latencyMs,
      };
      allResults.push(result);

      const icon = hit ? '✓' : '✗';
      console.log(`  [${icon}] ${q.id.padEnd(16)} ${q.category.padEnd(14)} ${latencyMs}ms`);
      if (!hit) {
        console.log(`       Expected: ${answerSlugs[0] ?? q.answer_slug_pattern ?? '(any)'}`);
        console.log(`       Got:      ${retrieved.slice(0, 3).join(', ')}`);
      }
    }

    const recall = queries.length > 0 ? (hits / queries.length * 100).toFixed(1) : '0';
    console.log(`\nRecall@${TOP_K}: ${hits}/${queries.length} = ${recall}%`);

    await engine.disconnect();
  }

  // Summary table
  console.log(`\n${'═'.repeat(60)}`);
  console.log('SUMMARY — Recall@' + TOP_K + ' by adapter');
  console.log('═'.repeat(60));
  for (const adapter of ALL_ADAPTERS) {
    const rows = allResults.filter(r => r.adapter === adapter);
    const hits = rows.filter(r => r.hit).length;
    console.log(`  ${adapter.padEnd(20)} ${hits}/${rows.length} = ${rows.length ? (hits/rows.length*100).toFixed(1) : 0}%`);
  }

  console.log('\nPer-category breakdown:');
  const categories = [...new Set(queries.map(q => q.category))];
  for (const cat of categories) {
    const catQueries = queries.filter(q => q.category === cat);
    process.stdout.write(`  ${cat.padEnd(16)}`);
    for (const adapter of ALL_ADAPTERS) {
      const rows = allResults.filter(r => r.adapter === adapter && r.category === cat);
      const hits = rows.filter(r => r.hit).length;
      process.stdout.write(` ${adapter.padEnd(20)} ${hits}/${rows.length}`);
    }
    console.log();
  }

  // Write JSON report
  const report = {
    run_at: new Date().toISOString(),
    corpus_size: corpus.length,
    adapters: ALL_ADAPTERS,
    top_k: TOP_K,
    queries: queries.length,
    results: allResults,
    summary: ALL_ADAPTERS.map(adapter => {
      const rows = allResults.filter(r => r.adapter === adapter);
      return {
        adapter,
        hits: rows.filter(r => r.hit).length,
        total: rows.length,
        recall_at_k: rows.length ? rows.filter(r => r.hit).length / rows.length : 0,
        by_category: categories.reduce((acc, cat) => {
          const catRows = rows.filter(r => r.category === cat);
          acc[cat] = { hits: catRows.filter(r => r.hit).length, total: catRows.length };
          return acc;
        }, {} as Record<string, { hits: number; total: number }>),
      };
    }),
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = join(REPORTS_DIR, `financebrain-smoke-${ts}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
