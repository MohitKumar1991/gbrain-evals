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

function pagesForCategory(category: string): PageMeta[] {
  switch (category) {
    case "financials": return loadDir("financials");
    case "transcript": return loadDir("transcripts");
    case "price":      return loadDir("price");
    case "social":     return loadDir("social/dylan522p", f => f !== "_index.json");
    case "substack":   return loadDir("substack");
    case "portfolio":  return loadDir("portfolio", f => f !== "latest.json");
    case "sec-8k":     return loadSecDir("8-k");
    case "sec-10k":    return loadSecDir("10-k");
    case "sec-10q":    return loadSecDir("10-q");
    case "cross": {
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
    default:           return [];
  }
}

function totalForCategory(category: string): number {
  switch (category) {
    case "financials": return countDir("financials");
    case "transcript": return countDir("transcripts");
    case "price":      return countDir("price");
    case "social":     return countDir("social/dylan522p", f => f !== "_index.json");
    case "substack":   return countDir("substack");
    case "portfolio":  return countDir("portfolio", f => f !== "latest.json");
    case "sec-8k":     return countSecDir("8-k");
    case "sec-10k":    return countSecDir("10-k");
    case "sec-10q":    return countSecDir("10-q");
    case "cross":
      return countDir("financials") +
        countDir("transcripts") +
        countDir("price") +
        countDir("social/dylan522p", f => f !== "_index.json") +
        countDir("substack") +
        countDir("portfolio", f => f !== "latest.json") +
        countSecDir("8-k") +
        countSecDir("10-k") +
        countSecDir("10-q");
    default:           return 0;
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

const CATEGORIES = [
  "financials", "transcript", "price", "social", "substack",
  "portfolio", "sec-8k", "sec-10k", "sec-10q", "cross",
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
      if (body.question !== undefined) q.question = body.question;
      if (body.answer !== undefined) q.answer = body.answer;
      if (body.answer_slugs !== undefined) q.answer_slugs = body.answer_slugs;
      if (body.answer_slug_pattern !== undefined) q.answer_slug_pattern = body.answer_slug_pattern;
      if (body.notes !== undefined) q.notes = body.notes;
      if (body.validated !== undefined) q.validated = body.validated;
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

    // GET /api/eval/:id — single-question eval (all adapters if proxy running, else keyword only)
    const evalMatch = path.match(/^\/api\/eval\/(.+)$/);
    if (method === "GET" && evalMatch) {
      const id = decodeURIComponent(evalMatch[1]);
      const qfile = loadQFile();
      const q = qfile.queries.find(x => x.id === id);
      if (!q) return json({ error: "not found" }, 404);

      const projectRoot = join(import.meta.dirname, "../..");
      const reportsDir = join(projectRoot, "eval/reports/financebrain");

      let beforeFiles = new Set<string>();
      try { beforeFiles = new Set(readdirSync(reportsDir)); } catch { /* dir may not exist yet */ }

      // Run all adapters if LITELLM_BASE_URL is set, keyword-only otherwise.
      const hasProxy = !!process.env.LITELLM_BASE_URL;
      const adaptersArg = hasProxy ? "keyword,vector,hybrid,hybrid+expansion" : "keyword";

      const proc = Bun.spawn(
        ["bun", "eval/runner/financebrain.ts",
          "--queries", QUESTIONS_FILE,
          "--adapters", adaptersArg,
          "--question-id", id,
          "--top-k", "5"],
        { cwd: projectRoot, stdout: "pipe", stderr: "pipe" },
      );
      await proc.exited;

      type ReportRow = {
        query_id: string; adapter: string; hit: boolean; recall: number; mrr: number;
        precision: number; ap: number; first_hit_rank: number | null;
        matched_count: number; total_gold: number; retrieved_slugs: string[]; latency_ms: number;
      };
      const byAdapter: Record<string, unknown> = {};
      try {
        const newFiles = readdirSync(reportsDir).filter(f => !beforeFiles.has(f) && f.endsWith(".json"));
        if (newFiles.length > 0) {
          const report = JSON.parse(readFileSync(join(reportsDir, newFiles[newFiles.length - 1]), "utf8")) as {
            results: ReportRow[];
          };
          for (const row of report.results.filter(r => r.query_id === id)) {
            byAdapter[row.adapter] = {
              hit: row.hit, recall: row.recall ?? 0, mrr: row.mrr ?? 0,
              precision: row.precision ?? 0, ap: row.ap ?? 0,
              first_hit_rank: row.first_hit_rank ?? null,
              matched_count: row.matched_count ?? 0, total_gold: row.total_gold ?? 0,
              retrieved: row.retrieved_slugs ?? [], latency_ms: row.latency_ms,
            };
          }
        }
      } catch { /* return empty */ }

      const kw = byAdapter["keyword"] as { hit: boolean; retrieved: string[] } | undefined;
      return json({
        id, hit: kw?.hit ?? null, retrieved: kw?.retrieved ?? [],
        adapters_run: adaptersArg.split(","), by_adapter: byAdapter, top_k: 5,
      });
    }

    return json({ error: "not found" }, 404);
  },
});

console.log(`FinanceBrain Question Builder → http://localhost:${server.port}`);
console.log(`Saving to: ${QUESTIONS_FILE}`);
console.log(`(Search index builds lazily on first search — ~2s for 1,910 docs)`);
