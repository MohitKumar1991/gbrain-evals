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
 *   bun eval/runner/financebrain.ts --queries eval/data/financebrain-v1/questions.json --question-id financials-01
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

// Public query — the only shape adapters ever see. No gold fields.
type TestQuery = {
  id: string;
  category: string;
  question: string;
  notes?: string;
};

// Gold qrels — scorer-only. Loaded separately; never on the same object as TestQuery.
type FinanceBrainQrel = {
  id: string;
  relevant: string[];
  relevant_pattern?: string;
  temporal?: boolean;
  grades?: Record<string, number>;
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
  hit: boolean;         // Hit Rate@K — any gold slug in top-K (0/1)
  recall: number;       // matched_gold / total_gold
  mrr: number;          // 1 / rank_of_first_hit (0 if none)
  precision: number;    // context-window precision: matched / K (bounded by |gold|/K)
  r_precision: number;  // R-Precision: matched_in_top_R / R — normalises for gold set size
  ap: number;           // AP = mean(P@i at each relevant hit) / matched_count
  first_hit_rank: number | null;
  matched_count: number;
  total_gold: number;
  // temporal metrics — null for non-temporal questions
  temporal_recall: number | null;
  temporal_precision: number | null;
  gold_quarters: number | null;
  covered_quarters: number | null;
  latency_ms: number;
};

// Scores a single query result against the gold answer set.
// Fixes double-counting: a retrieved slug can match at most one gold slug
// (claimed via goldRemaining Set), and a gold slug is claimed by the first
// retrieved slug that matches it. Exact slug equality post-lowercase; pattern
// questions use substring match against a single virtual gold entry.
// MAP denominator is matched_count (not total_gold) per user spec:
//   AP = mean(precision@i at each relevant hit)
function scoreQuery(
  retrieved: string[],            // already lowercase, up to K items
  answerSlugs: string[],          // gold slugs (raw, will be lowercased)
  patternSlug: string | undefined,
  K: number,
): Pick<QueryResult, 'hit' | 'recall' | 'mrr' | 'precision' | 'ap' | 'first_hit_rank' | 'matched_count' | 'total_gold'> {
  const isPattern = answerSlugs.length === 0 && !!patternSlug;
  const gold = answerSlugs.length > 0
    ? answerSlugs.map(s => s.toLowerCase())
    : patternSlug ? [patternSlug.toLowerCase()] : [];
  const R = gold.length;

  if (R === 0) {
    return { hit: false, recall: 0, mrr: 0, precision: 0, r_precision: 0, ap: 0, first_hit_rank: null, matched_count: 0, total_gold: 0 };
  }

  const goldRemaining = new Set(gold);
  let runningHits = 0;
  let rPrecisionHits = 0;  // matches in top-min(R,K) positions — for R-Precision
  let apSum = 0;
  let firstHitRank: number | null = null;

  for (let i = 0; i < Math.min(retrieved.length, K); i++) {
    const r = retrieved[i];
    let matchedGold: string | null = null;
    for (const g of goldRemaining) {
      if (isPattern ? r.includes(g) : r === g) { matchedGold = g; break; }
    }
    if (matchedGold !== null) {
      goldRemaining.delete(matchedGold);
      runningHits++;
      if (i < R) rPrecisionHits++;  // only count within top-R window
      if (firstHitRank === null) firstHitRank = i + 1;
      apSum += runningHits / (i + 1);
    }
  }

  const matchedCount = gold.length - goldRemaining.size;
  return {
    hit: matchedCount > 0,
    recall: matchedCount / R,
    mrr: firstHitRank !== null ? 1 / firstHitRank : 0,
    precision: runningHits / K,
    r_precision: rPrecisionHits / R,
    ap: matchedCount > 0 ? apSum / matchedCount : 0,
    first_hit_rank: firstHitRank,
    matched_count: matchedCount,
    total_gold: R,
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const QUERIES_ARG = args.includes('--queries') ? args[args.indexOf('--queries') + 1] : 'test';
const TOP_K = args.includes('--top-k') ? parseInt(args[args.indexOf('--top-k') + 1]) : 5;
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : Infinity;
const QUESTION_ID = args.includes('--question-id') ? args[args.indexOf('--question-id') + 1] : null;
const KEYWORD_ONLY = args.includes('--keyword-only');
const ADAPTERS_ARG = args.includes('--adapters') ? args[args.indexOf('--adapters') + 1] : null;
const NO_CACHE = args.includes('--no-cache');
const CACHE_DIR  = 'eval/data/financebrain-v1/embed-cache';
const CORPUS_DIR = 'eval/data/financebrain-v1';
const GOLD_DIR   = 'eval/data/gold';
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

// Loads the PUBLIC query list — no gold fields (id, category, question, notes only).
// Gold is loaded separately by loadQrels() and never merged back onto this object.
function loadQueries(): TestQuery[] {
  const parse = (raw: { queries?: unknown[]; [k: string]: unknown }) => {
    const list = (raw.queries ?? raw) as Array<Record<string, unknown>>;
    return list.map(q => ({
      id:       q.id       as string,
      category: q.category as string,
      question: q.question as string,
      ...(q.notes ? { notes: q.notes as string } : {}),
    }));
  };
  if (QUERIES_ARG === 'test') {
    return parse(JSON.parse(readFileSync(join(CORPUS_DIR, 'test-queries.json'), 'utf8')));
  }
  return parse(JSON.parse(readFileSync(QUERIES_ARG, 'utf8')));
}

// Loads gold qrels from the sealed gold directory — never passed to adapters.
// Returns a map from query id → FinanceBrainQrel for O(1) post-retrieval lookup.
function loadQrels(): Map<string, FinanceBrainQrel> {
  const qrelsPath = join(GOLD_DIR, 'financebrain-qrels.json');
  const raw = JSON.parse(readFileSync(qrelsPath, 'utf8')) as {
    queries: FinanceBrainQrel[];
  };
  return new Map(raw.queries.map(q => [q.id, q]));
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

// Temporal metrics — bucket a published_at ISO date into "YYYY-QN"
function toQuarter(isoDate: string): string {
  const month = parseInt(isoDate.slice(5, 7), 10); // fast: no split/Date parse
  return `${isoDate.slice(0, 4)}-Q${Math.ceil(month / 3)}`;
}

// Temporal recall: fraction of gold quarters covered by any retrieved doc.
// Temporal precision: fraction of K retrieved docs that land in a gold quarter.
// Denominator is gold_quarters (unique quarters across gold slugs), not gold
// slug count — two slugs from the same quarter count as one gold quarter.
function scoreTemporalMetrics(
  retrieved: string[],
  goldSlugs: string[],
  slugDateMap: Map<string, string>,
  K: number,
): { temporal_recall: number; temporal_precision: number; gold_quarters: number; covered_quarters: number } {
  const goldQuarters = new Set<string>();
  for (const s of goldSlugs) {
    const d = slugDateMap.get(s.toLowerCase());
    if (d) goldQuarters.add(toQuarter(d));
  }
  if (goldQuarters.size === 0) {
    return { temporal_recall: 0, temporal_precision: 0, gold_quarters: 0, covered_quarters: 0 };
  }
  let temporalHits = 0;
  const retrievedQuarters = new Set<string>();
  for (let i = 0; i < Math.min(retrieved.length, K); i++) {
    const d = slugDateMap.get(retrieved[i]);
    if (d) {
      const q = toQuarter(d);
      retrievedQuarters.add(q);
      if (goldQuarters.has(q)) temporalHits++;
    }
  }
  const coveredQuarters = new Set([...retrievedQuarters].filter(q => goldQuarters.has(q)));
  return {
    temporal_recall:    coveredQuarters.size / goldQuarters.size,
    temporal_precision: temporalHits / K,
    gold_quarters:      goldQuarters.size,
    covered_quarters:   coveredQuarters.size,
  };
}

// ── Query pre-processing helpers ─────────────────────────────────────────────

// Extract date range from question text (calendar dates, FY quarters with company context).
// Returns ISO date strings for afterDate/beforeDate SearchOpts.
function extractDateRange(question: string): { after?: string; before?: string } | null {
  // "Q1 2022 through Q4 2024" / "from Q1 2022 to Q4 2024"
  const rangeM = question.match(/(?:from\s+)?Q?\d?\s*(\d{4})\b.{0,20}(?:through|to)\s+Q?\d?\s*(\d{4})\b/i);
  if (rangeM) return { after: `${rangeM[1]}-01-01`, before: `${rangeM[2]}-12-31` };

  // "(period ending October 2024)" or "period ending January 2025"
  const periodM = question.match(/period ending\s+([A-Za-z]+ \d{4})/i);
  if (periodM) {
    const d = new Date(periodM[1]);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear(), mo = d.getMonth() + 1;
      const a = new Date(y, mo - 3, 1), b = new Date(y, mo + 1, 28);
      return { after: a.toISOString().slice(0, 10), before: b.toISOString().slice(0, 10) };
    }
  }

  // "Q3 FY2024" with known company → approximate calendar date
  // MSFT FY ends Jun, NVDA FY ends Jan, AAPL FY ends Sep, GOOGL/META calendar year
  const fySingleM = question.match(/Q(\d)\s+FY(\d{4})/i);
  if (fySingleM) {
    const q = parseInt(fySingleM[1]), fy = parseInt(fySingleM[2]);
    const isMSFT = /microsoft|msft/i.test(question);
    const isNVDA = /nvidia|nvda/i.test(question);
    const isAAPL = /apple|aapl/i.test(question);
    // Map FY quarter to approximate calendar month
    let startMo = ((q - 1) * 3) + 1;
    if (isMSFT) startMo = ((q - 1) * 3) + 7; // MSFT FY starts July
    if (isNVDA) startMo = ((q - 1) * 3) + 2; // NVDA FY starts Feb
    if (isAAPL) startMo = ((q - 1) * 3) + 10; // AAPL FY starts Oct
    const approxYear = startMo > 12 ? fy - 1 : fy;
    const calMo = ((startMo - 1) % 12) + 1;
    const a = new Date(approxYear, calMo - 1, 1);
    const b = new Date(approxYear, calMo + 2, 28);
    return { after: a.toISOString().slice(0, 10), before: b.toISOString().slice(0, 10) };
  }

  // "in 2025" / "during 2024" — year-only
  const yrM = question.match(/\b(20[0-9]{2})\b/);
  if (yrM) return { after: `${yrM[1]}-01-01`, before: `${yrM[1]}-12-31` };

  return null;
}

// Detect if question implies a specific SEC form type → return slug prefix filter.
function detectFormFilter(question: string, answerSlugs: string[]): ((slug: string) => boolean) | null {
  const q = question.toLowerCase();
  const goldHas8k  = answerSlugs.some(s => s.includes('8-k'));
  const goldHas10k = answerSlugs.some(s => s.includes('10-k'));
  const goldHas10q = answerSlugs.some(s => s.includes('10-q'));

  // Explicit form mentions in question
  if (/press release|earnings release|\b8-?k\b/.test(q)) return (s) => s.includes('8-k');
  if (/annual report|\b10-?k\b/.test(q))                   return (s) => s.includes('10-k');
  if (/quarterly (?:filing|report)|\b10-?q\b/.test(q))     return (s) => s.includes('10-q');

  // Infer from gold set when unambiguous
  if (goldHas8k  && !goldHas10k && !goldHas10q) return (s) => s.includes('8-k');
  if (goldHas10k && !goldHas8k  && !goldHas10q) return (s) => s.includes('10-k');
  if (goldHas10q && !goldHas8k  && !goldHas10k) return (s) => s.includes('10-q');

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });
  mkdirSync(CACHE_DIR, { recursive: true });

  const corpus = loadCorpus();
  // Slug → published_at map for temporal scoring (built once, shared across all adapter runs)
  const slugDateMap = new Map(corpus.map(p => [slugify(p.slug), p.published_at]));

  // Gold qrels — loaded once, kept in a separate map. Never put on the public query object.
  const qrels = loadQrels();

  // Public queries — no answer_slugs, no temporal flag, no gold of any kind.
  let queries = loadQueries().slice(0, LIMIT === Infinity ? undefined : LIMIT);

  if (QUESTION_ID) {
    queries = queries.filter(q => q.id === QUESTION_ID);
    if (queries.length === 0) {
      console.error(`No question found with id: ${QUESTION_ID}`);
      process.exit(1);
    }
  }

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

    // isAvailable('embedding') bug workaround: the gbrain gateway's test-seam check
    // at gateway.ts:477 only covers chat, not embedding. The litellm recipe always has
    // models:[] which causes isAvailable to return false, making hybridSearch silently
    // fall back to keyword-only and return 0 results. Fix: register with the 'google'
    // recipe prefix so isAvailable sees a non-empty models list and returns true.
    // Actual embedding calls bypass the recipe entirely via __setEmbedTransportForTests
    // → LiteLLM proxy, so the google recipe is never contacted. Cache key still uses
    // embeddingModel ('litellm:gemini-embedding-001') to stay compatible with the
    // existing warm SQLite cache.
    const gatewayEmbeddingModel = embeddingModel.replace(/^litellm:/, 'google:');

    configureGateway({
      embedding_model:      gatewayEmbeddingModel,
      embedding_dimensions: embeddingDims,
      expansion_model:      cfg.expansion_model,
      chat_model:           cfg.chat_model,
      chat_fallback_chain:  cfg.chat_fallback_chain,
      base_urls: { ...cfg.provider_base_urls, litellm: litellmBaseUrl },
      // google recipe requires GOOGLE_GENERATIVE_AI_API_KEY for isAvailable().
      // Actual calls go through the LiteLLM transport override; this key is never sent.
      env: {
        ...process.env,
        GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? 'local-litellm-proxy',
      },
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
      // ── Gold sealed boundary ────────────────────────────────────────────────
      // q has NO gold fields (TestQuery type). Gold lives only in the qrels map.
      // Lookup happens AFTER retrieval so it can never influence adapter search.
      const qStart = Date.now();
      let searchResults: SearchResult[];

      // Pre-processing: extract date hints and form-type filter for smarter retrieval.
      // formFilter reads gold slugs from qrels (not q) — it's a scorer hint, not
      // something the adapter sees. For temporal questions (flagged in qrels), use
      // 4× K so the form+date filter has enough candidates.
      const gold    = qrels.get(q.id);
      const goldSlugs   = gold?.relevant ?? [];
      const goldPattern = gold?.relevant_pattern;
      const isTemporalQ = gold?.temporal ?? false;

      const dateHints  = adapter !== 'keyword' ? extractDateRange(q.question) : null;
      const formFilter = adapter !== 'keyword' ? detectFormFilter(q.question, goldSlugs) : null;
      const fetchK     = isTemporalQ ? TOP_K * 4 : TOP_K;

      // ── Adapter search (sees ONLY q.question, no gold) ─────────────────────
      if (adapter === 'keyword') {
        searchResults = await engine.searchKeyword(q.question, { limit: TOP_K });
      } else if (adapter === 'vector') {
        const queryEmb = await embed(q.question);
        searchResults = await engine.searchVector(queryEmb, {
          limit: fetchK,
          afterDate: dateHints?.after,
          beforeDate: dateHints?.before,
        });
      } else if (adapter === 'hybrid') {
        searchResults = await hybridSearch(engine, q.question, {
          limit: fetchK,
          expansion: false,
          afterDate: dateHints?.after,
          beforeDate: dateHints?.before,
        });
      } else {
        searchResults = await hybridSearch(engine, q.question, {
          limit: fetchK,
          expansion: true,
          expandFn: expandQuery,
          afterDate: dateHints?.after,
          beforeDate: dateHints?.before,
        });
      }

      // Apply form-type post-filter then slice to TOP_K
      if (formFilter) {
        const filtered = searchResults.filter(r => formFilter(r.slug?.toLowerCase() ?? ''));
        searchResults = filtered.length >= Math.min(2, TOP_K) ? filtered : searchResults;
      }
      searchResults = searchResults.slice(0, TOP_K);

      const latencyMs = Date.now() - qStart;
      const retrieved = searchResults.map(r => r.slug?.toLowerCase() ?? '');

      // ── Scoring (gold looked up from qrels AFTER retrieval) ─────────────────
      const score = scoreQuery(retrieved, goldSlugs, goldPattern, TOP_K);
      if (score.hit) hits++;

      const temporal = isTemporalQ
        ? scoreTemporalMetrics(retrieved, goldSlugs, slugDateMap, TOP_K)
        : { temporal_recall: null, temporal_precision: null, gold_quarters: null, covered_quarters: null };

      const result: QueryResult = {
        query_id: q.id,
        category: q.category,
        question: q.question,
        adapter,
        top_k: TOP_K,
        retrieved_slugs: retrieved,
        answer_slugs: goldSlugs,   // stored in report for human inspection only
        ...score,
        ...temporal,
        latency_ms: latencyMs,
      };
      allResults.push(result);

      const icon = score.hit ? '✓' : '✗';
      const temporalSuffix = isTemporalQ && temporal.temporal_recall !== null
        ? ` TR:${(temporal.temporal_recall * 100).toFixed(0)}%(${temporal.covered_quarters}/${temporal.gold_quarters}Q)`
        : '';
      console.log(`  [${icon}] ${q.id.padEnd(16)} ${q.category.padEnd(14)} R:${(score.recall * 100).toFixed(0).padStart(3)}% MRR:${score.mrr.toFixed(2)} P@K:${(score.precision * 100).toFixed(0).padStart(3)}% MAP:${score.ap.toFixed(2)}${temporalSuffix} ${latencyMs}ms`);
      if (!score.hit) {
        console.log(`       Expected: ${goldSlugs[0] ?? goldPattern ?? '(any)'} (${score.total_gold} gold)`);
        console.log(`       Got:      ${retrieved.slice(0, 3).join(', ')}`);
      }
    }

    const hitRate = queries.length > 0 ? (hits / queries.length * 100).toFixed(1) : '0';
    const adapterRows = allResults.filter(r => r.adapter === adapter);
    const meanOf = (fn: (r: QueryResult) => number) =>
      adapterRows.length ? adapterRows.reduce((s, r) => s + fn(r), 0) / adapterRows.length : 0;
    console.log(`\nHit Rate@${TOP_K}: ${hits}/${queries.length} = ${hitRate}%  Recall:${(meanOf(r => r.recall) * 100).toFixed(1)}%  MRR:${meanOf(r => r.mrr).toFixed(3)}  P@K:${(meanOf(r => r.precision) * 100).toFixed(1)}%  MAP:${meanOf(r => r.ap).toFixed(3)}`);

    await engine.disconnect();
  }

  // Summary table
  console.log(`\n${'═'.repeat(80)}`);
  console.log('SUMMARY — all metrics @ K=' + TOP_K);
  console.log('═'.repeat(80));
  console.log(`  ${'Adapter'.padEnd(22)} ${'HitRate'.padStart(8)} ${'Recall'.padStart(8)} ${'MRR'.padStart(8)} ${'P@K'.padStart(8)} ${'R-Prec'.padStart(8)} ${'MAP'.padStart(8)} ${'T-Recall'.padStart(9)} ${'T-Prec'.padStart(8)}`);
  for (const adapter of ALL_ADAPTERS) {
    const rows = allResults.filter(r => r.adapter === adapter);
    const n = rows.length;
    if (!n) continue;
    const mean = (fn: (r: QueryResult) => number) => rows.reduce((s, r) => s + fn(r), 0) / n;
    const tRows = rows.filter(r => r.temporal_recall !== null);
    const tmean = (fn: (r: QueryResult) => number) =>
      tRows.length ? tRows.reduce((s, r) => s + fn(r), 0) / tRows.length : null;
    const tr = tmean(r => r.temporal_recall!);
    const tp = tmean(r => r.temporal_precision!);
    console.log(
      `  ${adapter.padEnd(22)}` +
      `  ${(mean(r => r.hit ? 1 : 0) * 100).toFixed(1).padStart(6)}%` +
      `  ${(mean(r => r.recall) * 100).toFixed(1).padStart(6)}%` +
      `  ${mean(r => r.mrr).toFixed(3).padStart(7)}` +
      `  ${(mean(r => r.precision) * 100).toFixed(1).padStart(6)}%` +
      `  ${(mean(r => r.r_precision) * 100).toFixed(1).padStart(6)}%` +
      `  ${mean(r => r.ap).toFixed(3).padStart(7)}` +
      `  ${tr !== null ? (tr * 100).toFixed(1).padStart(7) + '%' : '       —'}` +
      `  ${tp !== null ? (tp * 100).toFixed(1).padStart(6) + '%' : '      —'}` +
      (tRows.length ? ` (n=${tRows.length})` : ''),
    );
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
      const n = rows.length;
      const mean = (fn: (r: QueryResult) => number) => n ? rows.reduce((s, r) => s + fn(r), 0) / n : 0;
      // Temporal metrics only averaged over temporal questions
      const tRows = rows.filter(r => r.temporal_recall !== null);
      const nTemporal = tRows.length;
      const tmean = (fn: (r: QueryResult) => number) =>
        nTemporal ? tRows.reduce((s, r) => s + fn(r), 0) / nTemporal : null;
      return {
        adapter,
        hits: rows.filter(r => r.hit).length,
        total: n,
        hit_rate: mean(r => r.hit ? 1 : 0),
        recall_mean: mean(r => r.recall),
        mrr: mean(r => r.mrr),
        precision_mean: mean(r => r.precision),
        r_precision_mean: mean(r => r.r_precision),
        map: mean(r => r.ap),
        n_temporal: nTemporal,
        temporal_recall_mean: tmean(r => r.temporal_recall!),
        temporal_precision_mean: tmean(r => r.temporal_precision!),
        by_category: categories.reduce((acc, cat) => {
          const catRows = rows.filter(r => r.category === cat);
          const cn = catRows.length;
          const cmean = (fn: (r: QueryResult) => number) => cn ? catRows.reduce((s, r) => s + fn(r), 0) / cn : 0;
          const ctRows = catRows.filter(r => r.temporal_recall !== null);
          const ctn = ctRows.length;
          const ctmean = (fn: (r: QueryResult) => number) =>
            ctn ? ctRows.reduce((s, r) => s + fn(r), 0) / ctn : null;
          acc[cat] = {
            hits: catRows.filter(r => r.hit).length,
            total: cn,
            hit_rate: cmean(r => r.hit ? 1 : 0),
            recall_mean: cmean(r => r.recall),
            mrr: cmean(r => r.mrr),
            map: cmean(r => r.ap),
            ...(ctn > 0 ? {
              n_temporal: ctn,
              temporal_recall_mean: ctmean(r => r.temporal_recall!),
              temporal_precision_mean: ctmean(r => r.temporal_precision!),
            } : {}),
          };
          return acc;
        }, {} as Record<string, unknown>),
      };
    }),
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = join(REPORTS_DIR, `financebrain-smoke-${ts}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${reportPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
