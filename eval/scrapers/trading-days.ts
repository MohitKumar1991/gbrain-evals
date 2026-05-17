import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Reads actual trading dates from the committed daily price history files.
 * All 5 tickers (NVDA, MSFT, GOOGL, META, AAPL) trade on the same calendar,
 * so we only need to read one file — we pick the first one found.
 *
 * The returned set covers the range of the price data (2022-01-03 to whenever
 * the history was last refreshed, currently ~May 2026). For earnings dates
 * outside that range, nextTradingDay falls back to weekday-only logic.
 *
 * @param priceDir - path to eval/data/financebrain-v1/price/
 */
export function loadTradingDays(priceDir: string): Set<string> {
  const days = new Set<string>();
  const files = readdirSync(priceDir).filter(f => f.endsWith('-daily-history.json'));
  if (files.length === 0) return days;
  const raw = JSON.parse(readFileSync(join(priceDir, files[0]), 'utf-8'));
  for (const entry of (raw?._facts?.days ?? [])) {
    if (entry.date) days.add(entry.date);
  }
  return days;
}
