#!/usr/bin/env bun
/**
 * IBKR Flex Web Service scraper — fetches open positions via Flex query
 * and writes a portfolio FinancePage to eval/data/financebrain-v1/portfolio/.
 *
 * Usage:
 *   bun eval/scrapers/ibkr.ts
 *
 * Env vars:
 *   IBKR_FLEX_TOKEN   — Flex service token
 *   IBKR_FLEX_QUERY_ID — Flex query ID configured in Account Management
 *
 * Output: eval/data/financebrain-v1/portfolio/holdings-<date>.json
 *         eval/data/financebrain-v1/portfolio/latest.json  (symlink-like copy)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getQuarterContext } from './earnings-calendar.ts';
import type { FinancePage } from './types.ts';

const TOKEN = process.env.IBKR_FLEX_TOKEN;
const QUERY_ID = process.env.IBKR_FLEX_QUERY_ID;
if (!TOKEN || !QUERY_ID) {
  console.error('IBKR_FLEX_TOKEN and IBKR_FLEX_QUERY_ID env vars required');
  process.exit(1);
}

const OUT_DIR = 'eval/data/financebrain-v1/portfolio';
const SEND_URL = 'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest';
const GET_URL  = 'https://gdcdyn.interactivebrokers.com/AccountManagement/FlexWebService/GetStatement';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Flex API ──────────────────────────────────────────────────────────────────

async function requestReport(): Promise<{ refCode: string; getUrl: string }> {
  const res = await fetch(`${SEND_URL}?t=${TOKEN}&q=${QUERY_ID}&v=3`);
  const xml = await res.text();
  const code = xml.match(/<ReferenceCode>(\d+)<\/ReferenceCode>/)?.[1];
  const url  = xml.match(/<Url>(https?:\/\/[^<]+)<\/Url>/)?.[1];
  if (!code) throw new Error(`No ReferenceCode in: ${xml}`);
  return { refCode: code, getUrl: url ?? GET_URL };
}

async function downloadReport(refCode: string, getUrl: string): Promise<string> {
  // IBKR asks to wait a few seconds before fetching
  await sleep(3000);
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(`${getUrl}?t=${TOKEN}&q=${refCode}&v=3`);
    const xml = await res.text();
    if (xml.includes('<Status>')) {
      const status = xml.match(/<Status>([^<]+)<\/Status>/)?.[1];
      if (status === 'Statement generation in progress') {
        console.log(`  Still generating... (attempt ${attempt + 1})`);
        await sleep(5000);
        continue;
      }
    }
    if (xml.includes('<OpenPosition')) return xml;
    throw new Error(`Unexpected response: ${xml.slice(0, 300)}`);
  }
  throw new Error('Report did not generate after 10 attempts');
}

// ── XML parser ────────────────────────────────────────────────────────────────

type Position = {
  symbol: string;
  description: string;
  assetCategory: string;
  subCategory: string;
  currency: string;
  fxRateToBase: number;
  position: number;
  markPrice: number;
  positionValue: number;
  openPrice: number;
  costBasisMoney: number;
  percentOfNAV: number;
  fifoPnlUnrealized: number;
  side: string;
  expiry?: string;
  strike?: string;
  putCall?: string;
  underlyingSymbol?: string;
  reportDate: string;
  listingExchange: string;
};

function parsePositions(xml: string): { positions: Position[]; meta: { accountId: string; reportDate: string; fromDate: string; toDate: string } } {
  const metaMatch = xml.match(/<FlexStatement accountId="([^"]+)" fromDate="([^"]+)" toDate="([^"]+)"/);
  const meta = {
    accountId: metaMatch?.[1] ?? '',
    reportDate: metaMatch?.[3] ?? '',
    fromDate: metaMatch?.[2] ?? '',
    toDate: metaMatch?.[3] ?? '',
  };

  const positions: Position[] = [];
  const re = /<OpenPosition ([^/]+)\/>/g;
  let m: RegExpExecArray | null;

  function attr(attrs: string, name: string): string {
    const m = attrs.match(new RegExp(`${name}="([^"]*)"`));
    return m ? m[1] : '';
  }
  function num(attrs: string, name: string): number {
    return parseFloat(attr(attrs, name)) || 0;
  }

  while ((m = re.exec(xml)) !== null) {
    const a = m[1];
    positions.push({
      symbol:           attr(a, 'symbol'),
      description:      attr(a, 'description'),
      assetCategory:    attr(a, 'assetCategory'),
      subCategory:      attr(a, 'subCategory'),
      currency:         attr(a, 'currency'),
      fxRateToBase:     num(a, 'fxRateToBase'),
      position:         num(a, 'position'),
      markPrice:        num(a, 'markPrice'),
      positionValue:    num(a, 'positionValue'),
      openPrice:        num(a, 'openPrice'),
      costBasisMoney:   num(a, 'costBasisMoney'),
      percentOfNAV:     num(a, 'percentOfNAV'),
      fifoPnlUnrealized:num(a, 'fifoPnlUnrealized'),
      side:             attr(a, 'side'),
      expiry:           attr(a, 'expiry') || undefined,
      strike:           attr(a, 'strike') || undefined,
      putCall:          attr(a, 'putCall') || undefined,
      underlyingSymbol: attr(a, 'underlyingSymbol') || undefined,
      reportDate:       attr(a, 'reportDate'),
      listingExchange:  attr(a, 'listingExchange'),
    });
  }

  return { positions, meta };
}

// ── Page builder ──────────────────────────────────────────────────────────────

const TARGET_TICKERS = new Set(['NVDA', 'MSFT', 'GOOGL', 'GOOG', 'META', 'AAPL', 'AMZN']);

function buildPortfolioPage(positions: Position[], meta: { accountId: string; reportDate: string }): FinancePage {
  const reportDate = meta.reportDate
    ? `${meta.reportDate.slice(0,4)}-${meta.reportDate.slice(4,6)}-${meta.reportDate.slice(6,8)}`
    : new Date().toISOString().slice(0,10);
  const publishedAt = new Date(reportDate);

  // Separate by category
  const stocks   = positions.filter(p => p.assetCategory === 'STK' && p.side === 'Long');
  const shorts   = positions.filter(p => p.assetCategory === 'STK' && p.side === 'Short');
  const options  = positions.filter(p => p.assetCategory === 'OPT');

  // Total portfolio value (USD equivalent)
  const navUSD = stocks.reduce((s, p) => s + p.positionValue * p.fxRateToBase, 0)
               + shorts.reduce((s, p) => s + Math.abs(p.positionValue) * p.fxRateToBase, 0);

  const totalUnrealizedPnl = positions.reduce((s, p) => s + p.fifoPnlUnrealized * p.fxRateToBase, 0);

  function posLine(p: Position): string {
    const valueUSD = (p.positionValue * p.fxRateToBase).toFixed(0);
    const pnl = (p.fifoPnlUnrealized * p.fxRateToBase).toFixed(0);
    const pnlStr = parseFloat(pnl) >= 0 ? `+$${pnl}` : `-$${Math.abs(parseFloat(pnl))}`;
    const nav = p.percentOfNAV.toFixed(1);
    const ccy = p.currency !== 'USD' ? ` (${p.currency})` : '';
    return `  ${p.symbol.padEnd(8)} ${p.description.slice(0,30).padEnd(30)} ${String(p.position).padStart(6)} @ $${p.markPrice.toFixed(2).padStart(8)}  value=$${valueUSD}  NAV=${nav}%  P&L=${pnlStr}${ccy}`;
  }

  function optLine(p: Position): string {
    const valueUSD = (p.positionValue * p.fxRateToBase).toFixed(0);
    const pnl = (p.fifoPnlUnrealized * p.fxRateToBase).toFixed(0);
    const pnlStr = parseFloat(pnl) >= 0 ? `+$${pnl}` : `-$${Math.abs(parseFloat(pnl))}`;
    return `  ${p.symbol.padEnd(28)} ${String(p.position).padStart(4)} @ $${p.markPrice.toFixed(3).padStart(7)}  value=$${valueUSD}  P&L=${pnlStr}`;
  }

  const compiled_truth = `Portfolio Holdings — ${reportDate}
Account: ${meta.accountId}

LONG EQUITY POSITIONS
${'─'.repeat(90)}
${'Symbol'.padEnd(8)} ${'Description'.padEnd(30)} ${'Shares'.padStart(6)}   ${'Price'.padStart(8)}  Value       NAV%    P&L
${stocks.map(posLine).join('\n')}

SHORT EQUITY POSITIONS
${'─'.repeat(90)}
${shorts.map(posLine).join('\n')}

OPTIONS POSITIONS
${'─'.repeat(90)}
${'Contract'.padEnd(28)} ${'Qty'.padStart(4)}   ${'Price'.padStart(7)}  Value       P&L
${options.map(optLine).join('\n')}

SUMMARY
${'─'.repeat(60)}
Total long equity positions:  ${stocks.length}
Total short positions:        ${shorts.length}
Total options positions:      ${options.length}
Gross portfolio value (USD):  $${navUSD.toFixed(0)}
Total unrealized P&L (USD):   ${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(0)}`;

  // Build quarter context for target tickers held in portfolio
  const heldTargets = positions
    .filter(p => TARGET_TICKERS.has(p.symbol.split(' ')[0]))
    .map(p => p.symbol.split(' ')[0]);
  const uniqueTargets = [...new Set(heldTargets)];
  const qctx: Record<string, ReturnType<typeof getQuarterContext>> = {};
  for (const ticker of uniqueTargets) {
    const qc = getQuarterContext(ticker, publishedAt);
    if (qc) qctx[ticker] = qc;
  }

  return {
    slug: `portfolio/holdings-${reportDate}`,
    type: 'portfolio',
    source_type: 'portfolio',
    title: `Portfolio Holdings — ${reportDate}`,
    url: 'https://www.interactivebrokers.com',
    published_at: publishedAt.toISOString(),
    compiled_truth,
    companies_mentioned: uniqueTargets,
    quarter_context: qctx,
    _facts: {
      report_date: reportDate,
      account_id: meta.accountId,
      positions: positions.map(p => ({
        symbol: p.symbol,
        description: p.description,
        asset_category: p.assetCategory,
        sub_category: p.subCategory,
        side: p.side,
        quantity: p.position,
        mark_price: p.markPrice,
        position_value_usd: parseFloat((p.positionValue * p.fxRateToBase).toFixed(2)),
        cost_basis_usd: parseFloat((p.costBasisMoney * p.fxRateToBase).toFixed(2)),
        unrealized_pnl_usd: parseFloat((p.fifoPnlUnrealized * p.fxRateToBase).toFixed(2)),
        pct_of_nav: p.percentOfNAV,
        currency: p.currency,
        exchange: p.listingExchange,
        expiry: p.expiry,
        strike: p.strike,
        put_call: p.putCall,
        underlying: p.underlyingSymbol,
      })),
    },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('Requesting IBKR Flex report...');
  const { refCode, getUrl } = await requestReport();
  console.log(`  Reference code: ${refCode}`);

  console.log('Downloading report...');
  const xml = await downloadReport(refCode, getUrl);

  const { positions, meta } = parsePositions(xml);
  console.log(`  Parsed ${positions.length} positions for account ${meta.accountId}`);

  const page = buildPortfolioPage(positions, meta);

  const reportDate = meta.reportDate
    ? `${meta.reportDate.slice(0,4)}-${meta.reportDate.slice(4,6)}-${meta.reportDate.slice(6,8)}`
    : new Date().toISOString().slice(0,10);

  const outPath = join(OUT_DIR, `holdings-${reportDate}.json`);
  writeFileSync(outPath, JSON.stringify(page, null, 2));

  // Also write as latest.json for easy access
  writeFileSync(join(OUT_DIR, 'latest.json'), JSON.stringify(page, null, 2));

  console.log(`\nSaved: ${outPath}`);
  console.log('Also saved: eval/data/financebrain-v1/portfolio/latest.json');

  // Print summary
  const stocks = positions.filter(p => p.assetCategory === 'STK' && p.side === 'Long');
  const shorts = positions.filter(p => p.assetCategory === 'STK' && p.side === 'Short');
  const opts   = positions.filter(p => p.assetCategory === 'OPT');
  console.log(`\nLong: ${stocks.length}  Short: ${shorts.length}  Options: ${opts.length}`);
  const targets = stocks.filter(p => TARGET_TICKERS.has(p.symbol));
  if (targets.length) {
    console.log('Target company positions:');
    for (const p of targets) {
      console.log(`  ${p.symbol}: ${p.position} shares @ $${p.markPrice} = $${(p.positionValue).toFixed(0)} (${p.percentOfNAV.toFixed(1)}% NAV)`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
