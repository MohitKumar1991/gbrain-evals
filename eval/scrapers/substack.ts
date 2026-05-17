#!/usr/bin/env bun
/**
 * Substack scraper for ai-supremacy.com
 *
 * Downloads every public article, extracts clean text + metadata, and tags
 * each article with its earnings-relative context for every target company
 * mentioned (e.g. "published 14 days before NVDA Q1 FY2027 earnings").
 *
 * Usage:
 *   bun eval/scrapers/substack.ts
 *   bun eval/scrapers/substack.ts --limit 20          # smoke test
 *   bun eval/scrapers/substack.ts --since 2024-01-01  # incremental
 *   bun eval/scrapers/substack.ts --no-cache          # re-fetch all
 *
 * Output: eval/data/financebrain-v1/substack/<slug>.json (one file per article)
 * Also writes a manifest: eval/data/financebrain-v1/substack/_index.json
 *
 * Rate limit: 600 ms between requests (100 req/min — well within polite range).
 * Resume-safe: skips slugs that already have a file on disk unless --no-cache.
 */

import { writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EARNINGS_CALENDAR, getQuarterContext } from './earnings-calendar.ts';
import { loadTradingDays } from './trading-days.ts';
import type { FinancePage } from './types.ts';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.ai-supremacy.com';
const OUTPUT_DIR = 'eval/data/financebrain-v1/substack';
const TRADING_DAYS = loadTradingDays('eval/data/financebrain-v1/price');
const RATE_LIMIT_MS = 600;

// Tickers we care about and the text patterns that indicate a mention.
// Lower-cased — we scan article text lowercased.
const COMPANY_PATTERNS: Record<string, string[]> = {
  NVDA: [
    'nvidia', 'nvda', 'jensen huang', 'h100', 'h200', 'b100', 'b200',
    'blackwell', 'hopper', 'cuda', 'nemo', 'nim ', 'dgx',
  ],
  MSFT: [
    'microsoft', 'msft', 'azure', 'copilot', 'satya nadella',
    'bing ', 'teams ', 'github copilot', 'openai', // MSFT owns OpenAI stake
  ],
  GOOGL: [
    'google', 'alphabet', 'googl', 'gemini', 'sundar pichai', 'bard ',
    'deepmind', 'google cloud', 'gcp', 'waymo', 'tpu ', 'google ai',
    'google search', 'youtube',
  ],
  META: [
    'meta ', 'facebook', ' instagram', 'whatsapp', 'mark zuckerberg',
    'llama ', 'zuck', 'reality labs', 'threads ', 'meta ai',
    'meta platforms', 'reels',
  ],
  AAPL: [
    'apple ', ' aapl', 'tim cook', 'iphone', ' ios ', 'macos',
    'app store', 'apple intelligence', 'apple silicon', 'vision pro',
    'siri ', 'mac ', 'macbook',
  ],
};

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const sinceIdx = args.indexOf('--since');
const SINCE = sinceIdx >= 0 ? new Date(args[sinceIdx + 1]) : null;
const NO_CACHE = args.includes('--no-cache');

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function slugFromUrl(url: string): string {
  // https://www.ai-supremacy.com/p/some-article-slug → some-article-slug
  const m = url.match(/\/p\/([^/?#]+)/);
  return m ? m[1] : url.replace(/[^a-z0-9-]/gi, '-').slice(-80);
}

/** Strip HTML tags and collapse whitespace. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Extract a meta tag value from raw HTML. */
function extractMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re) ?? html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  );
  return m ? m[1] : null;
}

/** Extract JSON-LD structured data from page HTML. */
function extractJsonLd(html: string): Record<string, unknown> | null {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Detect which target tickers are mentioned in the article text. */
function detectCompanies(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(COMPANY_PATTERNS)
    .filter(([, patterns]) => patterns.some(p => lower.includes(p)))
    .map(([ticker]) => ticker);
}

/** Build per-ticker quarter context for a given publish date. */
function buildQuarterContext(
  tickers: string[],
  publishedAt: Date,
): Partial<Record<string, ReturnType<typeof getQuarterContext>>> {
  const ctx: Partial<Record<string, ReturnType<typeof getQuarterContext>>> = {};
  for (const ticker of tickers) {
    const qc = getQuarterContext(ticker, publishedAt, TRADING_DAYS);
    if (qc) ctx[ticker] = qc;
  }
  return ctx;
}

// ── Sitemap fetch ─────────────────────────────────────────────────────────────

async function fetchSitemapUrls(): Promise<string[]> {
  console.log('Fetching sitemap...');
  const res = await fetch(`${BASE_URL}/sitemap.xml`, {
    headers: { 'User-Agent': 'gbrain-evals/1.0 (research crawler)' },
  });
  if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status}`);
  const xml = await res.text();

  // Extract all /p/ article URLs
  const urls: string[] = [];
  const re = /<loc>(https?:\/\/[^<]+\/p\/[^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1].trim());
  }

  console.log(`  Found ${urls.length} article URLs in sitemap.`);
  return urls;
}

// ── Article fetch + parse ─────────────────────────────────────────────────────

type RawArticle = {
  url: string;
  slug: string;
  title: string;
  author: string;
  published_at: string;
  content: string;
  paywall: boolean;
};

async function fetchArticle(url: string): Promise<RawArticle | null> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'gbrain-evals/1.0 (research crawler)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) {
    console.warn(`  WARN: ${res.status} for ${url}`);
    return null;
  }

  const html = await res.text();
  const slug = slugFromUrl(url);

  // Try JSON-LD first (most reliable)
  const ld = extractJsonLd(html);
  const title =
    (ld?.headline as string) ??
    extractMeta(html, 'og:title') ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(' | AI Supremacy', '').trim() ??
    slug;

  const published_at =
    (ld?.datePublished as string) ??
    extractMeta(html, 'article:published_time') ??
    extractMeta(html, 'og:article:published_time') ??
    '';

  const author =
    (ld?.author as { name?: string })?.name ??
    extractMeta(html, 'article:author') ??
    'Michael Spencer';

  // Substack puts the article body in <div class="available-content"> and
  // closes the content region at the post-footer div. We slice between those
  // two markers — this captures the full text even for long articles.
  const contentStart = html.indexOf('<div class="available-content">');
  const contentEnd = html.indexOf('class="post-footer"');
  const rawContent =
    contentStart >= 0 && contentEnd > contentStart
      ? html.slice(contentStart, contentEnd)
      : html; // fallback: full page

  // Detect paywall: Substack puts a "subscribe to keep reading" wall
  const paywall = /subscribe to keep reading|paywall|upgrade to paid/i.test(html);

  const content = htmlToText(rawContent);

  return { url, slug, title, author, published_at, content, paywall };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load already-downloaded slugs for resume
  const existing = new Set(
    NO_CACHE
      ? []
      : readdirSync(OUTPUT_DIR)
          .filter(f => f.endsWith('.json') && !f.startsWith('_'))
          .map(f => f.replace('.json', '')),
  );
  console.log(`  Already downloaded: ${existing.size} articles.`);

  const urls = await fetchSitemapUrls();
  await sleep(RATE_LIMIT_MS);

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const index: Array<{ slug: string; title: string; published_at: string; companies_mentioned: string[] }> = [];

  for (const url of urls) {
    if (processed >= LIMIT) break;

    const slug = slugFromUrl(url);

    if (existing.has(slug)) {
      skipped++;
      continue;
    }

    try {
      const raw = await fetchArticle(url);
      await sleep(RATE_LIMIT_MS);

      if (!raw || !raw.published_at) {
        console.warn(`  SKIP (no date): ${url}`);
        errors++;
        continue;
      }

      const publishedAt = new Date(raw.published_at);

      if (SINCE && publishedAt < SINCE) {
        skipped++;
        continue;
      }

      const companies = detectCompanies(raw.content + ' ' + raw.title);
      const quarter_context = buildQuarterContext(companies, publishedAt);

      // Build a timeline string summarising the quarter context for easy reading
      const timelineLines = Object.entries(quarter_context)
        .filter(([, qc]) => qc != null)
        .map(([ticker, qc]) => {
          const rel =
            qc!.phase === 'pre-earnings'
              ? `${Math.abs(qc!.days_relative)}d before ${ticker} ${qc!.quarter} ${qc!.fiscal_year} earnings`
              : qc!.phase === 'earnings-day'
                ? `earnings day for ${ticker} ${qc!.quarter} ${qc!.fiscal_year}`
                : `${qc!.days_relative}d after ${ticker} ${qc!.quarter} ${qc!.fiscal_year} earnings`;
          return `- **${raw.published_at.slice(0, 10)}** | ${rel} (earnings date: ${qc!.earnings_date})`;
        });

      const page: FinancePage = {
        slug: `substack/${slug}`,
        type: 'article',
        source_type: 'substack',
        title: raw.title,
        author: raw.author,
        url: raw.url,
        published_at: raw.published_at,
        compiled_truth: raw.content,
        timeline: timelineLines.length > 0 ? timelineLines.join('\n') : undefined,
        companies_mentioned: companies,
        quarter_context,
        _facts: {
          published_at: raw.published_at,
          companies_mentioned: companies,
          quarter_context,
          paywall: raw.paywall,
          source_url: raw.url,
          author: raw.author,
        },
      };

      const outPath = join(OUTPUT_DIR, `${slug}.json`);
      writeFileSync(outPath, JSON.stringify(page, null, 2));

      index.push({
        slug: page.slug,
        title: raw.title,
        published_at: raw.published_at,
        companies_mentioned: companies,
      });

      processed++;
      const compStr = companies.length ? `  [${companies.join(', ')}]` : '';
      console.log(`  [${processed}] ${raw.published_at.slice(0, 10)} ${raw.title.slice(0, 60)}${compStr}`);
    } catch (err) {
      console.error(`  ERROR: ${url} — ${err}`);
      errors++;
      await sleep(RATE_LIMIT_MS * 2); // back off on error
    }
  }

  // Write manifest
  const indexPath = join(OUTPUT_DIR, '_index.json');
  writeFileSync(indexPath, JSON.stringify({ generated_at: new Date().toISOString(), articles: index }, null, 2));

  console.log(`\nDone. processed=${processed} skipped=${skipped} errors=${errors}`);
  console.log(`Index written to ${indexPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
