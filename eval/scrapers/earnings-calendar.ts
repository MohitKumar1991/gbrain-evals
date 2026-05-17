/**
 * Hardcoded earnings calendar for the 5 FinanceBrain target companies.
 *
 * Each entry: fiscal quarter label, the calendar period it covers, and the
 * date the earnings were actually reported. The reported date is the ground
 * truth for temporal tagging — an article published before that date is
 * pre-earnings (expectation/speculation); after is post-earnings (reaction).
 *
 * Sources: SEC EDGAR 10-Q/10-K filing dates, IR pages.
 * Dates marked (est) are estimates for future quarters.
 */

export type EarningsEntry = {
  quarter: string;       // Q1, Q2, Q3, Q4
  fiscal_year: string;   // FY2024, FY2025, ...
  period_start: string;  // YYYY-MM-DD — first day of fiscal quarter
  period_end: string;    // YYYY-MM-DD — last day of fiscal quarter
  earnings_date: string; // YYYY-MM-DD — actual report date
  timing: 'amc' | 'bmo'; // after-market-close or before-market-open; derived from earnings call start time (call_date in transcript _facts): >=16:00 ET = amc, <10:00 ET = bmo
  estimated?: boolean;   // true if the date is an estimate
};

export type QuarterContext = {
  quarter: string;
  fiscal_year: string;
  earnings_date: string;
  timing: 'amc' | 'bmo';
  days_relative: number;  // negative = before earnings, positive = after
  phase: 'pre-earnings' | 'earnings-day' | 'post-earnings';
  // date the market first reacts: same day for bmo, next trading day for amc
  market_reaction_date: string;
};

export const EARNINGS_CALENDAR: Record<string, EarningsEntry[]> = {
  // NVDA fiscal year ends Jan 31; all earnings reported amc (call_date ~17:00 ET)
  NVDA: [
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2023-02-01', period_end: '2023-04-30', earnings_date: '2023-05-24', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2023-05-01', period_end: '2023-07-30', earnings_date: '2023-08-23', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2023-07-31', period_end: '2023-10-29', earnings_date: '2023-11-21', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2023-10-30', period_end: '2024-01-28', earnings_date: '2024-02-21', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2024-01-29', period_end: '2024-04-28', earnings_date: '2024-05-22', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2024-04-29', period_end: '2024-07-28', earnings_date: '2024-08-28', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2024-07-29', period_end: '2024-10-27', earnings_date: '2024-11-20', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2024-10-28', period_end: '2025-01-26', earnings_date: '2025-02-26', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2025-01-27', period_end: '2025-04-27', earnings_date: '2025-05-28', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2025-04-28', period_end: '2025-07-27', earnings_date: '2025-08-27', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2026', period_start: '2025-07-28', period_end: '2025-10-26', earnings_date: '2025-11-19', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2026', period_start: '2025-10-27', period_end: '2026-01-25', earnings_date: '2026-02-26', timing: 'amc', estimated: true },
    { quarter: 'Q1', fiscal_year: 'FY2027', period_start: '2026-01-26', period_end: '2026-04-26', earnings_date: '2026-05-28', timing: 'amc', estimated: true },
  ],

  // MSFT fiscal year ends Jun 30; all earnings reported amc (call_date ~17:30 ET)
  MSFT: [
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2023-07-01', period_end: '2023-09-30', earnings_date: '2023-10-25', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2023-10-01', period_end: '2023-12-31', earnings_date: '2024-01-30', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2024-01-01', period_end: '2024-03-31', earnings_date: '2024-04-25', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2024-04-01', period_end: '2024-06-30', earnings_date: '2024-07-30', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2024-07-01', period_end: '2024-09-30', earnings_date: '2024-10-30', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2024-10-01', period_end: '2024-12-31', earnings_date: '2025-01-29', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2025-01-01', period_end: '2025-03-31', earnings_date: '2025-04-30', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2025-04-01', period_end: '2025-06-30', earnings_date: '2025-07-29', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2025-07-01', period_end: '2025-09-30', earnings_date: '2025-10-29', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2025-10-01', period_end: '2025-12-31', earnings_date: '2026-01-29', timing: 'amc', estimated: true },
    { quarter: 'Q3', fiscal_year: 'FY2026', period_start: '2026-01-01', period_end: '2026-03-31', earnings_date: '2026-04-30', timing: 'amc', estimated: true },
    { quarter: 'Q4', fiscal_year: 'FY2026', period_start: '2026-04-01', period_end: '2026-06-30', earnings_date: '2026-07-29', timing: 'amc', estimated: true },
  ],

  // GOOGL fiscal year = calendar year; all earnings reported amc (call_date ~16:30 ET)
  GOOGL: [
    { quarter: 'Q1', fiscal_year: 'FY2023', period_start: '2023-01-01', period_end: '2023-03-31', earnings_date: '2023-04-25', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2023', period_start: '2023-04-01', period_end: '2023-06-30', earnings_date: '2023-07-25', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2023', period_start: '2023-07-01', period_end: '2023-09-30', earnings_date: '2023-10-24', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2023', period_start: '2023-10-01', period_end: '2023-12-31', earnings_date: '2024-01-30', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2024-01-01', period_end: '2024-03-31', earnings_date: '2024-04-25', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2024-04-01', period_end: '2024-06-30', earnings_date: '2024-07-23', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2024-07-01', period_end: '2024-09-30', earnings_date: '2024-10-29', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2024-10-01', period_end: '2024-12-31', earnings_date: '2025-02-04', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2025-01-01', period_end: '2025-03-31', earnings_date: '2025-04-29', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2025-04-01', period_end: '2025-06-30', earnings_date: '2025-07-29', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2025-07-01', period_end: '2025-09-30', earnings_date: '2025-10-28', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2025-10-01', period_end: '2025-12-31', earnings_date: '2026-02-03', timing: 'amc', estimated: true },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2026-01-01', period_end: '2026-03-31', earnings_date: '2026-04-29', timing: 'amc', estimated: true },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2026-04-01', period_end: '2026-06-30', earnings_date: '2026-07-29', timing: 'amc', estimated: true },
  ],

  // META fiscal year = calendar year; all earnings reported amc (call_date ~17:00 ET)
  META: [
    { quarter: 'Q1', fiscal_year: 'FY2023', period_start: '2023-01-01', period_end: '2023-03-31', earnings_date: '2023-04-26', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2023', period_start: '2023-04-01', period_end: '2023-06-30', earnings_date: '2023-07-26', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2023', period_start: '2023-07-01', period_end: '2023-09-30', earnings_date: '2023-10-25', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2023', period_start: '2023-10-01', period_end: '2023-12-31', earnings_date: '2024-02-01', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2024-01-01', period_end: '2024-03-31', earnings_date: '2024-04-24', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2024-04-01', period_end: '2024-06-30', earnings_date: '2024-07-31', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2024-07-01', period_end: '2024-09-30', earnings_date: '2024-10-30', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2024-10-01', period_end: '2024-12-31', earnings_date: '2025-01-29', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2025-01-01', period_end: '2025-03-31', earnings_date: '2025-04-30', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2025-04-01', period_end: '2025-06-30', earnings_date: '2025-07-30', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2025-07-01', period_end: '2025-09-30', earnings_date: '2025-10-29', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2025-10-01', period_end: '2025-12-31', earnings_date: '2026-01-28', timing: 'amc', estimated: true },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2026-01-01', period_end: '2026-03-31', earnings_date: '2026-04-30', timing: 'amc', estimated: true },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2026-04-01', period_end: '2026-06-30', earnings_date: '2026-07-30', timing: 'amc', estimated: true },
  ],

  // AAPL fiscal year ends last Saturday of September; all earnings reported amc (call_date ~17:00 ET)
  AAPL: [
    { quarter: 'Q2', fiscal_year: 'FY2023', period_start: '2022-12-31', period_end: '2023-04-01', earnings_date: '2023-05-04', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2023', period_start: '2023-04-02', period_end: '2023-07-01', earnings_date: '2023-08-03', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2023', period_start: '2023-07-02', period_end: '2023-09-30', earnings_date: '2023-11-02', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2023-10-01', period_end: '2023-12-30', earnings_date: '2024-02-01', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2023-12-31', period_end: '2024-03-30', earnings_date: '2024-05-02', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2024-03-31', period_end: '2024-06-29', earnings_date: '2024-08-01', timing: 'amc' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2024-06-30', period_end: '2024-09-28', earnings_date: '2024-10-31', timing: 'amc' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2024-09-29', period_end: '2024-12-28', earnings_date: '2025-01-30', timing: 'amc' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2024-12-29', period_end: '2025-03-29', earnings_date: '2025-05-01', timing: 'amc' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2025-03-30', period_end: '2025-06-28', earnings_date: '2025-07-31', timing: 'amc', estimated: true },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2025-06-29', period_end: '2025-09-27', earnings_date: '2025-10-30', timing: 'amc', estimated: true },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2025-09-28', period_end: '2025-12-27', earnings_date: '2026-01-29', timing: 'amc', estimated: true },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2025-12-28', period_end: '2026-03-28', earnings_date: '2026-05-01', timing: 'amc', estimated: true },
    { quarter: 'Q3', fiscal_year: 'FY2026', period_start: '2026-03-29', period_end: '2026-06-27', earnings_date: '2026-07-30', timing: 'amc', estimated: true },
  ],
};

/**
 * Returns the first date strictly after dateStr that appears in tradingDays.
 *
 * If tradingDays is provided (non-empty), it is the authoritative source —
 * holidays and weekends are both handled because non-trading days simply won't
 * be in the set.  The set should be built from the actual price history files
 * (eval/data/financebrain-v1/price/*-daily-history.json, field _facts.days[].date).
 *
 * If tradingDays is empty or omitted (e.g. for future estimated dates that
 * fall outside the price data range), we fall back to skipping weekends only.
 * Holidays are not handled in fallback mode — callers should extend the price
 * data before relying on reaction dates for those quarters.
 *
 * Exported so scrapers and the runner can call it directly when they need a
 * next-trading-day lookup outside of getQuarterContext.
 */
export function nextTradingDay(dateStr: string, tradingDays: ReadonlySet<string> = new Set()): string {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC avoids DST edge cases
  for (let i = 0; i < 14; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
    const candidate = d.toISOString().slice(0, 10);
    if (tradingDays.size > 0) {
      if (tradingDays.has(candidate)) return candidate;
    } else {
      // fallback: weekday-only (no holiday awareness)
      if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) return candidate;
    }
  }
  throw new Error(`No trading day found within 14 days after ${dateStr}`);
}

/**
 * Given a ticker and a publication date, find the nearest earnings event and
 * return the quarter context (how many days before/after earnings the article
 * was published, and which fiscal quarter it relates to).
 *
 * We look for the nearest earnings date — either the upcoming one (pre) or
 * the most recent one (post). We cap the search window at 90 days in each
 * direction so an article from 6 months ago doesn't get tagged to a stale
 * quarter.
 */
export function getQuarterContext(
  ticker: string,
  publishedAt: Date,
  tradingDays: ReadonlySet<string> = new Set(),
  windowDays = 90,
): QuarterContext | null {
  const calendar = EARNINGS_CALENDAR[ticker];
  if (!calendar) return null;

  const pub = publishedAt.getTime();
  let best: (EarningsEntry & { delta: number }) | null = null;

  for (const entry of calendar) {
    const ed = new Date(entry.earnings_date).getTime();
    const delta = Math.round((pub - ed) / 86_400_000); // positive = after earnings
    const absDelta = Math.abs(delta);

    if (absDelta > windowDays) continue;
    if (!best || absDelta < Math.abs(best.delta)) {
      best = { ...entry, delta };
    }
  }

  if (!best) return null;

  const market_reaction_date =
    best.timing === 'amc'
      ? nextTradingDay(best.earnings_date, tradingDays)
      : best.earnings_date;

  return {
    quarter: best.quarter,
    fiscal_year: best.fiscal_year,
    earnings_date: best.earnings_date,
    timing: best.timing,
    days_relative: best.delta,
    phase:
      best.delta < -1
        ? 'pre-earnings'
        : best.delta <= 1
          ? 'earnings-day'
          : 'post-earnings',
    market_reaction_date,
  };
}
