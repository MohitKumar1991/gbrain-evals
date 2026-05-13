#!/usr/bin/env bun
/**
 * SEC EDGAR scraper — downloads 10-K, 10-Q, and 8-K filings for target tickers.
 *
 * For 10-K/10-Q: extracts Item 1 (Business), Item 1A (Risk Factors), and
 * Item 2/7 (MD&A) sections — the qualitative narrative that FMP financials
 * don't cover. Caps each section at 40K chars to stay indexable.
 *
 * For 8-K: extracts full text (usually 2-10 pages — material event announcements,
 * earnings guidance, executive changes, acquisitions).
 *
 * Usage:
 *   bun eval/scrapers/edgar.ts
 *   bun eval/scrapers/edgar.ts --ticker NVDA
 *   bun eval/scrapers/edgar.ts --forms 8-K       # only 8-Ks
 *   bun eval/scrapers/edgar.ts --since 2023-01-01
 *   bun eval/scrapers/edgar.ts --no-cache
 *
 * Output: eval/data/financebrain-v1/sec/<TICKER>/<form>-<date>.json
 *
 * No API key needed — EDGAR is public. Polite rate limit: 500ms between requests.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getQuarterContext } from './earnings-calendar.ts';
import type { FinancePage } from './types.ts';

// ── Config ─────────────────────────────────────────────────────────────────────

const USER_AGENT = 'gbrain-evals research@gbrain.ai'; // EDGAR requires a real contact
const EDGAR_BASE = 'https://data.sec.gov';
const ARCHIVE = 'https://www.sec.gov/Archives/edgar/data';
const RATE_MS = 600;

const TICKERS: Record<string, string> = {
  NVDA: '0001045810',
  MSFT: '0000789019',
  GOOGL: '0001652044',
  META: '0001326801',
  AAPL: '0000320193',
};

const TARGET_FORMS = ['10-K', '10-Q', '8-K'];
const MAX_SECTION_CHARS = 40_000;
const MAX_8K_CHARS = 30_000;

// ── CLI ────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const tickerArg = args.includes('--ticker') ? args[args.indexOf('--ticker') + 1] : null;
const formsArg  = args.includes('--forms')  ? args[args.indexOf('--forms') + 1].split(',') : TARGET_FORMS;
const sinceArg  = args.includes('--since')  ? args[args.indexOf('--since') + 1] : '2022-01-01';
const NO_CACHE  = args.includes('--no-cache');

const activeTickers = tickerArg
  ? { [tickerArg.toUpperCase()]: TICKERS[tickerArg.toUpperCase()] }
  : TICKERS;

// ── Helpers ───────────────────────────────────────────────────────────────────

let lastReq = 0;
async function edgarGet(url: string): Promise<string> {
  const wait = RATE_MS - (Date.now() - lastReq);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastReq = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`EDGAR ${res.status}: ${url}`);
  return res.text();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── HTML → text ───────────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<ix:[^>]*>[\s\S]*?<\/ix:[^>]+>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|tr|li|h[1-6]|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Section extractor ─────────────────────────────────────────────────────────

type SectionDef = { name: string; patterns: RegExp[]; maxChars: number };

const TENK_SECTIONS: SectionDef[] = [
  {
    name: 'Business',
    // Require newline before "Item 1" — skips TOC (one collapsed line of text)
    patterns: [/\n\s*item\s+1[\.\s]+business/i],
    maxChars: MAX_SECTION_CHARS,
  },
  {
    name: 'Risk Factors',
    patterns: [/\n\s*item\s+1a[\.\s]+risk\s+factors/i],
    maxChars: MAX_SECTION_CHARS,
  },
  {
    name: "Management's Discussion and Analysis",
    patterns: [
      /\n\s*item\s+7[\.\s]+management.{0,5}s?\s+discussion/i,
      /\n\s*item\s+2[\.\s]+management.{0,5}s?\s+discussion/i,
    ],
    maxChars: MAX_SECTION_CHARS,
  },
];

// Find a section in plain text by matching the header pattern, then grabbing
// content until the next Item header or end of text.
function extractSection(text: string, def: SectionDef): string | null {
  const nextItemPattern = /\n\s*item\s+\d{1,2}[a-z]?[\.\s]/i;

  for (const basePat of def.patterns) {
    // Make the pattern global so we can iterate through all occurrences
    const pat = new RegExp(basePat.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = pat.exec(text)) !== null) {
      const start = match.index;
      // End: next Item header after a gap (skip the header itself)
      const searchFrom = start + 200;
      const afterSection = text.slice(searchFrom);
      const nextMatch = nextItemPattern.exec(afterSection);
      const end = nextMatch ? searchFrom + nextMatch.index : text.length;

      const section = text.slice(start, Math.min(end, start + def.maxChars));
      if (section.length < 1500) continue; // TOC entry — keep scanning
      return section.trim();
    }
  }
  return null;
}

function extractSections(text: string, form: string): Record<string, string> {
  const sections: Record<string, string> = {};

  if (form === '10-K' || form === '10-Q') {
    const defs = form === '10-K' ? TENK_SECTIONS : [TENK_SECTIONS[2]]; // 10-Q: MD&A only
    for (const def of defs) {
      const content = extractSection(text, def);
      if (content) sections[def.name] = content;
    }
  } else {
    // 8-K: full text, capped
    sections['Filing'] = text.slice(0, MAX_8K_CHARS);
  }

  return sections;
}

// ── Page builder ──────────────────────────────────────────────────────────────

function buildFilingPage(
  ticker: string,
  form: string,
  filingDate: string,
  periodDate: string,
  accessionNo: string,
  sections: Record<string, string>,
): FinancePage {
  const published = new Date(filingDate);
  const qc = getQuarterContext(ticker, published);

  const sectionText = Object.entries(sections)
    .map(([name, content]) => `\n${'═'.repeat(60)}\n${name.toUpperCase()}\n${'═'.repeat(60)}\n\n${content}`)
    .join('\n\n');

  const header = `${ticker} — ${form} Filing\nFiled: ${filingDate}  |  Period: ${periodDate}  |  Accession: ${accessionNo}\n`;

  return {
    slug: `sec/${ticker}/${slugify(form)}-${filingDate}`,
    type: 'filing',
    source_type: form === '10-K' ? 'sec-10k' : form === '10-Q' ? 'sec-10q' : 'sec-8k',
    title: `${ticker} ${form} — ${filingDate}`,
    url: `https://www.sec.gov/Archives/edgar/data/${TICKERS[ticker]}/${accessionNo.replace(/-/g,'')}/`,
    published_at: published.toISOString(),
    compiled_truth: header + sectionText,
    companies_mentioned: [ticker],
    quarter_context: qc ? { [ticker]: qc } : {},
    _facts: {
      ticker, form, filing_date: filingDate, period_date: periodDate,
      accession_no: accessionNo, sections: Object.keys(sections),
    },
  };
}

// ── Filing index parser ───────────────────────────────────────────────────────

// Returns all exhibit file paths from the filing's index page.
// Prioritises files that are NOT served through the iXBRL viewer (/ix?doc=).
async function getExhibitDocs(cikNum: string, accClean: string, accNo: string): Promise<string[]> {
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accClean}/${accNo}-index.htm`;
  try {
    const html = await edgarGet(indexUrl);
    // Extract href links to .htm files; skip iXBRL viewer links
    const docs: string[] = [];
    const re = /href="((?!\/ix\?)[^"]+\.htm)"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const href = m[1];
      if (href.startsWith('/Archives/')) {
        docs.push(`https://www.sec.gov${href}`);
      }
    }
    return docs;
  } catch {
    return []; // index not found — fall back to primary doc
  }
}

// ── Filing fetcher ────────────────────────────────────────────────────────────

async function fetchFiling(ticker: string, cik: string, entry: {
  form: string; date: string; period: string; accNo: string; doc: string;
}): Promise<string | null> {
  const cikNum = cik.replace(/^0+/, '');
  const accClean = entry.accNo.replace(/-/g, '');

  // For 8-Ks: get exhibit files from the index (press releases, etc.)
  // For 10-K/10-Q: use the primary XBRL document
  if (entry.form === '8-K') {
    const exhibits = await getExhibitDocs(cikNum, accClean, entry.accNo);
    // Pick the best exhibit: prefer press release (pr, ex99, exhibit99) over boilerplate form
    const preferred = exhibits.find(u =>
      /pr\.htm|ex[- _]?99|exhibit[- _]?99|pressrelease|earnings|results/i.test(u)
    ) ?? exhibits[0] ?? `${ARCHIVE}/${cikNum}/${accClean}/${entry.doc}`;

    try {
      const html = await edgarGet(preferred);
      const text = htmlToText(html);
      return text.length >= 300 ? text : null;
    } catch (err) {
      console.warn(`    WARN: ${err}`);
      return null;
    }
  }

  // 10-K / 10-Q: use primary document, improve section extraction
  const url = `${ARCHIVE}/${cikNum}/${accClean}/${entry.doc}`;
  try {
    const html = await edgarGet(url);
    const text = htmlToText(html);
    return text.length < 500 ? null : text;
  } catch (err) {
    console.warn(`    WARN: failed to fetch ${url}: ${err}`);
    return null;
  }
}

// ── Per-ticker download ───────────────────────────────────────────────────────

type FilingEntry = { form: string; date: string; period: string; accNo: string; doc: string };

async function getFilingList(ticker: string, cik: string): Promise<FilingEntry[]> {
  const url = `${EDGAR_BASE}/submissions/CIK${cik}.json`;
  const json = await edgarGet(url);
  const data = JSON.parse(json);
  const r = data.filings.recent;

  const entries: FilingEntry[] = [];
  for (let i = 0; i < r.form.length; i++) {
    if (!formsArg.includes(r.form[i])) continue;
    if (r.filingDate[i] < sinceArg) continue;
    entries.push({
      form: r.form[i],
      date: r.filingDate[i],
      period: r.reportDate?.[i] ?? r.filingDate[i],
      accNo: r.accessionNumber[i],
      doc: r.primaryDocument[i],
    });
  }

  // Also check older filings pages if they exist
  if (data.filings.files?.length) {
    for (const file of data.filings.files) {
      try {
        const oldJson = await edgarGet(`${EDGAR_BASE}/submissions/${file.name}`);
        const old = JSON.parse(oldJson);
        const or = old;
        for (let i = 0; i < or.form?.length; i++) {
          if (!formsArg.includes(or.form[i])) continue;
          if (or.filingDate[i] < sinceArg) continue;
          entries.push({
            form: or.form[i],
            date: or.filingDate[i],
            period: or.reportDate?.[i] ?? or.filingDate[i],
            accNo: or.accessionNumber[i],
            doc: or.primaryDocument[i],
          });
        }
      } catch { /* skip */ }
    }
  }

  return entries;
}

async function downloadTicker(ticker: string, cik: string) {
  const outDir = `eval/data/financebrain-v1/sec/${ticker}`;
  mkdirSync(outDir, { recursive: true });

  console.log(`\n── ${ticker} (CIK ${cik}) ─────────────────────────────`);
  const entries = await getFilingList(ticker, cik);
  console.log(`  ${entries.length} filings since ${sinceArg}`);

  let written = 0, skipped = 0, failed = 0;

  for (const entry of entries) {
    const outPath = join(outDir, `${slugify(entry.form)}-${entry.date}.json`);
    if (!NO_CACHE && existsSync(outPath)) { skipped++; continue; }

    process.stdout.write(`  ${entry.form} ${entry.date}... `);

    const text = await fetchFiling(ticker, cik, entry);
    if (!text) { console.log('SKIP (empty)'); failed++; continue; }

    const sections = extractSections(text, entry.form);
    if (Object.keys(sections).length === 0) { console.log('SKIP (no sections found)'); failed++; continue; }

    const page = buildFilingPage(ticker, entry.form, entry.date, entry.period, entry.accNo, sections);
    writeFileSync(outPath, JSON.stringify(page, null, 2));
    written++;

    const sectionNames = Object.keys(sections).join(', ');
    const totalChars = Object.values(sections).reduce((s, c) => s + c.length, 0);
    console.log(`OK (${totalChars.toLocaleString()} chars — ${sectionNames})`);
  }

  console.log(`  ${ticker}: ${written} written, ${skipped} skipped, ${failed} failed`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Forms: ${formsArg.join(', ')}  |  Since: ${sinceArg}`);

  for (const [ticker, cik] of Object.entries(activeTickers)) {
    await downloadTicker(ticker, cik);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
