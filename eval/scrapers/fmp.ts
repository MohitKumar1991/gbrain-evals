#!/usr/bin/env bun
/**
 * Financial Modeling Prep scraper for FinanceBrain corpus.
 *
 * Downloads per-quarter financial statements (income, balance sheet, cash flow),
 * earnings call transcripts, quarterly price summaries, and full daily price
 * history for NVDA, MSFT, GOOGL, META, AAPL — covering 2022 through today.
 *
 * Each data type becomes a FinancePage JSON with a human-readable compiled_truth
 * field that gets indexed into gbrain, plus _facts containing the raw numbers.
 *
 * Usage:
 *   bun eval/scrapers/fmp.ts                  # full download
 *   bun eval/scrapers/fmp.ts --ticker NVDA    # one ticker only
 *   bun eval/scrapers/fmp.ts --no-cache       # re-fetch all
 *   bun eval/scrapers/fmp.ts --dry-run        # print what would be fetched
 *
 * Output layout:
 *   eval/data/financebrain-v1/financials/<TICKER>-<period-date>.json
 *   eval/data/financebrain-v1/transcripts/<TICKER>-<year>-Q<q>.json
 *   eval/data/financebrain-v1/price/<TICKER>-quarterly-<year>-Q<q>.json
 *   eval/data/financebrain-v1/price/<TICKER>-daily-history.json
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getQuarterContext } from './earnings-calendar.ts';
import { loadTradingDays } from './trading-days.ts';
import type { FinancePage } from './types.ts';

// ── Config ─────────────────────────────────────────────────────────────────────

const API_KEY = process.env.FMP_API_KEY;
if (!API_KEY) { console.error('FMP_API_KEY env var required'); process.exit(1); }
const BASE = 'https://financialmodelingprep.com/api';
const RATE_MS = 300;  // 300ms between calls → ~200 req/min, well within limits
const TICKERS = ['NVDA', 'MSFT', 'GOOGL', 'META', 'AAPL'];
const FROM_DATE = '2022-01-01';
const TO_DATE = new Date().toISOString().slice(0, 10);
const FROM_YEAR = 2022;
const TO_YEAR = new Date().getFullYear();

const DIRS = {
  financials: 'eval/data/financebrain-v1/financials',
  transcripts: 'eval/data/financebrain-v1/transcripts',
  price: 'eval/data/financebrain-v1/price',
};

const TRADING_DAYS = loadTradingDays(DIRS.price);

// ── CLI ────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const tickerFilter = args.includes('--ticker') ? args[args.indexOf('--ticker') + 1] : null;
const NO_CACHE = args.includes('--no-cache');
const DRY_RUN = args.includes('--dry-run');
const tickers = tickerFilter ? [tickerFilter.toUpperCase()] : TICKERS;

// ── Helpers ───────────────────────────────────────────────────────────────────

let lastRequest = 0;
async function fmpGet<T>(path: string): Promise<T> {
  const now = Date.now();
  const wait = RATE_MS - (now - lastRequest);
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();

  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}apikey=${API_KEY!}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'gbrain-evals/1.0' } });
  if (!res.ok) throw new Error(`FMP ${res.status}: ${url}`);
  return res.json() as T;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function fmt(n: number | null | undefined, unit: 'B' | 'M' | '%' | '' = 'B'): string {
  if (n == null || n === 0) return 'N/A';
  if (unit === 'B') return `$${(n / 1e9).toFixed(2)}B`;
  if (unit === 'M') return `$${(n / 1e6).toFixed(0)}M`;
  if (unit === '%') return `${(n * 100).toFixed(1)}%`;
  return n.toFixed(2);
}

function pct(a: number, b: number): string {
  if (!b) return 'N/A';
  const p = ((a - b) / Math.abs(b)) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

function arrow(a: number, b: number): string {
  return a >= b ? '↑' : '↓';
}

function saved(path: string): boolean {
  return !NO_CACHE && existsSync(path);
}

function savePage(outPath: string, page: FinancePage) {
  if (DRY_RUN) { console.log(`  [dry-run] would write ${outPath}`); return; }
  writeFileSync(outPath, JSON.stringify(page, null, 2));
}

function quarterLabel(date: string, period: string, calendarYear: string): string {
  return `${period} CY${calendarYear} (period ending ${date})`;
}

// ── FMP types (abbreviated) ───────────────────────────────────────────────────

type IncomeStatement = {
  date: string; symbol: string; period: string; calendarYear: string;
  fillingDate: string; revenue: number; costOfRevenue: number;
  grossProfit: number; grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  operatingIncome: number; operatingIncomeRatio: number;
  ebitda: number; ebitdaratio: number;
  netIncome: number; netIncomeRatio: number;
  eps: number; epsdiluted: number;
  weightedAverageShsOutDil: number;
};

type BalanceSheet = {
  date: string; symbol: string; period: string; calendarYear: string;
  cashAndCashEquivalents: number; cashAndShortTermInvestments: number;
  totalCurrentAssets: number; totalNonCurrentAssets: number; totalAssets: number;
  totalCurrentLiabilities: number; longTermDebt: number; totalDebt: number;
  netDebt: number; totalStockholdersEquity: number; totalLiabilities: number;
  goodwillAndIntangibleAssets: number; inventory: number;
  capitalLeaseObligations: number;
};

type CashFlow = {
  date: string; symbol: string; period: string; calendarYear: string;
  netCashProvidedByOperatingActivities: number;
  capitalExpenditure: number; freeCashFlow: number;
  commonStockRepurchased: number; dividendsPaid: number;
  stockBasedCompensation: number; depreciationAndAmortization: number;
  acquisitionsNet: number;
};

type Transcript = {
  symbol: string; quarter: number; year: number; date: string; content: string;
};

type PriceDay = {
  date: string; open: number; high: number; low: number;
  close: number; adjClose: number; volume: number; changePercent: number;
};

// ── Financials page builder ───────────────────────────────────────────────────

function buildFinancialsPage(
  inc: IncomeStatement,
  bal: BalanceSheet,
  cf: CashFlow,
  prevInc: IncomeStatement | null,  // same quarter, prior year (for YoY)
  prevQInc: IncomeStatement | null, // prior quarter (for QoQ)
): FinancePage {
  const ticker = inc.symbol;
  const label = quarterLabel(inc.date, inc.period, inc.calendarYear);
  const publishedAt = new Date(inc.fillingDate || inc.date);

  const yoyRev = prevInc ? pct(inc.revenue, prevInc.revenue) : 'N/A';
  const qoqRev = prevQInc ? pct(inc.revenue, prevQInc.revenue) : 'N/A';
  const yoyOI  = prevInc ? pct(inc.operatingIncome, prevInc.operatingIncome) : 'N/A';
  const yoyNI  = prevInc ? pct(inc.netIncome, prevInc.netIncome) : 'N/A';

  const netDebtStr = bal.netDebt < 0
    ? `Net Cash: ${fmt(-bal.netDebt)}`
    : `Net Debt: ${fmt(bal.netDebt)}`;

  const compiled_truth = `${ticker} — ${label}
Filed: ${inc.fillingDate}

INCOME STATEMENT
Revenue:          ${fmt(inc.revenue)}   (YoY ${arrow(inc.revenue, prevInc?.revenue ?? inc.revenue)} ${yoyRev}, QoQ ${arrow(inc.revenue, prevQInc?.revenue ?? inc.revenue)} ${qoqRev})
Gross Profit:     ${fmt(inc.grossProfit)}   Gross Margin: ${fmt(inc.grossProfitRatio, '%')}
Operating Income: ${fmt(inc.operatingIncome)}   Operating Margin: ${fmt(inc.operatingIncomeRatio, '%')}   (YoY ${yoyOI})
EBITDA:           ${fmt(inc.ebitda)}   EBITDA Margin: ${fmt(inc.ebitdaratio, '%')}
Net Income:       ${fmt(inc.netIncome)}   Net Margin: ${fmt(inc.netIncomeRatio, '%')}   (YoY ${yoyNI})
EPS (Diluted):    $${inc.epsdiluted?.toFixed(2) ?? 'N/A'}
Diluted Shares:   ${inc.weightedAverageShsOutDil ? (inc.weightedAverageShsOutDil / 1e9).toFixed(2) + 'B' : 'N/A'}

Expenses:
  R&D:            ${fmt(inc.researchAndDevelopmentExpenses)}
  SG&A:           ${fmt(inc.sellingGeneralAndAdministrativeExpenses)}

BALANCE SHEET (as of ${bal.date})
Cash & ST Investments: ${fmt(bal.cashAndShortTermInvestments)}
Total Assets:          ${fmt(bal.totalAssets)}
Total Debt:            ${fmt(bal.totalDebt)}
${netDebtStr}
Goodwill & Intangibles:${fmt(bal.goodwillAndIntangibleAssets)}
Total Equity:          ${fmt(bal.totalStockholdersEquity)}

CASH FLOW
Operating Cash Flow:   ${fmt(cf.netCashProvidedByOperatingActivities)}
Capital Expenditures:  ${fmt(cf.capitalExpenditure)}
Free Cash Flow:        ${fmt(cf.freeCashFlow)}
Stock Buybacks:        ${fmt(cf.commonStockRepurchased)}
Dividends Paid:        ${fmt(cf.dividendsPaid)}
Stock-Based Comp:      ${fmt(cf.stockBasedCompensation)}
${cf.acquisitionsNet ? `Acquisitions (net):    ${fmt(cf.acquisitionsNet)}` : ''}`.trim();

  const publishedDate = publishedAt;
  const qc = getQuarterContext(ticker, publishedDate, TRADING_DAYS);

  return {
    slug: `financials/${ticker}-${inc.date}`,
    type: 'filing',
    source_type: inc.period === 'FY' ? 'sec-10k' : 'sec-10q',
    title: `${ticker} ${label} Financial Results`,
    url: inc.fillingDate
      ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-Q`
      : '',
    published_at: publishedAt.toISOString(),
    compiled_truth,
    companies_mentioned: [ticker],
    quarter_context: qc ? { [ticker]: qc } : {},
    _facts: {
      ticker,
      period: inc.period,
      calendar_year: inc.calendarYear,
      period_date: inc.date,
      filing_date: inc.fillingDate,
      income_statement: inc,
      balance_sheet: bal,
      cash_flow: cf,
    },
  };
}

// ── Transcript page builder ───────────────────────────────────────────────────

function buildTranscriptPage(t: Transcript): FinancePage {
  const ticker = t.symbol;
  const calDate = new Date(t.date);
  const qc = getQuarterContext(ticker, calDate, TRADING_DAYS);

  // Add a header so retrieval context is clear
  const header = `${ticker} Earnings Call Transcript — Q${t.quarter} ${t.year}
Call date: ${t.date}
\n`;

  return {
    slug: `transcripts/${ticker}-${t.year}-Q${t.quarter}`,
    type: 'filing',
    source_type: 'sec-10q',
    title: `${ticker} Q${t.quarter} ${t.year} Earnings Call Transcript`,
    url: '',
    published_at: calDate.toISOString(),
    compiled_truth: header + t.content,
    companies_mentioned: [ticker],
    quarter_context: qc ? { [ticker]: qc } : {},
    _facts: { ticker, quarter: t.quarter, year: t.year, call_date: t.date },
  };
}

// ── Price pages ───────────────────────────────────────────────────────────────

function buildQuarterlyPricePage(
  ticker: string,
  days: PriceDay[],
  quarterLabel: string,
): FinancePage | null {
  if (days.length === 0) return null;

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const high = sorted.reduce((m, d) => d.high > m.high ? d : m, sorted[0]);
  const low = sorted.reduce((m, d) => d.low < m.low ? d : m, sorted[0]);
  const quarterReturn = ((last.close - first.open) / first.open) * 100;
  const avgVol = days.reduce((s, d) => s + d.volume, 0) / days.length;

  const compiled_truth = `${ticker} Stock Price — ${quarterLabel}
Period: ${first.date} to ${last.date}  (${days.length} trading days)

Quarter Open:  $${first.open.toFixed(2)}
Quarter Close: $${last.close.toFixed(2)}
Quarter Return: ${quarterReturn >= 0 ? '+' : ''}${quarterReturn.toFixed(2)}%

Period High: $${high.high.toFixed(2)} (${high.date})
Period Low:  $${low.low.toFixed(2)} (${low.date})

Avg Daily Volume: ${(avgVol / 1e6).toFixed(1)}M shares

Daily closes (${first.date} → ${last.date}):
${sorted.map(d => `  ${d.date}: $${d.close.toFixed(2)} (${d.changePercent >= 0 ? '+' : ''}${d.changePercent.toFixed(2)}%)`).join('\n')}`;

  const publishedAt = new Date(last.date);
  const qc = getQuarterContext(ticker, publishedAt, TRADING_DAYS);

  return {
    slug: `price/${ticker}-${quarterLabel.replace(/\s+/g, '-')}`,
    type: 'price-data',
    source_type: 'price',
    title: `${ticker} Price Data — ${quarterLabel}`,
    url: `https://financialmodelingprep.com/financial-charts/${ticker}`,
    published_at: publishedAt.toISOString(),
    compiled_truth,
    companies_mentioned: [ticker],
    quarter_context: qc ? { [ticker]: qc } : {},
    _facts: { ticker, quarter_label: quarterLabel, days: sorted },
  };
}

function buildFullPriceHistoryPage(ticker: string, days: PriceDay[]): FinancePage {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  // Monthly OHLCV summary
  const byMonth: Record<string, PriceDay[]> = {};
  for (const d of sorted) {
    const mo = d.date.slice(0, 7); // YYYY-MM
    (byMonth[mo] ??= []).push(d);
  }

  const monthLines = Object.entries(byMonth).map(([mo, mdays]) => {
    const open = mdays[0].open;
    const close = mdays[mdays.length - 1].close;
    const hi = Math.max(...mdays.map(d => d.high));
    const lo = Math.min(...mdays.map(d => d.low));
    const ret = ((close - open) / open) * 100;
    const vol = mdays.reduce((s, d) => s + d.volume, 0) / mdays.length;
    return `  ${mo}: O=$${open.toFixed(2)} H=$${hi.toFixed(2)} L=$${lo.toFixed(2)} C=$${close.toFixed(2)} Ret=${ret >= 0 ? '+' : ''}${ret.toFixed(1)}% AvgVol=${(vol / 1e6).toFixed(0)}M`;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalReturn = ((last.close - first.open) / first.open) * 100;

  const compiled_truth = `${ticker} Complete Daily Price History — ${first.date} to ${last.date}

Total period return: ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}% ($${first.open.toFixed(2)} → $${last.close.toFixed(2)})
All-time high (this period): $${Math.max(...sorted.map(d => d.high)).toFixed(2)}
All-time low (this period):  $${Math.min(...sorted.map(d => d.low)).toFixed(2)}

Monthly Summary (Open / High / Low / Close / Return / AvgVol):
${monthLines.join('\n')}`;

  return {
    slug: `price/${ticker}-daily-history`,
    type: 'price-data',
    source_type: 'price',
    title: `${ticker} Full Daily Price History`,
    url: `https://financialmodelingprep.com/financial-charts/${ticker}`,
    published_at: new Date().toISOString(),
    compiled_truth,
    companies_mentioned: [ticker],
    quarter_context: {},
    _facts: { ticker, from: first.date, to: last.date, days: sorted },
  };
}

// ── Calendar quarter splitter for price data ──────────────────────────────────

function calendarQuarterLabel(date: string): string {
  const d = new Date(date);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `CY${d.getFullYear()}-Q${q}`;
}

// ── Per-ticker download ───────────────────────────────────────────────────────

async function downloadTicker(ticker: string) {
  console.log(`\n── ${ticker} ─────────────────────────────`);

  // 1. Financial statements (income, balance, cash flow)
  console.log('  Fetching income statements...');
  const incomes = await fmpGet<IncomeStatement[]>(
    `/v3/income-statement/${ticker}?period=quarter&limit=24`,
  );
  console.log(`  Fetching balance sheets...`);
  const balances = await fmpGet<BalanceSheet[]>(
    `/v3/balance-sheet-statement/${ticker}?period=quarter&limit=24`,
  );
  console.log(`  Fetching cash flows...`);
  const cashflows = await fmpGet<CashFlow[]>(
    `/v3/cash-flow-statement/${ticker}?period=quarter&limit=24`,
  );

  // Filter to FROM_YEAR+
  const incFiltered = incomes.filter(i => parseInt(i.calendarYear) >= FROM_YEAR);
  const balMap = new Map(balances.map(b => [b.date, b]));
  const cfMap = new Map(cashflows.map(c => [c.date, c]));

  // Build per-quarter pages
  let financialsWritten = 0;
  for (let i = 0; i < incFiltered.length; i++) {
    const inc = incFiltered[i];
    const bal = balMap.get(inc.date);
    const cf = cfMap.get(inc.date);
    if (!bal || !cf) { console.warn(`  WARN: missing bal/cf for ${ticker} ${inc.date}`); continue; }

    const outPath = join(DIRS.financials, `${ticker}-${inc.date}.json`);
    if (saved(outPath)) continue;

    // For YoY, look for same period ~4 quarters back
    const prevInc = incFiltered.find((x, j) => j > i && x.period === inc.period) ?? null;
    const prevQInc = incFiltered[i + 1] ?? null;

    const page = buildFinancialsPage(inc, bal, cf, prevInc, prevQInc);
    savePage(outPath, page);
    financialsWritten++;
  }
  console.log(`  Financials: ${financialsWritten} pages written, ${incFiltered.length - financialsWritten} skipped.`);

  // 2. Earnings call transcripts
  console.log('  Fetching transcripts...');
  let transcriptsWritten = 0;
  for (let year = FROM_YEAR; year <= TO_YEAR; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      const outPath = join(DIRS.transcripts, `${ticker}-${year}-Q${quarter}.json`);
      if (saved(outPath)) continue;

      try {
        const results = await fmpGet<Transcript[]>(
          `/v3/earning_call_transcript/${ticker}?quarter=${quarter}&year=${year}`,
        );
        if (!results || results.length === 0 || !results[0].content) continue;
        const page = buildTranscriptPage(results[0]);
        savePage(outPath, page);
        transcriptsWritten++;
      } catch {
        // Quarter doesn't exist yet — normal for future quarters
      }
    }
  }
  console.log(`  Transcripts: ${transcriptsWritten} pages written.`);

  // 3. Historical price data
  console.log('  Fetching daily price history...');
  const histPath = join(DIRS.price, `${ticker}-daily-history.json`);
  let allDays: PriceDay[] = [];

  if (!saved(histPath)) {
    const hist = await fmpGet<{ symbol: string; historical: PriceDay[] }>(
      `/v3/historical-price-full/${ticker}?from=${FROM_DATE}&to=${TO_DATE}`,
    );
    allDays = hist.historical ?? [];
    savePage(histPath, buildFullPriceHistoryPage(ticker, allDays));
    console.log(`  Price history: ${allDays.length} days written.`);
  } else {
    // Load existing to build quarterly pages
    const existing = JSON.parse(require('fs').readFileSync(histPath, 'utf8')) as FinancePage;
    allDays = (existing._facts as { days: PriceDay[] }).days ?? [];
    console.log(`  Price history: already downloaded (${allDays.length} days).`);
  }

  // 4. Quarterly price summary pages
  const byQuarter = new Map<string, PriceDay[]>();
  for (const day of allDays) {
    const ql = calendarQuarterLabel(day.date);
    (byQuarter.get(ql) ?? byQuarter.set(ql, []).get(ql)!).push(day);
  }

  let priceQWritten = 0;
  for (const [ql, days] of byQuarter) {
    const outPath = join(DIRS.price, `${ticker}-${ql}.json`);
    if (saved(outPath)) continue;
    const page = buildQuarterlyPricePage(ticker, days, ql);
    if (page) { savePage(outPath, page); priceQWritten++; }
  }
  console.log(`  Quarterly price pages: ${priceQWritten} written.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  for (const dir of Object.values(DIRS)) mkdirSync(dir, { recursive: true });

  for (const ticker of tickers) {
    try {
      await downloadTicker(ticker);
    } catch (err) {
      console.error(`ERROR on ${ticker}:`, err);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
