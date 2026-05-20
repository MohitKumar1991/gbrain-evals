#!/usr/bin/env bun
/**
 * FinanceBrain question bank builder — local web UI
 *
 * Serves a browser UI at http://localhost:3456 for adding questions to
 * eval/data/financebrain-v1/questions.json.
 *
 * Usage:
 *   bun eval/runner/questions-ui.ts
 *   bun eval/runner/questions-ui.ts --port=3457
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { PGLiteEngine } from "gbrain/pglite-engine";
import { importFromContent } from "gbrain/import-file";
import { hybridSearch } from "gbrain/search/hybrid";
import { expandQuery } from "gbrain/search/expansion";
import {
  configureGateway,
  __setEmbedTransportForTests,
} from "../../node_modules/gbrain/src/core/ai/gateway.ts";
import { embed } from "../../node_modules/gbrain/src/core/embedding.ts";
import { EmbeddingCache, makeCachingTransport } from "./longmemeval-cache.ts";

const DATA_DIR = join(import.meta.dirname, "../data/financebrain-v1");
const QUESTIONS_FILE = join(DATA_DIR, "questions.json");
const HTML_FILE = join(import.meta.dirname, "questions-ui.html");
const PORT = Number(process.argv.find(a => a.startsWith("--port="))?.split("=")[1] ?? 3456);

type PageMeta = { slug: string; title: string; published_at: string; preview: string };
type SearchDoc = PageMeta & { searchText: string };
type Question = {
  id: string;
  category: string;
  question: string;
  answer: string;
  answer_slugs: string[];
  answer_slug_pattern?: string;
  notes?: string;
  validated?: boolean;
  ai_reviewed?: boolean;
  human_reviewed?: boolean;
};
type QFile = { description: string; queries: Question[] };

// ---------------------------------------------------------------------------
// Data loading helpers
// ---------------------------------------------------------------------------

function loadPageMeta(filePath: string): PageMeta | null {
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const slug = ((raw.slug as string) || "").toLowerCase();
    if (!slug) return null;
    const fullText = (raw.compiled_truth as string) || "";
    return {
      slug,
      title: (raw.title as string) || "",
      published_at: (raw.published_at as string) || "",
      preview: fullText.slice(0, 500),
    };
  } catch {
    return null;
  }
}

function loadDir(subdir: string, filterFn?: (f: string) => boolean): PageMeta[] {
  const dir = join(DATA_DIR, subdir);
  try {
    const files = readdirSync(dir).filter(f => f.endsWith(".json") && (!filterFn || filterFn(f)));
    return files
      .map(f => loadPageMeta(join(dir, f)))
      .filter((m): m is PageMeta => m !== null)
      .sort((a, b) => b.published_at.localeCompare(a.published_at));
  } catch {
    return [];
  }
}

function loadSecDir(prefix: string): PageMeta[] {
  const secDir = join(DATA_DIR, "sec");
  const results: PageMeta[] = [];
  try {
    for (const ticker of readdirSync(secDir)) {
      const tickerDir = join(secDir, ticker);
      try {
        for (const file of readdirSync(tickerDir)) {
          if (file.startsWith(prefix) && file.endsWith(".json")) {
            const meta = loadPageMeta(join(tickerDir, file));
            if (meta) results.push(meta);
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return results.sort((a, b) => b.published_at.localeCompare(a.published_at));
}

function countDir(subdir: string, filterFn?: (f: string) => boolean): number {
  try {
    return readdirSync(join(DATA_DIR, subdir))
      .filter(f => f.endsWith(".json") && (!filterFn || filterFn(f))).length;
  } catch { return 0; }
}

function countSecDir(prefix: string): number {
  let n = 0;
  try {
    for (const ticker of readdirSync(join(DATA_DIR, "sec"))) {
      try {
        n += readdirSync(join(DATA_DIR, "sec", ticker))
          .filter(f => f.startsWith(prefix) && f.endsWith(".json")).length;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return n;
}

function allCorpusDocs(): PageMeta[] {
  const all: PageMeta[] = [
    ...loadDir("financials"),
    ...loadDir("transcripts"),
    ...loadDir("price"),
    ...loadDir("social/dylan522p", f => f !== "_index.json"),
    ...loadDir("substack"),
    ...loadDir("portfolio", f => f !== "latest.json"),
    ...loadSecDir("8-k"),
    ...loadSecDir("10-k"),
    ...loadSecDir("10-q"),
  ];
  return all.sort((a, b) => b.published_at.localeCompare(a.published_at));
}

function pagesForCategory(category: string): PageMeta[] {
  switch (category) {
    case "financials":        return loadDir("financials");
    case "transcript":        return loadDir("transcripts");
    case "sec":               return [
                                ...loadSecDir("8-k"),
                                ...loadSecDir("10-k"),
                                ...loadSecDir("10-q"),
                              ].sort((a, b) => b.published_at.localeCompare(a.published_at));
    case "news":              return [
                                ...loadDir("social/dylan522p", f => f !== "_index.json"),
                                ...loadDir("substack"),
                              ].sort((a, b) => b.published_at.localeCompare(a.published_at));
    case "portfolio":         return loadDir("portfolio", f => f !== "latest.json");
    // These categories span multiple source types — show full corpus for slug browsing
    case "product":
    case "supply-chain":
    case "time-series":
    case "market-reactions":  return allCorpusDocs();
    default:                  return [];
  }
}

function totalForCategory(category: string): number {
  switch (category) {
    case "financials":   return countDir("financials");
    case "transcript":   return countDir("transcripts");
    case "sec":          return countSecDir("8-k") + countSecDir("10-k") + countSecDir("10-q");
    case "news":         return countDir("social/dylan522p", f => f !== "_index.json") + countDir("substack");
    case "portfolio":    return countDir("portfolio", f => f !== "latest.json");
    case "product":
    case "supply-chain":
    case "time-series":
    case "market-reactions":
      return countDir("financials") +
        countDir("transcripts") +
        countDir("price") +
        countDir("social/dylan522p", f => f !== "_index.json") +
        countDir("substack") +
        countDir("portfolio", f => f !== "latest.json") +
        countSecDir("8-k") + countSecDir("10-k") + countSecDir("10-q");
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// Full-corpus search index (lazy, built on first search request)
// ---------------------------------------------------------------------------

let searchIndex: SearchDoc[] | null = null;

function buildSearchIndex(): SearchDoc[] {
  if (searchIndex) return searchIndex;
  const docs: SearchDoc[] = [];
  function indexDir(subdir: string, filterFn?: (f: string) => boolean) {
    const dir = join(DATA_DIR, subdir);
    try {
      const files = readdirSync(dir).filter(f => f.endsWith(".json") && (!filterFn || filterFn(f)));
      for (const f of files) {
        try {
          const raw = JSON.parse(readFileSync(join(dir, f), "utf8")) as Record<string, unknown>;
          const slug = ((raw.slug as string) || "").toLowerCase();
          if (!slug) continue;
          const full = (raw.compiled_truth as string) || "";
          docs.push({
            slug,
            title: (raw.title as string) || "",
            published_at: (raw.published_at as string) || "",
            preview: full.slice(0, 500),
            searchText: full.toLowerCase(),
          });
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  function indexSecDir(prefix: string) {
    const secDir = join(DATA_DIR, "sec");
    try {
      for (const ticker of readdirSync(secDir)) {
        const tickerDir = join(secDir, ticker);
        try {
          for (const file of readdirSync(tickerDir)) {
            if (!file.startsWith(prefix) || !file.endsWith(".json")) continue;
            try {
              const raw = JSON.parse(readFileSync(join(tickerDir, file), "utf8")) as Record<string, unknown>;
              const slug = ((raw.slug as string) || "").toLowerCase();
              if (!slug) continue;
              const full = (raw.compiled_truth as string) || "";
              docs.push({
                slug,
                title: (raw.title as string) || "",
                published_at: (raw.published_at as string) || "",
                preview: full.slice(0, 500),
                searchText: full.toLowerCase(),
              });
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  indexDir("financials");
  indexDir("transcripts");
  indexDir("price");
  indexDir("social/dylan522p", f => f !== "_index.json");
  indexDir("substack");
  indexDir("portfolio", f => f !== "latest.json");
  indexSecDir("8-k");
  indexSecDir("10-k");
  indexSecDir("10-q");
  searchIndex = docs;
  return docs;
}

function searchCorpus(query: string, limit = 30): Array<{ slug: string; title: string; ctx: string; preview: string }> {
  const docs = buildSearchIndex();
  const lq = query.toLowerCase();
  const results = [];
  for (const doc of docs) {
    const idx = doc.searchText.indexOf(lq);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 60);
    const end = Math.min(doc.searchText.length, idx + query.length + 60);
    const ctx = "…" + doc.searchText.slice(start, end).replace(/\n/g, " ") + "…";
    results.push({ slug: doc.slug, title: doc.title, ctx, preview: doc.preview });
    if (results.length >= limit) break;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Questions file helpers
// ---------------------------------------------------------------------------

function loadQFile(): QFile {
  if (!existsSync(QUESTIONS_FILE)) {
    return {
      description: "FinanceBrain v1 question bank — 9 source types × ~15 questions = ~135 total",
      queries: [],
    };
  }
  return JSON.parse(readFileSync(QUESTIONS_FILE, "utf8")) as QFile;
}

function saveQFile(data: QFile): void {
  writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2) + "\n");
}

function nextId(category: string, queries: Question[]): string {
  const n = queries.filter(q => q.category === category).length + 1;
  return `${category}-${String(n).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Warm keyword engine — indexed once on startup, reused for all Score requests
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9/_-]/g, "-");
}

function walkCorpusJson(dir: string): string[] {
  const results: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) results.push(...walkCorpusJson(p));
    else if (f.endsWith(".json") && !f.startsWith("_") && f !== "test-queries.json" && f !== "questions.json" && !f.endsWith("QuestionRules.md")) results.push(p);
  }
  return results;
}

// Temporal helpers — mirrors financebrain.ts
function toQuarter(isoDate: string): string {
  const month = parseInt(isoDate.slice(5, 7), 10);
  return `${isoDate.slice(0, 4)}-Q${Math.ceil(month / 3)}`;
}

function scoreTemporalMetrics(
  retrieved: string[],
  goldSlugs: string[],
  slugDateMap: Map<string, string>,
  K: number,
) {
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

// Scoring (mirrors financebrain.ts scoreQuery)
function scoreQuery(
  retrieved: string[], answerSlugs: string[], patternSlug: string | undefined, K: number,
) {
  const isPattern = answerSlugs.length === 0 && !!patternSlug;
  const gold = answerSlugs.length > 0
    ? answerSlugs.map(s => s.toLowerCase())
    : patternSlug ? [patternSlug.toLowerCase()] : [];
  const R = gold.length;
  if (R === 0) return { hit: false, recall: 0, mrr: 0, precision: 0, r_precision: 0, ap: 0, first_hit_rank: null, matched_count: 0, total_gold: 0 };
  const goldRemaining = new Set(gold);
  let runningHits = 0, rPrecisionHits = 0, apSum = 0, firstHitRank: number | null = null;
  for (let i = 0; i < Math.min(retrieved.length, K); i++) {
    const r = retrieved[i];
    let matchedGold: string | null = null;
    for (const g of goldRemaining) {
      if (isPattern ? r.includes(g) : r === g) { matchedGold = g; break; }
    }
    if (matchedGold !== null) {
      goldRemaining.delete(matchedGold);
      runningHits++;
      if (i < R) rPrecisionHits++;
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

type WarmEngineState =
  | { status: "idle" }
  | { status: "indexing"; indexed: number; total: number }
  | { status: "ready"; engine: PGLiteEngine; total: number }
  | { status: "error"; message: string };

let warmState: WarmEngineState = { status: "idle" };
let warmEngineHasEmbedding = false;  // true when proxy was available at startup
const slugDateMap = new Map<string, string>();  // slug → published_at, for temporal scoring

async function initWarmEngine(): Promise<void> {
  if (warmState.status === "ready" || warmState.status === "indexing") return;

  const litellmBaseUrl = process.env.LITELLM_BASE_URL;
  const hasProxy = !!litellmBaseUrl;

  // Wire embedding transport when proxy is available.
  // Uses the same SQLite cache and isAvailable() workaround as financebrain.ts.
  if (hasProxy) {
    const embeddingModel = "litellm:gemini-embedding-001";
    const embeddingDims  = 1536;
    const modelId        = "gemini-embedding-001";
    // google: prefix so isAvailable('embedding') returns true (litellm recipe has models:[])
    configureGateway({
      embedding_model:      embeddingModel.replace(/^litellm:/, "google:"),
      embedding_dimensions: embeddingDims,
      base_urls:            { litellm: litellmBaseUrl },
      env: {
        ...process.env,
        GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "local-litellm-proxy",
      },
    });
    const cacheKey  = `${embeddingModel}@${embeddingDims}`;
    const cachePath = join(DATA_DIR, "embed-cache",
      `embed-cache-${cacheKey.replace(/[^a-z0-9@-]/gi, "_")}.sqlite`);
    const cache = new EmbeddingCache(cachePath, cacheKey);
    const litellmApiKey = process.env.LITELLM_API_KEY;
    const realTransport = async (params: { values: string[] } & Record<string, unknown>) => {
      const res = await fetch(`${litellmBaseUrl}/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(litellmApiKey ? { Authorization: `Bearer ${litellmApiKey}` } : {}) },
        body: JSON.stringify({ model: modelId, input: params.values, dimensions: embeddingDims }),
      });
      if (!res.ok) throw new Error(`LiteLLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json() as { data: Array<{ embedding: number[] }> };
      return { embeddings: data.data.map((d: any) => d.embedding) };
    };
    __setEmbedTransportForTests(makeCachingTransport(realTransport, cache));
    warmEngineHasEmbedding = true;
    console.log(`Embedding: ${embeddingModel} (${embeddingDims}d) via ${litellmBaseUrl} — warm cache: ${cachePath}`);
  }

  const files = walkCorpusJson(DATA_DIR).filter(
    f => !f.includes("/embed-cache/") && !f.includes("analyst-estimates") && !f.endsWith("questions.json")
  );
  warmState = { status: "indexing", indexed: 0, total: files.length };
  try {
    const engine = new PGLiteEngine();
    await engine.connect({});
    await engine.initSchema();
    let indexed = 0;
    for (const f of files) {
      try {
        const page = JSON.parse(readFileSync(f, "utf8")) as { slug?: string; compiled_truth?: string; published_at?: string };
        if (page.slug && page.compiled_truth) {
          await importFromContent(engine, slugify(page.slug), page.compiled_truth, { noEmbed: !hasProxy });
          if (page.published_at) slugDateMap.set(slugify(page.slug), page.published_at);
        }
      } catch { /* skip malformed */ }
      indexed++;
      if (indexed % 200 === 0) warmState = { status: "indexing", indexed, total: files.length };
    }
    warmState = { status: "ready", engine, total: files.length };
    console.log(`Engine ready — ${files.length} pages indexed (embedding: ${warmEngineHasEmbedding})`);
  } catch (e: any) {
    warmState = { status: "error", message: e.message };
    console.error("Warm engine failed:", e.message);
  }
}

const CATEGORIES = [
  "financials", "transcript", "sec", "news", "product",
  "supply-chain", "portfolio", "time-series", "market-reactions",
];

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const server = Bun.serve({
  port: PORT,
  idleTimeout: 0,  // eval endpoint spawns financebrain.ts (~30s); disable Bun's 10s default
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // UI — reload HTML from disk on each request so edits take effect on refresh
    if (method === "GET" && (path === "/" || path === "/index.html")) {
      const html = readFileSync(HTML_FILE, "utf8");
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // GET /api/state
    if (method === "GET" && path === "/api/state") {
      const qfile = loadQFile();
      const categories = CATEGORIES.map(name => ({
        name,
        total_slugs: totalForCategory(name),
        question_count: qfile.queries.filter(q => q.category === name).length,
        human_reviewed_count: qfile.queries.filter(q => q.category === name && q.human_reviewed).length,
        ai_reviewed_count: qfile.queries.filter(q => q.category === name && q.ai_reviewed).length,
      }));
      return json({ categories, questions: qfile.queries, savePath: QUESTIONS_FILE });
    }

    // GET /api/pages?category=X
    if (method === "GET" && path === "/api/pages") {
      const cat = url.searchParams.get("category") ?? "";
      return json(pagesForCategory(cat));
    }

    // GET /api/questions?category=X
    if (method === "GET" && path === "/api/questions") {
      const cat = url.searchParams.get("category") ?? "";
      const qfile = loadQFile();
      return json(qfile.queries.filter(q => q.category === cat));
    }

    // GET /api/search?q=text
    if (method === "GET" && path === "/api/search") {
      const q = url.searchParams.get("q") ?? "";
      if (q.length < 3) return json([]);
      // Build index on first call (may take a second)
      const results = searchCorpus(q, 30);
      return json(results);
    }

    // POST /api/questions
    if (method === "POST" && path === "/api/questions") {
      const body = await req.json() as Partial<Question>;
      if (!body.category || !body.question) {
        return json({ error: "category and question required" }, 400);
      }
      const qfile = loadQFile();
      const id = nextId(body.category, qfile.queries);
      const newQ: Question = {
        id,
        category: body.category,
        question: body.question,
        answer: body.answer ?? "",
        answer_slugs: body.answer_slugs ?? [],
        ...(body.answer_slug_pattern ? { answer_slug_pattern: body.answer_slug_pattern } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        ...(body.validated !== undefined ? { validated: body.validated } : {}),
        ai_reviewed: false,
        human_reviewed: false,
      };
      qfile.queries.push(newQ);
      saveQFile(qfile);
      return json({
        id,
        questions: qfile.queries.filter(q => q.category === body.category),
        allQuestions: qfile.queries,
      });
    }

    // PUT /api/questions/:id
    const questionsIdMatch = path.match(/^\/api\/questions\/(.+)$/);
    if (method === "PUT" && questionsIdMatch) {
      const id = decodeURIComponent(questionsIdMatch[1]);
      const body = await req.json() as Partial<Question>;
      const qfile = loadQFile();
      const idx = qfile.queries.findIndex(q => q.id === id);
      if (idx === -1) return json({ error: "not found" }, 404);
      const q = qfile.queries[idx];
      if (body.question !== undefined) { q.question = body.question; q.human_reviewed = false; }
      if (body.answer !== undefined) { q.answer = body.answer; q.human_reviewed = false; }
      if (body.answer_slugs !== undefined) q.answer_slugs = body.answer_slugs;
      if (body.answer_slug_pattern !== undefined) q.answer_slug_pattern = body.answer_slug_pattern;
      if (body.notes !== undefined) q.notes = body.notes;
      if (body.validated !== undefined) q.validated = body.validated;
      if (body.ai_reviewed !== undefined) q.ai_reviewed = body.ai_reviewed;
      if (body.human_reviewed !== undefined) q.human_reviewed = body.human_reviewed;
      saveQFile(qfile);
      const cat = q.category;
      return json({
        question: q,
        questions: qfile.queries.filter(x => x.category === cat),
        allQuestions: qfile.queries,
      });
    }

    // DELETE /api/questions/:id
    if (method === "DELETE" && questionsIdMatch) {
      const id = decodeURIComponent(questionsIdMatch[1]);
      const qfile = loadQFile();
      const before = qfile.queries.length;
      const deleted = qfile.queries.find(q => q.id === id);
      qfile.queries = qfile.queries.filter(q => q.id !== id);
      if (qfile.queries.length === before) return json({ error: "not found" }, 404);
      saveQFile(qfile);
      const cat = deleted?.category ?? CATEGORIES.find(c => id.startsWith(c + "-")) ?? "";
      return json({
        questions: qfile.queries.filter(q => q.category === cat),
        allQuestions: qfile.queries,
      });
    }

    // GET /api/scores — latest report, processed into per-question score grid
    if (method === "GET" && path === "/api/scores") {
      const projectRoot = join(import.meta.dirname, "../..");
      const reportsDir = join(projectRoot, "eval/reports/financebrain");
      let latestFile: string | null = null;
      try {
        const files = readdirSync(reportsDir).filter(f => f.endsWith(".json")).sort();
        if (files.length > 0) latestFile = files[files.length - 1];
      } catch { /* dir doesn't exist */ }

      if (!latestFile) return json({ error: "no report found", questions: [], adapters: [], summary: [] });

      type ReportRow = {
        query_id: string; category: string; question: string; adapter: string;
        retrieved_slugs: string[]; answer_slugs: string[];
        hit: boolean; recall: number; mrr: number; precision: number; ap: number;
        first_hit_rank: number | null; matched_count: number; total_gold: number; latency_ms: number;
      };
      const report = JSON.parse(readFileSync(join(reportsDir, latestFile), "utf8")) as {
        run_at: string; adapters: string[]; top_k: number; results: ReportRow[]; summary: unknown[];
      };

      const qMap = new Map<string, { id: string; category: string; question: string; answer_slugs: string[]; scores: Record<string, unknown> }>();
      for (const r of report.results) {
        if (!qMap.has(r.query_id)) {
          qMap.set(r.query_id, { id: r.query_id, category: r.category, question: r.question, answer_slugs: r.answer_slugs, scores: {} });
        }
        qMap.get(r.query_id)!.scores[r.adapter] = {
          hit: r.hit, recall: r.recall ?? 0, mrr: r.mrr ?? 0,
          precision: r.precision ?? 0, ap: r.ap ?? 0,
          first_hit_rank: r.first_hit_rank ?? null,
          matched_count: r.matched_count ?? 0, total_gold: r.total_gold ?? r.answer_slugs?.length ?? 0,
          retrieved: r.retrieved_slugs ?? [], latency_ms: r.latency_ms,
        };
      }

      return json({
        report_path: latestFile, run_at: report.run_at, top_k: report.top_k,
        adapters: report.adapters ?? [],
        questions: Array.from(qMap.values()),
        summary: report.summary ?? [],
      });
    }

    // GET /api/eval/status — warm engine indexing progress
    if (method === "GET" && path === "/api/eval/status") {
      return json(warmState.status === "ready"
        ? { status: "ready", total: warmState.total }
        : warmState.status === "indexing"
          ? { status: "indexing", indexed: warmState.indexed, total: warmState.total }
          : warmState);
    }

    // GET /api/eval/:id — score using warm in-process engine (all adapters if embedding available)
    const evalMatch = path.match(/^\/api\/eval\/(.+)$/);
    if (method === "GET" && evalMatch) {
      const id = decodeURIComponent(evalMatch[1]);
      const qfile = loadQFile();
      const q = qfile.queries.find(x => x.id === id);
      if (!q) return json({ error: "not found" }, 404);

      if (warmState.status === "indexing") {
        return json({ id, indexing: true, indexed: warmState.indexed, total: warmState.total });
      }
      if (warmState.status !== "ready") {
        return json({ id, error: "engine not ready: " + (warmState.status === "error" ? warmState.message : warmState.status) }, 503);
      }

      const TOP_K = 5;
      const engine = warmState.engine;
      const byAdapter: Record<string, unknown> = {};
      const adaptersRun: string[] = [];

      // Helper: score and package one adapter result (includes temporal metrics when q.temporal)
      const runAdapter = async (adapterName: string, searchFn: () => Promise<any[]>) => {
        const t0 = Date.now();
        const results = await searchFn();
        const retrieved = results.map((r: any) => r.slug?.toLowerCase() ?? "");
        const score = scoreQuery(retrieved, q.answer_slugs, q.answer_slug_pattern, TOP_K);
        const temporal = (q as any).temporal
          ? scoreTemporalMetrics(retrieved, q.answer_slugs, slugDateMap, TOP_K)
          : { temporal_recall: null, temporal_precision: null, gold_quarters: null, covered_quarters: null };
        byAdapter[adapterName] = { ...score, ...temporal, retrieved, latency_ms: Date.now() - t0 };
        adaptersRun.push(adapterName);
      };

      // Keyword — always
      await runAdapter("keyword", () => engine.searchKeyword(q.question, { limit: TOP_K }));

      // Vector + hybrid — only when warm engine has embeddings
      if (warmEngineHasEmbedding) {
        await runAdapter("vector", async () => {
          const qEmb = await embed(q.question);
          return engine.searchVector(qEmb, { limit: TOP_K });
        });
        await runAdapter("hybrid", () =>
          hybridSearch(engine, q.question, { limit: TOP_K, expansion: false })
        );
        if (process.env.ANTHROPIC_API_KEY) {
          await runAdapter("hybrid+expansion", () =>
            hybridSearch(engine, q.question, { limit: TOP_K, expansion: true, expandFn: expandQuery })
          );
        }
      }

      const kw = byAdapter["keyword"] as { hit: boolean; retrieved: string[] };
      return json({
        id, hit: kw?.hit ?? null, retrieved: kw?.retrieved ?? [],
        adapters_run: adaptersRun, by_adapter: byAdapter, top_k: TOP_K,
      });
    }

    return json({ error: "not found" }, 404);
  },
});

console.log(`FinanceBrain Question Builder → http://localhost:${server.port}`);
console.log(`Saving to: ${QUESTIONS_FILE}`);
const hasProxy = !!process.env.LITELLM_BASE_URL;
console.log(`Indexing corpus${hasProxy ? " + embeddings (warm cache)" : ""} (~${hasProxy ? "60–90" : "30"}s)…`);

// Index in background immediately — by the time user opens browser it's likely ready
initWarmEngine();
