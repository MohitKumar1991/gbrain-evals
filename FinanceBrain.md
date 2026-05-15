# FinanceBrain — Full Context Document

This document is a complete context dump for the FinanceBrain eval project.
It is written so that a parallel agent can pick up any task without reading the
conversation history. Read this file before starting any FinanceBrain work.

---

## What FinanceBrain Is

FinanceBrain is a retrieval benchmark that indexes real financial data (SEC
filings, earnings transcripts, price history, Twitter/Substack analysis,
portfolio holdings) into gbrain and measures how well each adapter retrieves
the correct document for a given question.

It lives in this repo alongside the existing LongMemEval benchmark. The eval
follows the same pattern: a static corpus is indexed once per adapter, queries
run against it, Recall@K is measured, results are committed to
`docs/benchmarks/`.

**Target companies:** NVDA (Nvidia), MSFT (Microsoft), GOOGL (Alphabet),
META (Meta Platforms), AAPL (Apple).

**Adapters tested:** keyword, vector, hybrid, hybrid+expansion (same four as
LongMemEval).

**Primary metric:** Recall@5 — does the correct page appear in the top-5
results?

---

## Repository Layout (FinanceBrain-specific files)

```
eval/
  scrapers/                    ← data download scripts
    earnings-calendar.ts       ← hardcoded earnings dates for all 5 tickers
    types.ts                   ← FinancePage schema shared by all scrapers
    substack.ts                ← ai-supremacy.com Substack scraper
    fmp.ts                     ← Financial Modeling Prep: financials, transcripts, price
    twitter.ts                 ← twitterapi.io tweet downloader
    ibkr.ts                    ← IBKR Flex Web Service portfolio downloader
    edgar.ts                   ← SEC EDGAR 10-K / 10-Q / 8-K scraper
  data/
    financebrain-v1/           ← the corpus (1,910 FinancePage JSON files)
      financials/              ← 91 pages  FMP quarterly income+balance+cashflow
      transcripts/             ← 91 pages  FMP earnings call transcripts
      price/                   ← 95 pages  FMP daily/quarterly price data
      social/dylan522p/        ← 453 pages twitterapi.io tweets (last 2 years)
      substack/                ← 876 pages ai-supremacy.com articles (2022–2026)
      portfolio/               ← 2 pages   IBKR live holdings snapshot
      sec/                     ← 302 pages SEC EDGAR filings
        NVDA/ MSFT/ GOOGL/ META/ AAPL/
      embed-cache/             ← SQLite embedding cache (warm, ~61MB)
      test-queries.json        ← 9 smoke-test queries, one per source_type
  runner/
    financebrain.ts            ← main eval runner (indexes corpus, runs queries, scores)
    longmemeval-cache.ts       ← shared embedding cache (reused by financebrain runner)
    questions-ui.ts            ← local web UI for building questions.json (http://localhost:3456)
    questions-ui.html          ← UI frontend (served by questions-ui.ts)
  litellm_config.yaml          ← LiteLLM proxy config for Vertex AI embeddings

FinanceBrain.md                ← THIS FILE

.env.example                   ← required env vars template
```

---

## Corpus — 1,910 Pages Across 9 Source Types

| source_type | Directory | Count | Description |
|-------------|-----------|-------|-------------|
| `financials` | `financials/` | 91 | FMP quarterly income statement + balance sheet + cash flow. Covers Q1 2022 – Q1 2026 for all 5 tickers. Human-readable analyst format with YoY/QoQ deltas. |
| `transcript` | `transcripts/` | 91 | FMP earnings call transcripts, full verbatim Q&A (~44K chars each). Q1 2022 – Q2 2026 for all 5 tickers. |
| `price` | `price/` | 95 | FMP price data. 90 quarterly OHLCV summary pages (one per ticker per calendar quarter) + 5 full daily history pages (1,093 trading days each, Jan 2022 – May 2026). |
| `social` | `social/dylan522p/` | 453 | Tweets from @dylan522p (Dylan Patel, SemiAnalysis), May 2024 – May 2026. Bare retweets excluded. Threads grouped by conversationId. Each page has earnings-relative temporal tags. |
| `substack` | `substack/` | 876 | Articles from ai-supremacy.com (Michael Spencer), Jan 2022 – May 2026. Full article text (~9K–50K chars). Each article tagged with which companies are mentioned and their earnings-relative context. |
| `portfolio` | `portfolio/` | 2 | IBKR live portfolio snapshot (as of 2026-05-12). 30 positions across stocks, ETFs, options. `latest.json` always points to most recent. |
| `sec-8k` | `sec/*/` | 216 | EDGAR 8-K filings (current reports). For earnings-event 8-Ks (items 2.02, 9.01), downloads the EX-99.1 press release exhibit rather than the boilerplate form. ~2K–30K chars. |
| `sec-10k` | `sec/*/` | 22 | EDGAR 10-K annual reports. Extracts: Business (Item 1), Risk Factors (Item 1A), MD&A (Item 7). ~100K–120K chars per filing. |
| `sec-10q` | `sec/*/` | 64 | EDGAR 10-Q quarterly reports. Extracts MD&A (Item 2) only. ~2K–40K chars. |

**SEC breakdown by ticker:**

| Ticker | 10-K | 10-Q | 8-K | Total |
|--------|------|------|-----|-------|
| NVDA | 5 | 12 | 41 | 58 |
| MSFT | 3 | 12 | 37 | 52 |
| GOOGL | 5 | 13 | 50 | 68 |
| META | 5 | 13 | 50 | 68 |
| AAPL | 4 | 14 | 38 | 56 |

---

## FinancePage Schema

Every file in `eval/data/financebrain-v1/` (except `_index.json` and
`test-queries.json`) is a `FinancePage`. The schema (from
`eval/scrapers/types.ts`):

```typescript
type FinancePage = {
  slug: string;               // unique doc ID, used as gbrain page slug
                              // e.g. "financials/NVDA-2024-10-27"
  type: 'article' | 'filing' | 'price-data' | 'portfolio' | 'market-data' | 'overview';
  source_type: SourceType;    // see table above
  title: string;
  author?: string;
  url: string;                // original source URL
  published_at: string;       // ISO 8601 — verified non-null for all 1,910 pages
  compiled_truth: string;     // FULL TEXT indexed into gbrain
  timeline?: string;          // optional date-indexed bullet summary
  companies_mentioned: string[]; // tickers: e.g. ['NVDA', 'MSFT']
  quarter_context: {          // per-ticker earnings-relative tags
    [ticker: string]: {
      quarter: string;        // 'Q1', 'Q2', 'Q3', 'Q4'
      fiscal_year: string;    // 'FY2025'
      earnings_date: string;  // 'YYYY-MM-DD' — actual report date
      days_relative: number;  // negative = pre-earnings, positive = post
      phase: 'pre-earnings' | 'earnings-day' | 'post-earnings';
    }
  };
  _facts: Record<string, unknown>; // raw source data; drives question generation
};
```

**Invariants verified across all 1,910 pages:**
- `published_at` is always set and valid (no pages have missing dates)
- `compiled_truth` is always ≥ 50 chars
- `slug` is always set
- Dates range from 2021 (some older FMP quarterly data) to May 2026

---

## Earnings Calendar

`eval/scrapers/earnings-calendar.ts` contains hardcoded earnings dates for all
5 tickers, 2022–2026 (future dates marked `estimated: true`). This drives the
`quarter_context` field on every page.

```
NVDA  fiscal year ends Jan 31  → Q1 FY2027 earnings: 2026-05-28 (est)
MSFT  fiscal year ends Jun 30  → Q3 FY2026 earnings: 2026-04-30 (est)
GOOGL calendar year            → Q1 FY2026 earnings: 2026-04-29 (est)
META  calendar year            → Q1 FY2026 earnings: 2026-04-30 (est)
AAPL  fiscal year ends ~Sep 30 → Q2 FY2026 earnings: 2026-05-01 (est)
```

`getQuarterContext(ticker, publishedAt)` returns the nearest earnings event
within a 90-day window.

---

## Embedding Setup — LiteLLM → Vertex AI (Google)

Embeddings use **`gemini-embedding-001` at 1536 dims** via a LiteLLM proxy
pointed at Vertex AI. No OpenAI API key needed.

**GCP config:**
- Project: `finai-adhi-dev`
- Location: `us-central1`
- Auth: gcloud application default credentials (ADC)
- Model: `gemini-embedding-001` (natively 3072 dims; locked to 1536 via
  `outputDimensionality` parameter, which LiteLLM maps from the `dimensions`
  field in the OpenAI-compatible request)

**Start the proxy before running vector/hybrid adapters:**
```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json \
VERTEXAI_PROJECT=finai-adhi-dev \
VERTEXAI_LOCATION=us-central1 \
litellm --config eval/litellm_config.yaml --port 4000
```

`eval/litellm_config.yaml` is committed to the repo. It contains:
```yaml
model_list:
  - model_name: gemini-embedding-001
    litellm_params:
      model: vertex_ai/gemini-embedding-001
      vertex_project: finai-adhi-dev
      vertex_location: us-central1

litellm_settings:
  drop_params: true   # vertex_ai rejects encoding_format=float; drop it silently
```

**How the runner wires into LiteLLM:**
gbrain's openai-compatible path calls `textEmbeddingModel(id)` without a
`dimensions` argument, so the AI SDK omits it and the proxy returns 3072 by
default. The runner works around this by bypassing the AI SDK and calling the
LiteLLM proxy directly via HTTP, injecting `dimensions: 1536` into every
embedding request.

**Embedding cache:** `eval/data/financebrain-v1/embed-cache/embed-cache-litellm_gemini-embedding-001@1536.sqlite`

Once warmed (~61MB, ~390 API calls for 7,792 chunks from 1,910 pages), vector
and hybrid adapter runs are fast and free. Commit this file to share across
machines/agents.

**Cache gotcha:** if a run fails while the proxy is misconfigured (e.g., proxy
returns 3072 dims before fix), wrong-dim vectors are written to cache. Symptom:
`Embedding dim mismatch: model gemini-embedding-001 returned 3072 but schema
expects 1536` even after fixing the proxy.
Fix: `rm eval/data/financebrain-v1/embed-cache/*.sqlite`, then re-run.

---

## Scrapers — How to Run

All scrapers read API keys from env vars. Copy `.env.example` → `.env.local`.

### Substack (ai-supremacy.com)
```bash
bun eval/scrapers/substack.ts                  # full 977 articles
bun eval/scrapers/substack.ts --limit 10       # smoke test
bun eval/scrapers/substack.ts --since 2025-01-01  # incremental
bun eval/scrapers/substack.ts --no-cache       # re-fetch all
```
Output: `eval/data/financebrain-v1/substack/<slug>.json`
No API key needed — public Substack. Rate limit: 600ms/request.

### FMP — Financials, Transcripts, Price
```bash
FMP_API_KEY=... bun eval/scrapers/fmp.ts                # all 5 tickers
FMP_API_KEY=... bun eval/scrapers/fmp.ts --ticker NVDA  # one ticker
FMP_API_KEY=... bun eval/scrapers/fmp.ts --no-cache     # re-fetch
```
Downloads per ticker:
- Quarterly income + balance + cash flow statements (limit=24)
- Earnings call transcripts Q1–Q4 for years 2022–present
- Daily price history 2022-01-01 to today + quarterly summaries

Output: `eval/data/financebrain-v1/{financials,transcripts,price}/`

### Twitter
```bash
TWITTERAPI_IO_KEY=... bun eval/scrapers/twitter.ts --handle dylan522p --years 2
TWITTERAPI_IO_KEY=... bun eval/scrapers/twitter.ts --handle dylan522p --no-cache
```
Output: `eval/data/financebrain-v1/social/<handle>/`
Note: twitterapi.io rate-limits aggressively. The scraper uses 2s between pages
+ exponential backoff on 429s. ~450 pages takes ~20–30 min.

### IBKR Portfolio
```bash
IBKR_FLEX_TOKEN=... IBKR_FLEX_QUERY_ID=... bun eval/scrapers/ibkr.ts
```
Output: `eval/data/financebrain-v1/portfolio/holdings-<date>.json` + `latest.json`
The Flex token/query are tied to the account — must be refreshed periodically.

### SEC EDGAR (no API key needed)
```bash
bun eval/scrapers/edgar.ts                                     # all 5 tickers, 2022+
bun eval/scrapers/edgar.ts --ticker NVDA --forms 8-K          # one ticker, one form
bun eval/scrapers/edgar.ts --since 2025-01-01 --no-cache      # incremental
```
Output: `eval/data/financebrain-v1/sec/<TICKER>/<form>-<date>.json`
Rate limit: 600ms between requests (EDGAR requires polite crawling + User-Agent).

For 8-Ks: fetches the filing index HTML to find the press release exhibit
(EX-99.1) rather than the boilerplate XBRL form.
For 10-Ks: extracts Business (Item 1), Risk Factors (Item 1A), MD&A (Item 7)
by scanning all occurrences to skip TOC entries (requires 1,500+ chars).

---

## Runner — How to Use

**Step 1: Start the LiteLLM proxy** (required for vector/hybrid, not keyword):
```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json \
VERTEXAI_PROJECT=finai-adhi-dev \
VERTEXAI_LOCATION=us-central1 \
litellm --config eval/litellm_config.yaml --port 4000
```

**Step 2: Run the eval:**
```bash
# Keyword only (no proxy needed, no API keys)
bun eval/runner/financebrain.ts --queries test --keyword-only --top-k 5

# Vector adapter (proxy must be running)
LITELLM_BASE_URL=http://localhost:4000 \
  bun eval/runner/financebrain.ts --queries test --adapters vector --top-k 5

# Hybrid adapter (proxy + Anthropic for expansion)
LITELLM_BASE_URL=http://localhost:4000 ANTHROPIC_API_KEY=... \
  bun eval/runner/financebrain.ts --queries test --adapters hybrid --top-k 5

# Full run: all 4 adapters against the question bank
LITELLM_BASE_URL=http://localhost:4000 ANTHROPIC_API_KEY=... \
  bun eval/runner/financebrain.ts \
  --queries eval/data/financebrain-v1/questions.json \
  --adapters keyword,vector,hybrid,hybrid+expansion \
  --top-k 5

# Other flags
--limit N           # run only first N queries (for smoke tests)
--no-cache          # re-embed, don't use SQLite cache
```

**What the runner does:**
1. Loads all 1,910 `FinancePage` JSONs from `eval/data/financebrain-v1/`
2. For each adapter: creates a fresh PGLiteEngine, indexes all pages via
   `importFromContent`, runs each query, scores Recall@K
3. For keyword: FTS via `engine.searchKeyword` (no embeddings, fast, ~26s total)
4. For vector: direct HTTP calls to LiteLLM proxy → Vertex AI, cached in SQLite
5. For hybrid: keyword + vector RRF fusion via `hybridSearch`
6. For hybrid+expansion: adds Claude Haiku query rewriting before hybrid search
7. Writes JSON report to `eval/reports/financebrain/financebrain-<timestamp>.json`

---

## Smoke Test Results

### Keyword adapter (9 queries, top-K=5) — 2026-05-13
```
substack-01    substack    ✓  NVIDIA AI infrastructure article found
financials-01  financials  ✗  FTS misses ticker vs full company name
transcript-01  transcript  ✗  Multiple transcripts rank similarly
price-01       price       ✗  CY2023-Q2 slug tokens don't FTS-stem
social-01      social      ✗  Query terms too generic for FTS
portfolio-01   portfolio   ✓  NVDA shares P&L found correctly
sec-8k-01      sec-8k      ✗  Wrong quarter (multiple "record revenue" 8-Ks)
sec-10k-01     sec-10k     ✗  0 results — risk factor terms too generic
sec-10q-01     sec-10q     ✗  Finds 8-K instead of 10-Q

Keyword Recall@5: 2/9 = 22%
```
Expected — keyword FTS requires exact term matches. Natural language queries
for financial data need vector/hybrid retrieval.

### Vector adapter (3 queries, top-K=5) — 2026-05-13
```
substack-01    substack    ✗  Broad topic, many similar articles score equally
financials-01  financials  ✓  NVDA Q3 FY2025 revenue page found correctly
transcript-01  transcript  ✗  Similar transcript from different quarter ranked higher

Vector Recall@5: 1/3 = 33%
```
First confirmed working run through LiteLLM → Vertex AI → 1536-dim embeddings.
Cache is warm at 61MB. Full 9-query vector run pending.

---

## Test Queries

`eval/data/financebrain-v1/test-queries.json` — 9 smoke-test queries, one per
source_type. Format:
```json
{
  "id": "financials-01",
  "category": "financials",
  "question": "NVIDIA Corporation NVDA Q3 revenue gross margin operating income October 2024",
  "answer_slugs": ["financials/nvda-2024-10-27"],
  "notes": "Q3 FY2025 financials (period ending 2024-10-27)"
}
```

Scoring: a query is a hit if any `answer_slugs` entry appears in the top-K
retrieved slugs (via `retrieved.some(r => r.includes(s))`). For queries with
`answer_slug_pattern` (no fixed slug), any retrieved slug matching the pattern
is a hit.

---

## Question Bank — 138 Supervised Questions (as of 2026-05-15)

`eval/data/financebrain-v1/questions.json` contains 138 human-reviewed questions
across 9 categories. Every question has verified `answer_slugs` pointing to
real corpus pages, and an exact answer drawn from source data.

| Category | Count | What it tests |
|----------|-------|---------------|
| `financials` | 20 | Income stmt, balance sheet, cash flow, segments, YoY/QoQ deltas |
| `transcript` | 20 | Earnings guidance, capex commitments, product milestones, custom chips |
| `sec` | 15 | 8-K press releases, 10-K risk factors, 10-Q MD&A — unique to SEC filings |
| `news` | 15 | Timing of announcements, KPIs from @dylan522p tweets and substack articles |
| `product` | 15 | Product specs, adoption metrics, launch details (3 questions per company) |
| `supply-chain` | 15 | Foundry dependency, HBM, CoWoS, export controls, Blackwell ramp |
| `portfolio` | 5 | Holdings composition, short book, analyst consensus vs mark prices |
| `time-series` | 20 | Multi-quarter data series + 3 product launch trajectories |
| `market-reactions` | 13 | Event-driven price moves with significance methodology |

### Market Reactions Methodology

Each market-reactions answer includes:
- Price before event (prior day close) and price on event day (or next trading day)
- Actual move %
- 30-day rolling baseline: average |daily close-to-close %| over 30 days prior
- Significance threshold: 2× the baseline average
- A move is **significant** only if it exceeds the threshold

This avoids calling normal volatility a "reaction." A 2% move on a stock that
moves ±2% every day is noise; a 17% move on the same stock is signal.

### Analyst Estimates

`eval/data/financebrain-v1/analyst-estimates/` contains FMP consensus price
targets for 14 portfolio tickers (NVDA, MSFT, AAPL, GOOGL, META, AMZN, RDDT,
WOLF, ASTS, RKLB, NOK, WYFI, PURR, KRKNF). Each file includes last-month avg
target, number of estimates, and comparison to the 2026-05-12 portfolio mark.

### Tooling Added

- **`eval/runner/questions-ui.ts`** — upgraded question builder UI at
  `http://localhost:3456`. Features: edit existing questions, validated badge,
  per-question "▶ Score" button (keyword eval), cross-source slug picker,
  progress meter (X/100 target), bulk delete.
- **`eval/runner/financebrain.ts`** — added `--question-id <id>` flag to run
  a single question for targeted scoring.
- **`eval/scrapers/price-targets.ts`** — FMP analyst price target scraper.
  Run: `FMP_API_KEY=... bun eval/scrapers/price-targets.ts`

---

## Pending Tasks

### High Priority

**1. Run full vector + hybrid eval on 138 questions**
Start the LiteLLM proxy, then:
```bash
LITELLM_BASE_URL=http://localhost:4000 ANTHROPIC_API_KEY=... \
  bun eval/runner/financebrain.ts \
  --queries eval/data/financebrain-v1/questions.json \
  --adapters keyword,vector,hybrid,hybrid+expansion \
  --top-k 5
```
Keyword smoke tests so far: financials 5%, transcript 0% (expected — natural
language vs structured/verbatim content). Vector/hybrid results pending.

**2. Build chart generator**
File to create: `eval/runner/financebrain-chart.ts`
Mirror `eval/runner/longmemeval-chart.ts`. Produce two SVGs:
- Headline bar chart: Recall@5 per adapter (horizontal bars)
- Per-category grouped bar: one bar per adapter per category

Store in `docs/benchmarks/2026-05-13-financebrain-bigtech-v1/`.

**3. Write the published benchmark report**
File: `docs/benchmarks/2026-05-13-financebrain-bigtech-v1.md`
Follow the 12-section template in `CLAUDE.md`. Fill after the full eval run.

**4. Commit warm embedding cache**
`eval/data/financebrain-v1/embed-cache/embed-cache-litellm_gemini-embedding-001@1536.sqlite`
is 61MB and gitignored. Commit it so parallel agents get the warm cache on
clone.

### Lower Priority

**5. Add more market-reactions questions**
Currently 13. Good candidates still to compute:
- NVDA Q1 FY2025 earnings + 10:1 split (May 23, 2024): +9.32% significant
- META Q3 2022 earnings crash (Oct 27, 2022): -24.56% significant
- AAPL Vision Pro no-reaction (Feb 2, 2024): -0.54% not significant

**6. Refresh data on cadence**
- Portfolio: run `ibkr.ts` for fresh snapshots
- Substack/Twitter: run with `--since <last-date>` for new posts
- SEC EDGAR: run with `--since <last-date>` after each earnings cycle
- FMP: run `fmp.ts --ticker <X>` after each earnings report

---

## API Keys and Env Vars

Copy `.env.example` to `.env.local` (gitignored). Required vars:

| Var | Used by | Notes |
|-----|---------|-------|
| `FMP_API_KEY` | `fmp.ts` | Financial Modeling Prep — financials, transcripts, price |
| `TWITTERAPI_IO_KEY` | `twitter.ts` | twitterapi.io — tweet downloads |
| `IBKR_FLEX_TOKEN` | `ibkr.ts` | IBKR Flex Web Service token |
| `IBKR_FLEX_QUERY_ID` | `ibkr.ts` | Flex query ID (configured in IBKR Account Mgmt) |
| `LITELLM_BASE_URL` | runner (vector/hybrid) | Proxy URL, default `http://localhost:4000` |
| `LITELLM_API_KEY` | runner (vector/hybrid) | Optional — only if proxy requires auth |
| `GBRAIN_EMBEDDING_MODEL` | runner | Default `litellm:gemini-embedding-001` |
| `GBRAIN_EMBEDDING_DIMENSIONS` | runner | Default `1536` |
| `ANTHROPIC_API_KEY` | runner (hybrid+expansion) | Query expansion via Claude Haiku |
| `GOOGLE_APPLICATION_CREDENTIALS` | LiteLLM proxy | Path to gcloud ADC JSON |
| `VERTEXAI_PROJECT` | LiteLLM proxy | GCP project (`finai-adhi-dev`) |
| `VERTEXAI_LOCATION` | LiteLLM proxy | Region (`us-central1`) |

**No `OPENAI_API_KEY` needed.** Embeddings go through LiteLLM → Vertex AI.

SEC EDGAR needs no key but requires `User-Agent: gbrain-evals research@gbrain.ai`
(set in `edgar.ts`).

---

## Data Quality Notes

- **All 1,910 pages have valid `published_at` dates** — verified by audit
- **FMP financials include full company name** in `compiled_truth` header (e.g.
  "NVIDIA Corporation (NVDA) — Q3 CY2025...") so FTS can match "NVIDIA" not
  just "NVDA"
- **source_types corrected 2026-05-13**: FMP financials were `sec-10q` → fixed
  to `financials`. FMP transcripts were `sec-10q` → fixed to `transcript`
- **EDGAR 10-K extraction** scans all occurrences of item headers to skip TOC
  entries (requires 1,500+ chars). Works for all 5 tickers
- **Substack articles with paywall** flagged via `_facts.paywall: true`; still
  included with whatever content was accessible
- **Social pages**: 453 total, 141 mention at least one target company ticker

---

## gbrain Integration Notes

The runner uses gbrain's PGLite engine (in-memory Postgres). Key patterns:

```typescript
import { PGLiteEngine } from 'gbrain/pglite-engine';
import { importFromContent } from 'gbrain/import-file';
import { hybridSearch } from 'gbrain/search/hybrid';
import { expandQuery } from 'gbrain/search/expansion';
import { configureGateway, __setEmbedTransportForTests }
  from './node_modules/gbrain/src/core/ai/gateway.ts';

// Configure before engine creation
configureGateway({
  embedding_model: 'litellm:gemini-embedding-001',
  embedding_dimensions: 1536,
  base_urls: { litellm: 'http://localhost:4000' },
  env: { ...process.env },
});

// Wire direct HTTP transport (bypasses AI SDK to inject dimensions=1536)
__setEmbedTransportForTests(makeCachingTransport(async (params) => {
  const res = await fetch('http://localhost:4000/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gemini-embedding-001', input: params.values, dimensions: 1536 }),
  });
  const data = await res.json();
  return { embeddings: data.data.map(d => d.embedding) };
}, cache));

// Per adapter: fresh engine, index all pages, run queries
const engine = new PGLiteEngine();
await engine.connect({});
await engine.initSchema();

await importFromContent(engine, slug.toLowerCase(), page.compiled_truth, {
  noEmbed: adapter === 'keyword'
});

// Search
const results = await engine.searchKeyword(query, { limit: 5 });
const results = await hybridSearch(engine, query, { limit: 5, expansion: false });
const results = await hybridSearch(engine, query, {
  limit: 5, expansion: true, expandFn: expandQuery
});
```

**Hard excludes:** gbrain excludes slugs starting with `test/`, `archive/`,
`attachments/`, `.raw/`. Our slugs (`financials/`, `transcripts/`, `price/`,
`social/`, `substack/`, `portfolio/`, `sec/`) are all safe.

**Slug normalization:** gbrain lowercases slugs via `validateSlug`. Scoring
uses `retrieved.some(r => r.includes(answerSlug.toLowerCase()))`.

**Stale cache danger:** If wrong-dim vectors are cached, delete
`eval/data/financebrain-v1/embed-cache/*.sqlite` before re-running.

---

## Git State

Branch: `worktree-financebrain-corpus` (git worktree at
`.claude/worktrees/financebrain-corpus/`).

To merge into main once the benchmark report is complete:
```bash
git checkout main
git merge worktree-financebrain-corpus
git push
```

Recent commits on this branch:
- `3871d89` — fix(financebrain): confirmed working end-to-end vector retrieval via Vertex AI
- `1f886b9` — fix(financebrain): inject dimensions=1536 into embedding transport
- `b801aac` — feat(financebrain): switch to gemini-embedding-001 @ 1536d via LiteLLM + Vertex AI
- `b57c3b9` — feat(financebrain): use LiteLLM proxy for embeddings (Vertex AI / Google)
- `a1dab5a` — docs(financebrain): full context dump for parallel agent handoff
- `b0f29b2` — feat(financebrain): end-to-end runner + data fixes
- `9365e57` — feat(financebrain): IBKR portfolio + SEC EDGAR scrapers
- `69d0c86` — feat(financebrain): Substack full corpus + @dylan522p tweets

---

## Quick Reference: File Counts by Ticker (SEC)

```
sec/NVDA/  58 files: 10-K×5 (FY2022–FY2026), 10-Q×12, 8-K×41
sec/MSFT/  52 files: 10-K×3 (FY2023–FY2025), 10-Q×12, 8-K×37
sec/GOOGL/ 68 files: 10-K×5 (FY2021–FY2025), 10-Q×13, 8-K×50
sec/META/  68 files: 10-K×5 (FY2021–FY2025), 10-Q×13, 8-K×50
sec/AAPL/  56 files: 10-K×4 (FY2022–FY2025), 10-Q×14, 8-K×38
```

---

## Quick Reference: FMP Coverage Dates

```
financials/   Q1 2021 – Q1 2026  (91 quarterly pages, all 5 tickers)
transcripts/  Q1 2022 – Q2 2026  (91 transcript pages, all 5 tickers)
price/        Jan 2022 – May 2026 (1,093 daily trading days per ticker)
              90 quarterly summaries (CY2022-Q1 through CY2026-Q2)
```

---

## Quick Reference: Social Coverage

```
social/dylan522p/  453 pages  May 2024 – May 2026
  NVDA mentions: 76   MSFT mentions: 57   GOOGL mentions: 23
  META mentions: 14   AAPL mentions: 10
  141 of 453 pages mention at least one target company
```

---

*Last updated: 2026-05-13.*
