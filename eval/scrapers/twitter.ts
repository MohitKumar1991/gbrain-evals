#!/usr/bin/env bun
/**
 * Twitter / X scraper using twitterapi.io
 *
 * Downloads all tweets from a given handle for the last N years.
 * Groups thread tweets under one page (same conversationId authored by the
 * same user). Skips bare retweets (no added commentary). Applies company
 * detection + earnings-relative temporal tagging to every page.
 *
 * Usage:
 *   bun eval/scrapers/twitter.ts --handle dylan522p
 *   bun eval/scrapers/twitter.ts --handle dylan522p --years 2
 *   bun eval/scrapers/twitter.ts --handle dylan522p --no-cache
 *
 * Output: eval/data/financebrain-v1/social/<handle>/<tweet-id>.json
 *         eval/data/financebrain-v1/social/<handle>/_index.json
 */

import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { getQuarterContext } from './earnings-calendar.ts';
import type { FinancePage } from './types.ts';

// ── Config ─────────────────────────────────────────────────────────────────────

const API_KEY = process.env.TWITTERAPI_IO_KEY;
if (!API_KEY) { console.error('TWITTERAPI_IO_KEY env var required'); process.exit(1); }
const BASE = 'https://api.twitterapi.io';
const RATE_MS = 2000;   // twitterapi.io rate-limits aggressively; 2s is safe
const MAX_RETRIES = 4;

const COMPANY_PATTERNS: Record<string, string[]> = {
  NVDA: [
    'nvidia', 'nvda', 'jensen huang', 'jensen', 'h100', 'h200', 'b100', 'b200', 'gb200',
    'blackwell', 'hopper', 'cuda', 'nemo', 'dgx', 'nvlink', 'hgx', 'grace hopper',
    'csp ', 'nv ', 'gb300',
  ],
  MSFT: [
    'microsoft', 'msft', 'azure', 'satya nadella', 'satya', 'github copilot',
    'bing ', 'openai', 'o1 ', 'o3 ', 'gpt-', 'chatgpt', 'azure ai',
  ],
  GOOGL: [
    'google', 'alphabet', 'googl', 'gemini', 'sundar', 'deepmind',
    'google cloud', 'tpu ', 'tpuv', 'waymo', 'bard ', 'vertex ai',
  ],
  META: [
    'meta ', 'facebook', 'zuckerberg', 'zuck', 'llama', 'meta ai',
    'meta platforms', 'instagram', 'whatsapp', 'reels', 'reality labs',
  ],
  AAPL: [
    'apple ', 'aapl', 'tim cook', 'iphone', ' ios ', 'apple silicon',
    'vision pro', 'siri ', 'apple intelligence', 'm1 ', 'm2 ', 'm3 ', 'm4 ',
  ],
};

function detectCompanies(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(COMPANY_PATTERNS)
    .filter(([, pats]) => pats.some(p => lower.includes(p)))
    .map(([ticker]) => ticker);
}

// ── CLI ────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const handleIdx = args.indexOf('--handle');
if (handleIdx < 0) { console.error('Usage: bun twitter.ts --handle <username>'); process.exit(1); }
const HANDLE = args[handleIdx + 1].replace(/^@/, '');
const yearsIdx = args.indexOf('--years');
const YEARS_BACK = yearsIdx >= 0 ? parseInt(args[yearsIdx + 1]) : 2;
const NO_CACHE = args.includes('--no-cache');

const SINCE = new Date();
SINCE.setFullYear(SINCE.getFullYear() - YEARS_BACK);

const OUT_DIR = `eval/data/financebrain-v1/social/${HANDLE}`;

// ── API ───────────────────────────────────────────────────────────────────────

type Tweet = {
  id: string;
  url: string;
  text: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  viewCount: number;
  bookmarkCount: number;
  isReply: boolean;
  inReplyToId: string | null;
  inReplyToUsername: string | null;
  conversationId: string;
  quoted_tweet?: Tweet | null;
  retweeted_tweet?: Tweet | null;
  author: { userName: string; name: string; id: string };
  entities?: { urls?: Array<{ expanded_url: string; display_url: string }> };
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(cursor?: string): Promise<{ tweets: Tweet[]; has_next: boolean; next_cursor: string }> {
  const params = new URLSearchParams({ userName: HANDLE });
  if (cursor) params.set('cursor', cursor);
  const url = `${BASE}/twitter/user/last_tweets?${params}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: { 'X-API-Key': API_KEY! } });
    if (res.status === 429) {
      const wait = RATE_MS * Math.pow(2, attempt);
      process.stdout.write(`\n  [429] rate limited — waiting ${(wait / 1000).toFixed(0)}s...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    const body = await res.json() as {
      status: string; has_next_page: boolean; next_cursor: string;
      data: { tweets: Tweet[] };
    };
    if (body.status !== 'success') throw new Error(`API error: ${JSON.stringify(body)}`);
    return {
      tweets: body.data.tweets ?? [],
      has_next: body.has_next_page,
      next_cursor: body.next_cursor,
    };
  }
  throw new Error(`Failed after ${MAX_RETRIES} retries: ${url}`);
}

// ── Tweet classification ──────────────────────────────────────────────────────

function isBareRetweet(t: Tweet): boolean {
  // A bare RT has no added text — starts with "RT @" and the retweeted_tweet
  // field is set. If the user added commentary it's a quote tweet (different).
  return t.text.startsWith('RT @') && !!t.retweeted_tweet;
}

function tweetDate(t: Tweet): Date {
  return new Date(t.createdAt);
}

// ── Page builder ──────────────────────────────────────────────────────────────

function buildTweetPage(tweets: Tweet[], handle: string): FinancePage {
  // tweets: either a single tweet or a thread (same conversationId, same author)
  const lead = tweets[0];
  const publishedAt = tweetDate(lead);

  const allText = tweets
    .map((t, i) => {
      const ts = tweetDate(t).toISOString();
      const engagement = `[${t.likeCount} likes · ${t.retweetCount} RTs · ${t.viewCount} views]`;
      const quoted = t.quoted_tweet
        ? `\n  > Quoting @${t.quoted_tweet.author?.userName}: ${t.quoted_tweet.text}`
        : '';
      const prefix = i === 0 ? '' : `\n[Thread ${i + 1}/${tweets.length}] `;
      return `${prefix}${t.text}${quoted}\n${ts} ${engagement}`;
    })
    .join('\n\n');

  const companies = detectCompanies(allText);
  const qctx: Record<string, ReturnType<typeof getQuarterContext>> = {};
  for (const ticker of companies) {
    const qc = getQuarterContext(ticker, publishedAt);
    if (qc) qctx[ticker] = qc;
  }

  const timelineLines = Object.entries(qctx)
    .filter(([, qc]) => qc != null)
    .map(([ticker, qc]) => {
      const rel = qc!.phase === 'pre-earnings'
        ? `${Math.abs(qc!.days_relative)}d before ${ticker} ${qc!.quarter} ${qc!.fiscal_year} earnings`
        : qc!.phase === 'earnings-day'
          ? `earnings day — ${ticker} ${qc!.quarter} ${qc!.fiscal_year}`
          : `${qc!.days_relative}d after ${ticker} ${qc!.quarter} ${qc!.fiscal_year} earnings`;
      return `- **${publishedAt.toISOString().slice(0, 10)}** | ${rel}`;
    });

  const isThread = tweets.length > 1;
  const title = isThread
    ? `@${handle} thread (${tweets.length} tweets) — ${publishedAt.toISOString().slice(0, 10)}`
    : `@${handle} — ${publishedAt.toISOString().slice(0, 10)}`;

  return {
    slug: `social/${handle}/${lead.id}`,
    type: 'article',
    source_type: 'social',
    title,
    author: `@${handle} (${lead.author.name})`,
    url: lead.url,
    published_at: publishedAt.toISOString(),
    compiled_truth: allText,
    timeline: timelineLines.length ? timelineLines.join('\n') : undefined,
    companies_mentioned: companies,
    quarter_context: qctx,
    _facts: {
      handle,
      tweet_ids: tweets.map(t => t.id),
      conversation_id: lead.conversationId,
      is_thread: isThread,
      is_reply: lead.isReply,
      in_reply_to: lead.inReplyToUsername,
      lead_likes: lead.likeCount,
      lead_views: lead.viewCount,
      lead_bookmarks: lead.bookmarkCount,
      published_at: publishedAt.toISOString(),
      companies_mentioned: companies,
      quarter_context: qctx,
    },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const existing = new Set(
    NO_CACHE ? [] : readdirSync(OUT_DIR)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .map(f => f.replace('.json', '')),
  );
  console.log(`@${HANDLE} — fetching tweets since ${SINCE.toISOString().slice(0, 10)}`);
  console.log(`Already saved: ${existing.size} pages`);

  // Collect all raw tweets within the time window
  const collected: Tweet[] = [];
  let cursor: string | undefined;
  let page = 0;
  let done = false;

  while (!done) {
    const result = await fetchPage(cursor);
    page++;

    for (const tweet of result.tweets) {
      if (tweetDate(tweet) < SINCE) { done = true; break; }
      if (isBareRetweet(tweet)) continue; // skip bare RTs
      collected.push(tweet);
    }

    const oldest = result.tweets[result.tweets.length - 1];
    process.stdout.write(`\r  Page ${page} — ${collected.length} tweets collected (oldest: ${oldest ? tweetDate(oldest).toISOString().slice(0, 10) : '?'})   `);

    if (!result.has_next || done) break;
    cursor = result.next_cursor;
    await sleep(RATE_MS);
  }
  console.log(`\n  Total collected: ${collected.length} tweets`);

  // Group threads: tweets sharing a conversationId where all authors = handle
  // Sort by id (chronological) so threads read top-to-bottom
  collected.sort((a, b) => a.id.localeCompare(b.id));

  const threadMap = new Map<string, Tweet[]>();
  const seen = new Set<string>();

  for (const tweet of collected) {
    if (seen.has(tweet.id)) continue;
    const convoId = tweet.conversationId;

    // Check if this tweet starts a thread or continues one
    const group = threadMap.get(convoId) ?? [];
    // Only include in thread if it's from the same handle (not a reply to someone else)
    if (tweet.author.userName.toLowerCase() === HANDLE.toLowerCase()) {
      group.push(tweet);
      threadMap.set(convoId, group);
      seen.add(tweet.id);
    }
  }

  // Write pages — one per conversation (thread or single tweet)
  const index: Array<{ slug: string; title: string; published_at: string; companies_mentioned: string[] }> = [];
  let written = 0;
  let skipped = 0;

  for (const [convoId, tweets] of threadMap) {
    const leadId = tweets[0].id;
    if (existing.has(leadId)) { skipped++; continue; }

    const page = buildTweetPage(tweets, HANDLE);
    const outPath = join(OUT_DIR, `${leadId}.json`);
    writeFileSync(outPath, JSON.stringify(page, null, 2));

    index.push({
      slug: page.slug,
      title: page.title,
      published_at: page.published_at,
      companies_mentioned: page.companies_mentioned,
    });

    written++;
  }

  // Write index
  writeFileSync(
    join(OUT_DIR, '_index.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), handle: HANDLE, since: SINCE.toISOString(), entries: index }, null, 2),
  );

  console.log(`\nDone. written=${written} skipped=${skipped}`);
  console.log(`Index: ${OUT_DIR}/_index.json`);

  // Quick breakdown
  const relevant = index.filter(e => e.companies_mentioned.length > 0);
  const counts: Record<string, number> = {};
  for (const e of relevant) for (const c of e.companies_mentioned) counts[c] = (counts[c] ?? 0) + 1;
  console.log(`Mentions target companies: ${relevant.length}/${index.length} pages`);
  console.log('Company breakdown:', counts);
}

main().catch(err => { console.error(err); process.exit(1); });
