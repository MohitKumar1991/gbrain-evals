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
      embed-cache/             ← SQLite embedding cache (warm after first run)
      test-queries.json        ← 9 smoke-test queries, one per source_type
  runner/
    financebrain.ts            ← main eval runner (indexes corpus, runs queries, scores)
    longmemeval-cache.ts       ← shared embedding cache (reused by financebrain runner)
    questions-ui.ts            ← local web UI for building questions.json (http://localhost:3456)
    questions-ui.html          ← UI frontend (served by questions-ui.ts)

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
NVDA  fiscal year ends Jan 31  → Q1 FY2026 earnings: 2025-05-28
MSFT  fiscal year ends Jun 30  → Q3 FY2026 earnings: 2026-04-30 (est)
GOOGL calendar year            → Q1 FY2026 earnings: 2026-04-29 (est)
META  calendar year            → Q1 FY2026 earnings: 2026-04-30 (est)
AAPL  fiscal year ends ~Sep 30 → Q2 FY2026 earnings: 2026-05-01 (est)
```

`getQuarterContext(ticker, publishedAt)` returns the nearest earnings event
within a 90-day window.

---

## Scrapers — How to Run

All scrapers read API keys from env vars. Copy `.env.example` → `.env.local`.

### Substack (ai-supremacy.com)
```bash
TWITTERAPI_IO_KEY=... bun eval/scrapers/substack.ts          # full 977 articles
bun eval/scrapers/substack.ts --limit 10                      # smoke test
bun eval/scrapers/substack.ts --since 2025-01-01             # incremental
bun eval/scrapers/substack.ts --no-cache                      # re-fetch all
```
Output: `eval/data/financebrain-v1/substack/<slug>.json`

### FMP — Financials, Transcripts, Price
```bash
FMP_API_KEY=... bun eval/scrapers/fmp.ts                      # all 5 tickers
FMP_API_KEY=... bun eval/scrapers/fmp.ts --ticker NVDA        # one ticker
FMP_API_KEY=... bun eval/scrapers/fmp.ts --no-cache           # re-fetch
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
+ exponential backoff on 429s. ~977 pages takes ~10–15 min.

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
Rate limit: 600ms between requests (EDGAR requires polite crawling, User-Agent header).

For 8-Ks: fetches the filing index HTML to find the press release exhibit
(EX-99.1) rather than the boilerplate XBRL form.
For 10-Ks: extracts Business (Item 1), Risk Factors (Item 1A), MD&A (Item 7)
by scanning all occurrences to skip TOC entries (requires 1,500+ chars).

---

## Runner — How to Use

```bash
# Smoke test: 9 dummy queries, keyword-only (no API keys needed)
bun eval/runner/financebrain.ts --queries test --keyword-only --top-k 5

# Smoke test: hybrid adapter (needs LiteLLM proxy + ANTHROPIC_API_KEY)
LITELLM_BASE_URL=http://localhost:4000 ANTHROPIC_API_KEY=... \
  bun eval/runner/financebrain.ts --queries test --adapters hybrid --top-k 5

# Full run: all 4 adapters against a question bank
LITELLM_BASE_URL=http://localhost:4000 ANTHROPIC_API_KEY=... \
  bun eval/runner/financebrain.ts --queries eval/data/financebrain-v1/questions.json \
  --adapters keyword,vector,hybrid,hybrid+expansion --top-k 5

# Other flags
--limit N           # run only first N queries (for smoke tests)
--no-cache          # re-embed, don't use SQLite cache
```

**What the runner does:**
1. Loads all 1,910 `FinancePage` JSONs from `eval/data/financebrain-v1/`
2. For each adapter: creates a fresh PGLiteEngine, indexes all pages via
   `importFromContent`, runs each query, scores Recall@K
3. For keyword: FTS via `engine.searchKeyword` (no embeddings)
4. For vector: `embed(q)` → `engine.searchVector`
5. For hybrid: `hybridSearch(engine, q, {expansion: false})`
6. For hybrid+expansion: `hybridSearch(engine, q, {expansion: true, expandFn: expandQuery})`
7. Writes JSON report to `eval/reports/financebrain/financebrain-<timestamp>.json`

**Known behavior:**
- Indexing 1,910 pages takes ~26s for keyword-only (no embeddings)
- Keyword recall is low (~22%) on natural language queries — expected. FTS needs
  exact term matches; financial data uses tickers and structured formatting that
  doesn't always FTS-match natural language questions
- Hybrid+expansion should score significantly higher (semantic retrieval)

**Embedding setup — LiteLLM → Vertex AI:**
Embeddings use Google's `text-embedding-004` (768 dims) via LiteLLM proxy.
The runner's `configureGateway` call sets `embedding_model: 'litellm:text-embedding-004'`
and points the `litellm` recipe at `LITELLM_BASE_URL`.

Required LiteLLM proxy config (in your `litellm_config.yaml`):
```yaml
model_list:
  - model_name: text-embedding-004
    litellm_params:
      model: vertex_ai/text-embedding-004
      vertex_project: <your-gcp-project>
      vertex_location: us-central1
```

**Embedding cache:** `eval/data/financebrain-v1/embed-cache/embed-cache-litellm_gemini-embedding-001@1536.sqlite`
Once warmed (~61MB), vector/hybrid runs skip all ~390 Vertex AI API calls.
Commit the cache file so parallel agents don't re-embed.

**Cache key gotcha:** the cache is keyed by `(model, dims)`. If you run any
vector/hybrid query while the proxy is misconfigured (returning wrong dims),
wrong-dim vectors get written to cache. Symptom: `Embedding dim mismatch`
even after fixing the proxy. Fix: `rm eval/data/financebrain-v1/embed-cache/*.sqlite`
then re-run to rebuild from scratch with the correct dimensions.

---

## Smoke Test Results (keyword adapter, 9 queries, top-K=5)

Ran 2026-05-13. Result file: `eval/reports/financebrain/financebrain-smoke-2026-05-13T09-37-40.json`

| Query ID | Category | Hit? | Notes |
|----------|----------|------|-------|
| substack-01 | substack | ✓ | NVIDIA AI infrastructure articles found |
| financials-01 | financials | ✗ | FTS exact-term miss on ticker vs company name |
| transcript-01 | transcript | ✗ | Multiple transcripts rank similarly |
| price-01 | price | ✗ | CY2023-Q2 slug tokens don't FTS-stem well |
| social-01 | social | ✗ | 0 results — query terms too generic for FTS |
| portfolio-01 | portfolio | ✓ | NVDA shares P&L found correctly |
| sec-8k-01 | sec-8k | ✗ | Wrong quarter — multiple "record revenue" 8-Ks |
| sec-10k-01 | sec-10k | ✗ | 0 results — risk factors / business terms too generic |
| sec-10q-01 | sec-10q | ✗ | Finds 8-K instead of 10-Q |

**Keyword Recall@5: 2/9 = 22.2%**

This is expected. Keyword FTS on financial data is weak because: (a) natural
language queries don't share exact terms with structured financial text, (b)
tickers ("NVDA") vs company names ("NVIDIA") mismatch, (c) date encoding
(CY2023-Q2 in slugs) doesn't FTS-stem. Vector/hybrid will score higher.

---

## Test Queries

`eval/data/financebrain-v1/test-queries.json` contains 9 smoke-test queries.
Format:

```json
{
  "id": "financials-01",
  "category": "financials",
  "question": "NVIDIA Corporation NVDA Q3 revenue gross margin operating income October 2024",
  "answer_slugs": ["financials/nvda-2024-10-27"],
  "notes": "Q3 FY2025 financials (period ending 2024-10-27)"
}
```

Scoring: a query is a hit if any slug from `answer_slugs` appears (via
`retrieved.some(r => r.includes(s))`) in the top-K results. For queries with
`answer_slug_pattern` (no fixed answer_slug), any retrieved slug containing
the pattern is a hit.

---

## Pending Tasks

### High Priority

**1. Build the full question bank**
File to create: `eval/data/financebrain-v1/questions.json`
Format: same as `test-queries.json`.

Use the question builder UI to add questions interactively:
```bash
bun eval/runner/questions-ui.ts   # opens at http://localhost:3456
```

Write 10–20 questions per source_type category (9 categories × ~15 questions
= ~135 total). Rules:
- Each question must have verified `answer_slugs` (check the file exists on disk)
- Include a mix of: single-answer (one page), multi-answer (2–3 pages), and
  cross-source questions (answer spans two different source_types)
- Temporal questions (e.g. "what was NVDA sentiment 2 weeks before Q2 FY2025
  earnings?") are high-value — they test the `quarter_context` field
- Write questions that work for both keyword (use exact terms) AND natural
  language (use full sentences) — or write two variants

Question types to cover per source_type:
- `financials`: revenue, margins, EPS, YoY/QoQ deltas, specific quarters
- `transcript`: CEO quotes, guidance language, specific topics (AI, capex)
- `price`: quarterly return, high/low, post-earnings price move
- `social`: opinion on a company event, sentiment before/after earnings
- `substack`: analysis of AI trends, company coverage
- `portfolio`: position size, P&L, weight in portfolio
- `sec-8k`: acquisition announcements, leadership changes, earnings events
- `sec-10k`: risk factors, business segments, competitive landscape
- `sec-10q`: Azure/Cloud revenue (MSFT), Data Center (NVDA), quarterly MD&A

**2. Run full eval with vector + hybrid adapters**
Requires: `OPENAI_API_KEY` + `ANTHROPIC_API_KEY`
Command:
```bash
OPENAI_API_KEY=... ANTHROPIC_API_KEY=... \
  bun eval/runner/financebrain.ts \
  --queries eval/data/financebrain-v1/questions.json \
  --adapters keyword,vector,hybrid,hybrid+expansion \
  --top-k 5
```
First run: build embedding cache (costs ~$5–15 for 1,910 pages at
text-embedding-3-large). Subsequent runs: free from cache.

**3. Build the chart generator**
File to create: `eval/runner/financebrain-chart.ts`
Mirror `eval/runner/longmemeval-chart.ts`. Produce two SVGs:
- Headline bar chart: Recall@5 per adapter (horizontal bars)
- Per-source-type grouped bar chart: one bar per adapter per source_type

Store SVGs in `docs/benchmarks/2026-05-13-financebrain-bigtech-v1/`.

**4. Write the published benchmark report**
File: `docs/benchmarks/2026-05-13-financebrain-bigtech-v1.md`
Follow the 12-section template in `CLAUDE.md`. All sections are currently
`[pending]`. Fill after the full eval run has results.

**5. Add more Twitter handles**
Current: only `@dylan522p` (SemiAnalysis). Add:
- Company CEOs: `@satyanadella` (MSFT), `@tim_cook` (AAPL), etc.
- AI analysts: `@karpathy`, `@sama`, others
- Use: `TWITTERAPI_IO_KEY=... bun eval/scrapers/twitter.ts --handle <handle> --years 2`
- Output lands in `eval/data/financebrain-v1/social/<handle>/`
- Indexes automatically into corpus (runner walks the full tree)

**6. Company website crawl**
Not yet implemented. Would add `company-overview` source_type pages.
Suggested: crawl investor relations pages, product pages for each company.
Scraper to create: `eval/scrapers/company-crawl.ts`

### Lower Priority

**9. Commit warm embedding cache**
After first hybrid/vector run, commit `eval/data/financebrain-v1/embed-cache/*.sqlite`.
This makes subsequent runs free and makes the corpus portable (like LongMemEval).
Note: the cache file is large (~150MB for full corpus) — check gitignore rules.

---

## API Keys and Env Vars

Copy `.env.example` to `.env.local` (gitignored). Required vars:

| Var | Used by | Notes |
|-----|---------|-------|
| `FMP_API_KEY` | `fmp.ts` | Financial Modeling Prep — financials, transcripts, price |
| `TWITTERAPI_IO_KEY` | `twitter.ts` | twitterapi.io — tweet downloads |
| `IBKR_FLEX_TOKEN` | `ibkr.ts` | IBKR Flex Web Service token |
| `IBKR_FLEX_QUERY_ID` | `ibkr.ts` | Flex query ID (configured in IBKR Account Mgmt) |
| `LITELLM_BASE_URL` | runner (vector/hybrid) | LiteLLM proxy URL, default `http://localhost:4000` |
| `LITELLM_API_KEY` | runner (vector/hybrid) | Optional — only if proxy requires auth |
| `GBRAIN_EMBEDDING_MODEL` | runner | Default `litellm:text-embedding-004` |
| `GBRAIN_EMBEDDING_DIMENSIONS` | runner | Default `768` (Google text-embedding-004) |
| `ANTHROPIC_API_KEY` | runner (hybrid+expansion) | Query expansion via Claude Haiku |

SEC EDGAR requires no API key but requires a `User-Agent` header
(`gbrain-evals research@gbrain.ai` — set in the scraper).

**No `OPENAI_API_KEY` needed.** Embeddings go through LiteLLM → Vertex AI.
OpenAI is no longer in the embedding path for FinanceBrain.

---

## Data Quality Notes

- **All 1,910 pages have valid `published_at` dates** — verified by audit
- **FMP financials now include full company name** in compiled_truth header
  (e.g. "NVIDIA Corporation (NVDA) — Q3 CY2025...") so FTS matches company name
- **source_type labels were fixed on 2026-05-13**: FMP financials were labeled
  `sec-10q` (wrong), now `financials`. FMP transcripts were `sec-10q`, now
  `transcript`
- **EDGAR 10-K section extraction** scans all occurrences of item headers to skip
  TOC entries (requires 1,500+ char minimum to count as real section). Works for
  all 5 tickers
- **Substack articles with paywall** are flagged via `_facts.paywall: true`
  but still included with whatever content was accessible
- **Social pages with no company mentions** (`companies_mentioned: []`) are
  included in the corpus (453 pages total, 141 mention at least one target ticker)

---

## gbrain Integration Notes

The runner uses gbrain's PGLite engine (in-memory Postgres). Key API points:

```typescript
import { PGLiteEngine } from 'gbrain/pglite-engine';
import { importFromContent } from 'gbrain/import-file';
import { hybridSearch } from 'gbrain/search/hybrid';
import { expandQuery } from 'gbrain/search/expansion';

// Per adapter: fresh engine, index all pages, run queries
const engine = new PGLiteEngine();
await engine.connect({});
await engine.initSchema();

// Index a page
await importFromContent(engine, slug.toLowerCase(), page.compiled_truth, {
  noEmbed: adapter === 'keyword'  // skip embeddings for keyword-only
});

// Search
const results = await engine.searchKeyword(query, { limit: 5 });
const results = await hybridSearch(engine, query, { limit: 5, expansion: false });
const results = await hybridSearch(engine, query, {
  limit: 5, expansion: true, expandFn: expandQuery
});

// Results have: result.slug (the indexed slug)
```

**Hard excludes:** gbrain excludes slugs starting with `test/`, `archive/`,
`attachments/`, `.raw/` from search results. Our slugs use none of these
prefixes — they are `financials/`, `transcripts/`, `price/`, `social/`,
`substack/`, `portfolio/`, `sec/`.

**Slug normalization:** gbrain lowercases slugs. Our pages already use
lowercase slugs in `_facts`. Scoring compares `retrieved.some(r => r.includes(answerSlug))`.

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
- `b0f29b2` — feat(financebrain): end-to-end runner + data fixes
- `9365e57` — feat(financebrain): IBKR portfolio + SEC EDGAR scrapers
- `69d0c86` — feat(financebrain): Substack full corpus + @dylan522p tweets
- `7467ff0` — feat(financebrain): complete FMP data + Twitter scraper
- `54e257a` — feat(financebrain): FMP scraper — financials, transcripts, price data
- `2f584f4` — feat(financebrain): Substack scraper + earnings calendar

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

*Last updated: 2026-05-13. Generated from conversation context during initial
FinanceBrain corpus build session.*
