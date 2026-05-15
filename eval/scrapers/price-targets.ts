#!/usr/bin/env bun
/**
 * FMP analyst price target scraper for FinanceBrain corpus.
 *
 * Downloads analyst consensus price targets and recent individual estimates
 * for all portfolio holdings. Each ticker becomes one FinancePage JSON.
 *
 * Usage:
 *   FMP_API_KEY=... bun eval/scrapers/price-targets.ts
 *   FMP_API_KEY=... bun eval/scrapers/price-targets.ts --ticker NVDA
 *   FMP_API_KEY=... bun eval/scrapers/price-targets.ts --no-cache
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { FinancePage } from './types.ts';

const API_KEY = process.env.FMP_API_KEY;
if (!API_KEY) { console.error('FMP_API_KEY env var required'); process.exit(1); }

const BASE = 'https://financialmodelingprep.com/api';
const RATE_MS = 350;
const OUT_DIR = 'eval/data/financebrain-v1/analyst-estimates';

const ALL_TICKERS = [
  'NVDA', 'MSFT', 'AAPL', 'GOOGL', 'META',
  'AMZN', 'RDDT', 'WOLF', 'ASTS', 'RKLB',
  'KRKNF', 'NOK', 'WYFI', 'URNM', 'COPX',
  'LIT', 'TLT', 'QQQ', 'SPY', 'IBIT', 'PURR',
];

const args = process.argv.slice(2);
const tickerFilter = args.includes('--ticker') ? args[args.indexOf('--ticker') + 1] : null;
const NO_CACHE = args.includes('--no-cache');
const tickers = tickerFilter ? [tickerFilter.toUpperCase()] : ALL_TICKERS;

// Portfolio prices from 2026-05-12 snapshot
const PORTFOLIO_PRICES: Record<string, number> = {
  AMZN: 265.82, ASTS: 72.96, COPX: 90.77, IBIT: 45.80,
  KRKNF: 4.98, LIT: 89.47, MSFT: 407.77, NOK: 13.17,
  NVDA: 220.78, PURR: 6.25, QQQ: 707.24, RDDT: 152.35,
  RKLB: 117.56, SPY: 738.18, TLT: 84.99, URNM: 65.50,
  WOLF: 53.72, WYFI: 26.09, AAPL: 201.57, GOOGL: 157.29, META: 546.35,
};

let lastRequest = 0;
async function fmpGet<T>(path: string): Promise<T> {
  const now = Date.now();
  const wait = RATE_MS - (now - lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}apikey=${API_KEY}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'gbrain-evals/1.0' } });
  if (!res.ok) throw new Error(`FMP ${res.status}: ${url}`);
  return res.json() as T;
}

// FMP v4 price-target-summary returns a flat object, not nested buckets
type TargetSummary = {
  symbol: string;
  lastMonth: number;              // count of estimates in last month
  lastMonthAvgPriceTarget: number;
  lastQuarter: number;
  lastQuarterAvgPriceTarget: number;
  lastYear: number;
  lastYearAvgPriceTarget: number;
  allTime: number;
  allTimeAvgPriceTarget: number;
  publishers: string;
};
type TargetItem = {
  publishedDate: string; newsTitle: string; newsPublisher: string;
  analystName: string; analystCompany: string;
  priceTarget: number; adjPriceTarget: number; priceWhenPosted: number;
};

function pct(a: number, b: number): string {
  if (!b) return 'N/A';
  const p = ((a - b) / Math.abs(b)) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

mkdirSync(OUT_DIR, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
let written = 0, skipped = 0, nodata = 0;

for (const ticker of tickers) {
  const outPath = join(OUT_DIR, `${ticker}.json`);
  if (!NO_CACHE && existsSync(outPath)) {
    console.log(`  [skip] ${ticker}`);
    skipped++;
    continue;
  }

  try {
    // Note: BASE already includes /api, so paths start at /v4/
    const summaryArr = await fmpGet<TargetSummary[]>(`/v4/price-target-summary?symbol=${ticker}`);
    const recentArr  = await fmpGet<TargetItem[]>(`/v4/price-target?symbol=${ticker}&limit=8`);

    const summary = summaryArr?.[0];
    const recent = recentArr ?? [];

    const hasAnyCoverage = summary?.lastYear > 0 || recent.length > 0;
    if (!hasAnyCoverage) {
      console.log(`  [nodata] ${ticker}`);
      nodata++;
      continue;
    }

    const portfolioPrice = PORTFOLIO_PRICES[ticker];
    // Prefer most recent month, fall back to quarter, then year
    const consensusTarget = summary?.lastMonthAvgPriceTarget
      || summary?.lastQuarterAvgPriceTarget
      || summary?.lastYearAvgPriceTarget
      || null;
    const consensusCount = summary?.lastMonth || summary?.lastQuarter || summary?.lastYear || 0;
    const consensusPeriod = summary?.lastMonth
      ? 'Last Month'
      : summary?.lastQuarter ? 'Last Quarter' : 'Last Year';

    let ct = `${ticker} — Analyst Price Targets (as of ${today})\n\n`;

    if (consensusTarget) {
      ct += `CONSENSUS (${consensusPeriod} — ${consensusCount} estimate${consensusCount !== 1 ? 's' : ''})\n`;
      ct += `  Avg Price Target:    $${consensusTarget.toFixed(2)}\n`;
      if (summary?.lastYearAvgPriceTarget && consensusPeriod !== 'Last Year') {
        ct += `  Last Year Avg:       $${summary.lastYearAvgPriceTarget.toFixed(2)}  (${summary.lastYear} estimates)\n`;
      }
    }

    if (recent.length > 0) {
      ct += `\nRECENT INDIVIDUAL TARGETS\n`;
      for (const r of recent.slice(0, 6)) {
        const date = r.publishedDate?.slice(0, 10) ?? '';
        const firm = r.analystCompany ?? '';
        const analyst = r.analystName ? ` (${r.analystName})` : '';
        const upside = r.priceWhenPosted ? `  [stock at $${r.priceWhenPosted.toFixed(2)} when posted, ${pct(r.priceTarget, r.priceWhenPosted)} vs post price]` : '';
        ct += `  ${date}  ${firm}${analyst}:  $${r.priceTarget?.toFixed(2)}${upside}\n`;
      }
    }

    if (portfolioPrice && consensusTarget) {
      const upsidePct = pct(consensusTarget, portfolioPrice);
      const exceeded = consensusTarget < portfolioPrice;
      const label = exceeded
        ? `↓ ABOVE consensus — target already exceeded by ${pct(portfolioPrice, consensusTarget)}`
        : `↑ BELOW consensus — ${upsidePct} upside remaining`;
      ct += `\nPORTFOLIO CONTEXT (snapshot 2026-05-12)\n`;
      ct += `  Portfolio mark:     $${portfolioPrice.toFixed(2)}\n`;
      ct += `  Consensus target:   $${consensusTarget.toFixed(2)}\n`;
      ct += `  Status:             ${label}\n`;
    }

    const page: FinancePage = {
      slug: `analyst-estimates/${ticker}`,
      type: 'market-data',
      source_type: 'market-data',
      title: `${ticker} Analyst Price Targets — ${today}`,
      url: `https://financialmodelingprep.com/financial-summary/${ticker}`,
      published_at: new Date().toISOString(),
      compiled_truth: ct,
      companies_mentioned: [ticker],
      quarter_context: {},
      _facts: { ticker, summary: summary ?? null, recentTargets: recent.slice(0, 8) },
    };

    writeFileSync(outPath, JSON.stringify(page, null, 2));
    const tag = portfolioPrice && consensusTarget
      ? (consensusTarget < portfolioPrice
          ? `EXCEEDED by ${((portfolioPrice - consensusTarget) / consensusTarget * 100).toFixed(1)}%`
          : `+${((consensusTarget - portfolioPrice) / portfolioPrice * 100).toFixed(1)}% upside`)
      : 'no portfolio price';
    console.log(`  [ok] ${ticker.padEnd(8)} target $${consensusTarget?.toFixed(2) ?? 'N/A'}  [${tag}]`);
    written++;

  } catch (err) {
    console.error(`  [err] ${ticker}:`, (err as Error).message);
  }
}

console.log(`\nDone: ${written} written, ${skipped} cached, ${nodata} no coverage`);
