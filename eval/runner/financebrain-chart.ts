/**
 * Generate SVG charts from a financebrain runner JSON output. Inline-SVG so
 * GitHub markdown renders it without an external image host.
 *
 * Run:
 *   bun eval/runner/financebrain-chart.ts <runner-output.json>
 *   bun eval/runner/financebrain-chart.ts <runner-output.json> --out <dir>
 *
 * Writes:
 *   <out-dir>/headline.svg   — horizontal bar chart, one bar per adapter (Recall@5 overall)
 *   <out-dir>/per-type.svg   — grouped bar chart, one group per source type, 4 bars per adapter
 *
 * Default out-dir: docs/benchmarks/2026-05-13-financebrain-bigtech-v1/
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ─── Types matching financebrain runner output ──────────────────────

interface CategoryStats {
  hits: number;
  total: number;
}

interface AdapterSummary {
  adapter: string;
  hits: number;
  total: number;
  recall_at_k: number;
  by_category: Record<string, CategoryStats>;
}

interface RunnerOutput {
  run_at: string;
  corpus_size: number;
  adapters: string[];
  top_k: number;
  queries: number | unknown[];
  results: unknown[];
  summary: AdapterSummary[];
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_OUT_DIR = 'docs/benchmarks/2026-05-13-financebrain-bigtech-v1';

// Canonical category order and human-readable labels.
const CATEGORY_ORDER = [
  'financials',
  'transcript',
  'price',
  'social',
  'substack',
  'portfolio',
  'sec-8k',
  'sec-10k',
  'sec-10q',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  financials: 'Financials',
  transcript: 'Transcripts',
  price: 'Price',
  social: 'Social',
  substack: 'Substack',
  portfolio: 'Portfolio',
  'sec-8k': '8-K Filings',
  'sec-10k': '10-K Annual',
  'sec-10q': '10-Q Quarterly',
};

// Canonical adapter order: from simplest to most capable.
const ADAPTER_ORDER = ['keyword', 'vector', 'hybrid', 'hybrid+expansion'];

const COLORS = {
  keyword: '#6b7280',        // gray-500 — keyword baseline (deemphasized)
  vector: '#10b981',         // emerald-500 — vector-only
  hybrid: '#16a34a',         // green-600 — hybrid (RRF fusion)
  'hybrid+expansion': '#0d9488', // teal-600 — hybrid + Haiku expansion
  bgPanel: '#0a0a0a',
  bgCard: '#171717',
  text: '#e5e7eb',
  textMuted: '#9ca3af',
  axis: '#404040',
  grid: '#262626',
};

function adapterColor(name: string): string {
  if (name === 'hybrid+expansion') return COLORS['hybrid+expansion'];
  if (name === 'hybrid') return COLORS.hybrid;
  if (name === 'vector') return COLORS.vector;
  if (name === 'keyword') return COLORS.keyword;
  // Fallback: partial match for forward compatibility
  if (name.includes('expansion')) return COLORS['hybrid+expansion'];
  if (name.includes('hybrid')) return COLORS.hybrid;
  if (name.includes('vector')) return COLORS.vector;
  return COLORS.keyword;
}

function pct(x: number): string {
  return (x * 100).toFixed(1) + '%';
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function categoryRecall(stats: CategoryStats | undefined): number {
  if (!stats || stats.total === 0) return 0;
  return stats.hits / stats.total;
}

// Sort adapters by canonical order, then any unknown ones appended.
function sortAdapters(adapters: AdapterSummary[]): AdapterSummary[] {
  return [...adapters].sort((a, b) => {
    const ai = ADAPTER_ORDER.indexOf(a.adapter);
    const bi = ADAPTER_ORDER.indexOf(b.adapter);
    if (ai === -1 && bi === -1) return a.adapter.localeCompare(b.adapter);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ─── Chart 1: Headline horizontal bar chart ─────────────────────────

function headlineChart(summaries: AdapterSummary[], topK: number, corpusSize: number): string {
  // Sort by recall descending so best performer leads the eye.
  const rows = [...summaries].sort((a, b) => b.recall_at_k - a.recall_at_k);

  const W = 900;
  const padL = 200;
  const padR = 100;
  const padT = 72;   // room for title + subtitle
  const padB = 40;
  const rowH = 44;
  const barH = 24;
  const H = padT + rows.length * rowH + padB;
  const plotW = W - padL - padR;

  // Axis grid every 20%
  const grid: string[] = [];
  for (let v = 0.2; v <= 1.0; v += 0.2) {
    const x = padL + plotW * v;
    grid.push(`<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + rows.length * rowH}" stroke="${COLORS.grid}" stroke-width="1" />`);
    grid.push(`<text x="${x}" y="${padT + rows.length * rowH + 18}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,monospace" font-size="10" fill="${COLORS.textMuted}">${(v * 100).toFixed(0)}%</text>`);
  }

  const rowsXml = rows.map((r, i) => {
    const yMid = padT + i * rowH + rowH / 2;
    const barY = yMid - barH / 2;
    const w = plotW * r.recall_at_k;
    const valueX = padL + w + 8;
    const color = adapterColor(r.adapter);
    return `
      <text x="${padL - 12}" y="${yMid}" text-anchor="end" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="600" fill="${COLORS.text}">${escapeXml(r.adapter)}</text>
      <text x="${padL - 12}" y="${yMid + 14}" text-anchor="end" font-family="ui-monospace,SFMono-Regular,monospace" font-size="10" fill="${COLORS.textMuted}">n=${r.total} · k=${topK}</text>
      <rect x="${padL}" y="${barY}" width="${Math.max(w, 0)}" height="${barH}" rx="3" fill="${color}" />
      <text x="${valueX}" y="${yMid + 4}" text-anchor="start" font-family="ui-monospace,SFMono-Regular,monospace" font-size="13" font-weight="700" fill="${color}">${pct(r.recall_at_k)}</text>
    `;
  }).join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.bgPanel}" />
  <text x="${padL}" y="30" font-family="ui-sans-serif,system-ui,sans-serif" font-size="16" font-weight="700" fill="${COLORS.text}">FinanceBrain Recall@${topK} -- BigTech Corpus</text>
  <text x="${padL}" y="50" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="${COLORS.textMuted}">${corpusSize.toLocaleString()} pages · NVDA MSFT GOOGL META AAPL · 9 source types</text>
  ${grid.join('\n  ')}
  ${rowsXml}
</svg>
`.trim();
}

// ─── Chart 2: Per-source-type grouped bar chart ──────────────────────

function perTypeChart(summaries: AdapterSummary[], topK: number): string {
  const adapters = sortAdapters(summaries);

  // Collect categories present in any adapter summary, in canonical order first.
  const allCategories = new Set<string>();
  for (const s of adapters) {
    for (const cat of Object.keys(s.by_category)) {
      allCategories.add(cat);
    }
  }
  const categories: string[] = CATEGORY_ORDER.filter(c => allCategories.has(c));
  // Append any unknown categories at the end (forward-compat).
  for (const c of allCategories) {
    if (!categories.includes(c)) categories.push(c);
  }

  const W = 960;
  const padL = 50;
  const padR = 40;
  const padT = 40;
  const padB = 110;  // room for x-axis labels (rotated 45deg) + legend
  const H = 400;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const groupW = plotW / categories.length;
  const innerPad = 6;
  const barW = (groupW - innerPad * 2) / adapters.length;

  // Grid lines (horizontal, every 20%)
  const gridLines: string[] = [];
  for (let v = 0; v <= 1.0; v += 0.2) {
    const y = padT + plotH * (1 - v);
    gridLines.push(`<line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1" />`);
    gridLines.push(`<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-family="ui-monospace,SFMono-Regular,monospace" font-size="10" fill="${COLORS.textMuted}">${(v * 100).toFixed(0)}%</text>`);
  }

  const bars: string[] = [];
  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    const groupX = padL + ci * groupW;
    const labelX = groupX + groupW / 2;
    const labelY = padT + plotH + 16;
    const label = CATEGORY_LABELS[cat] ?? cat;

    // X-axis label, rotated 45 degrees
    bars.push(`<text transform="rotate(-45, ${labelX}, ${labelY})" x="${labelX}" y="${labelY}" text-anchor="end" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" fill="${COLORS.text}">${escapeXml(label)}</text>`);

    for (let ai = 0; ai < adapters.length; ai++) {
      const a = adapters[ai];
      const recall = categoryRecall(a.by_category[cat]);
      const barH = plotH * recall;
      const barX = groupX + innerPad + ai * barW;
      const barY = padT + plotH - barH;
      const color = adapterColor(a.adapter);

      bars.push(`<rect x="${barX.toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(barH, 0).toFixed(1)}" fill="${color}" />`);

      // Show value label on top of bar (only if bar is tall enough to be legible)
      if (barH > 14) {
        bars.push(`<text x="${(barX + barW / 2).toFixed(1)}" y="${(barY - 3).toFixed(1)}" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,monospace" font-size="9" fill="${color}">${pct(recall)}</text>`);
      }
    }
  }

  // Y-axis label
  const yAxisLabel = `<text transform="rotate(-90, 14, ${padT + plotH / 2})" x="14" y="${padT + plotH / 2}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" fill="${COLORS.textMuted}">Recall@${topK}</text>`;

  // Chart title
  const titleY = 22;
  const title = `<text x="${padL}" y="${titleY}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" fill="${COLORS.text}">recall@${topK} by source type</text>`;

  // Legend
  const legendY = H - 28;
  const legend: string[] = [];
  let lx = padL;
  for (const a of adapters) {
    const color = adapterColor(a.adapter);
    legend.push(`<rect x="${lx}" y="${legendY}" width="12" height="10" fill="${color}" />`);
    legend.push(`<text x="${lx + 16}" y="${legendY + 9}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" fill="${COLORS.text}">${escapeXml(a.adapter)}</text>`);
    lx += 160;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.bgPanel}" />
  ${title}
  ${yAxisLabel}
  ${gridLines.join('\n  ')}
  ${bars.join('\n  ')}
  ${legend.join('\n  ')}
</svg>
`.trim();
}

// ─── Main ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help') {
  process.stderr.write('usage: bun eval/runner/financebrain-chart.ts <runner-output.json> [--out <dir>]\n');
  process.exit(args[0] === '--help' ? 0 : 1);
}

// Parse args: first non-flag is the input JSON; --out <dir> overrides output dir.
let inputFile = '';
let outDir = DEFAULT_OUT_DIR;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') {
    outDir = args[++i];
    if (!outDir) {
      process.stderr.write('--out requires a directory argument\n');
      process.exit(1);
    }
  } else {
    inputFile = args[i];
  }
}

if (!inputFile) {
  process.stderr.write('error: no input JSON file specified\n');
  process.exit(1);
}

const data = JSON.parse(readFileSync(inputFile, 'utf8')) as RunnerOutput;

if (!data.summary || data.summary.length === 0) {
  process.stderr.write(`error: ${inputFile} has no summary array\n`);
  process.exit(1);
}

const topK = data.top_k ?? 5;
const corpusSize = data.corpus_size ?? 0;

mkdirSync(outDir, { recursive: true });

const headlinePath = join(outDir, 'headline.svg');
const perTypePath = join(outDir, 'per-type.svg');

writeFileSync(headlinePath, headlineChart(data.summary, topK, corpusSize) + '\n');
writeFileSync(perTypePath, perTypeChart(data.summary, topK) + '\n');

process.stderr.write(`wrote ${headlinePath}\n`);
process.stderr.write(`wrote ${perTypePath}\n`);
