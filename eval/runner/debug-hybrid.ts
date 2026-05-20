#!/usr/bin/env bun
/**
 * Debug script for hybrid+expansion on a single question.
 * Logs every step: expansion, embedding, keyword, vector, RRF, scoring.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... LITELLM_BASE_URL=http://localhost:4000 \
 *   bun eval/runner/debug-hybrid.ts
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { PGLiteEngine } from "gbrain/pglite-engine";
import { importFromContent } from "gbrain/import-file";
import { hybridSearch } from "gbrain/search/hybrid";
import { expandQuery } from "gbrain/search/expansion";
import { loadConfig } from "gbrain/config";
import {
  configureGateway,
  __setEmbedTransportForTests,
} from "../../node_modules/gbrain/src/core/ai/gateway.ts";
import { embed } from "../../node_modules/gbrain/src/core/embedding.ts";
import { EmbeddingCache, makeCachingTransport } from "./longmemeval-cache.ts";

const CORPUS_DIR = "eval/data/financebrain-v1";
const CACHE_DIR  = "eval/data/financebrain-v1/embed-cache";
const QUESTION_ID = process.argv[2] ?? "financials-01";
const TOP_K = 5;

const log = (label: string, ...args: unknown[]) => {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶ ${label}`);
  if (args.length) console.log(...args);
};

// ── Load question ──────────────────────────────────────────────────────────

const { queries } = JSON.parse(readFileSync(join(CORPUS_DIR, "questions.json"), "utf8")) as { queries: Array<{ id: string; question: string; answer_slugs: string[]; answer_slug_pattern?: string }> };
const q = queries.find(x => x.id === QUESTION_ID);
if (!q) { console.error("Question not found:", QUESTION_ID); process.exit(1); }

log("Question", `ID: ${q.id}\nText: ${q.question}\nGold slugs: ${q.answer_slugs.join(", ")}`);

// ── Load corpus ────────────────────────────────────────────────────────────

function walkJson(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walkJson(p));
    else if (f.endsWith(".json") && !f.startsWith("_") && f !== "test-queries.json" && f !== "questions.json") out.push(p);
  }
  return out;
}

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9/_-]/g, "-"); }

log("Loading corpus", `Dir: ${CORPUS_DIR}`);
const files = walkJson(CORPUS_DIR).filter(f => !f.includes("/embed-cache/") && !f.includes("analyst-estimates"));
const corpus: Array<{ slug: string; compiled_truth: string }> = [];
for (const f of files) {
  try {
    const p = JSON.parse(readFileSync(f, "utf8")) as any;
    if (p.slug && p.compiled_truth) corpus.push(p);
  } catch {}
}
console.log(`  Loaded ${corpus.length} pages`);

// Check gold slugs exist in corpus
for (const gs of q.answer_slugs) {
  const found = corpus.find(p => slugify(p.slug) === gs.toLowerCase());
  console.log(`  Gold slug "${gs}": ${found ? "✓ FOUND in corpus" : "✗ NOT FOUND in corpus"}`);
}

// ── Configure embedding gateway ────────────────────────────────────────────

const litellmBaseUrl = process.env.LITELLM_BASE_URL ?? "http://localhost:4000";
const embeddingModel = "litellm:gemini-embedding-001";
const embeddingDims  = 1536;
const modelId        = "gemini-embedding-001";

log("Configuring embeddings", `Model: ${embeddingModel} @ ${embeddingDims}d\nProxy: ${litellmBaseUrl}`);

// isAvailable('embedding') workaround — see financebrain.ts for explanation
const gatewayEmbeddingModel = embeddingModel.replace(/^litellm:/, 'google:');
configureGateway({
  embedding_model:      gatewayEmbeddingModel,
  embedding_dimensions: embeddingDims,
  base_urls: { litellm: litellmBaseUrl },
  env: {
    ...process.env,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? 'local-litellm-proxy',
  },
});

const cache = new EmbeddingCache(
  join(CACHE_DIR, `embed-cache-${embeddingModel.replace(/[^a-z0-9@-]/gi, "_")}@${embeddingDims}.sqlite`),
  `${embeddingModel}@${embeddingDims}`,
);

const litellmApiKey = process.env.LITELLM_API_KEY;
const realTransport = async (params: { values: string[] } & Record<string, unknown>) => {
  console.log(`  [embed] calling proxy for ${params.values.length} text(s), first 80 chars: "${params.values[0]?.slice(0, 80)}"`);
  const res = await fetch(`${litellmBaseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(litellmApiKey ? { Authorization: `Bearer ${litellmApiKey}` } : {}),
    },
    body: JSON.stringify({ model: modelId, input: params.values, dimensions: embeddingDims }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LiteLLM ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  console.log(`  [embed] got ${data.data.length} embedding(s), dims: ${data.data[0]?.embedding?.length}`);
  return { embeddings: data.data.map((d: any) => d.embedding) };
};

__setEmbedTransportForTests(makeCachingTransport(realTransport, cache));
console.log("  Embedding transport set");

// ── Test embedding proxy directly ──────────────────────────────────────────

log("Testing embedding proxy with question text");
try {
  const testEmb = await embed(q.question);
  console.log(`  ✓ Embedding succeeded: ${testEmb.length} dims`);
} catch (e: any) {
  console.error(`  ✗ Embedding FAILED: ${e.message}`);
  process.exit(1);
}

// ── Test query expansion ───────────────────────────────────────────────────

log("Testing query expansion (Claude Haiku)");
const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicKey) {
  console.error("  ✗ ANTHROPIC_API_KEY not set — expansion will fail");
} else {
  console.log(`  ANTHROPIC_API_KEY set (length ${anthropicKey.length})`);
  try {
    const expanded = await expandQuery(q.question);
    console.log(`  ✓ Expansion succeeded. Expansions:`);
    if (Array.isArray(expanded)) {
      expanded.forEach((e: string, i: number) => console.log(`    [${i}] ${e}`));
    } else {
      console.log("  Result:", expanded);
    }
  } catch (e: any) {
    console.error(`  ✗ Expansion FAILED: ${e.message}`);
  }
}

// ── Index corpus ───────────────────────────────────────────────────────────

log("Indexing corpus into PGLite (keyword + vector)");
const engine = new PGLiteEngine();
await engine.connect({});
await engine.initSchema();

let indexed = 0;
for (const page of corpus) {
  const slug = slugify(page.slug);
  await importFromContent(engine, slug, page.compiled_truth, { noEmbed: false });
  indexed++;
  if (indexed % 200 === 0) process.stdout.write(`  ${indexed}/${corpus.length}...\r`);
}
console.log(`  Indexed ${indexed} pages`);

// ── Keyword search ─────────────────────────────────────────────────────────

log("Keyword search", `Query: "${q.question}"`);
const kwResults = await engine.searchKeyword(q.question, { limit: TOP_K });
console.log(`  Results (${kwResults.length}):`);
if (kwResults.length === 0) {
  console.log("  ✗ NO keyword results");
} else {
  kwResults.forEach((r: any, i: number) => console.log(`    [${i+1}] ${r.slug} (score: ${r.score?.toFixed(4)})`));
}

// ── Vector search ──────────────────────────────────────────────────────────

log("Vector search", `Query: "${q.question}"`);
try {
  const qEmb = await embed(q.question);
  console.log(`  Query embedding: ${qEmb.length} dims`);
  const vecResults = await engine.searchVector(qEmb, { limit: TOP_K });
  console.log(`  Results (${vecResults.length}):`);
  if (vecResults.length === 0) {
    console.log("  ✗ NO vector results — are chunks embedded? Check importFromContent ran with noEmbed:false");
  } else {
    vecResults.forEach((r: any, i: number) => console.log(`    [${i+1}] ${r.slug} (score: ${r.score?.toFixed(4)})`));
  }
} catch (e: any) {
  console.error(`  ✗ Vector search FAILED: ${e.message}`);
}

// ── Check isAvailable('embedding') ────────────────────────────────────────

log("Checking gateway isAvailable('embedding')");
const { isAvailable } = await import("../../node_modules/gbrain/src/core/ai/gateway.ts");
console.log(`  isAvailable('embedding'): ${isAvailable('embedding')}`);
console.log(`  (if false, hybridSearch silently falls back to keyword-only → 0 results)`);

// ── Hybrid search (no expansion) ──────────────────────────────────────────

log("Hybrid search (RRF, no expansion)", `Query: "${q.question}"`);
try {
  let metaLog: any = null;
  const hybridNoExp = await hybridSearch(engine, q.question, {
    limit: TOP_K,
    expansion: false,
    onMeta: (meta: any) => { metaLog = meta; },
  });
  console.log(`  onMeta: ${JSON.stringify(metaLog)}`);
  console.log(`  Results (${hybridNoExp.length}):`);
  hybridNoExp.forEach((r: any, i: number) => console.log(`    [${i+1}] ${r.slug} (score: ${r.score?.toFixed(4)})`));
} catch (e: any) {
  console.error(`  ✗ Hybrid (no exp) FAILED: ${e.message}`);
}

// ── Hybrid+expansion search ────────────────────────────────────────────────

log("Hybrid+expansion search", `Query: "${q.question}"`);
try {
  const hybridExp = await hybridSearch(engine, q.question, {
    limit: TOP_K,
    expansion: true,
    expandFn: expandQuery,
  });
  console.log(`  Results (${hybridExp.length}):`);
  if (hybridExp.length === 0) {
    console.log("  ✗ NO results from hybrid+expansion");
  } else {
    hybridExp.forEach((r: any, i: number) => console.log(`    [${i+1}] ${r.slug} (score: ${r.score?.toFixed(4)})`));
  }
} catch (e: any) {
  console.error(`  ✗ Hybrid+expansion FAILED: ${e.message}`);
}

// ── Scoring ────────────────────────────────────────────────────────────────

log("Summary");
const gold = q.answer_slugs.map(s => s.toLowerCase());
console.log(`  Gold slugs: ${gold.join(", ")}`);
const kwRetrieved = kwResults.map((r: any) => r.slug?.toLowerCase() ?? "");
for (const g of gold) {
  console.log(`  "${g}" in keyword results? ${kwRetrieved.includes(g) ? "✓ YES" : "✗ NO"}`);
}

await engine.disconnect();
console.log("\n✓ Debug complete");
