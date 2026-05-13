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
  earnings_date: string; // YYYY-MM-DD — actual report date (after-market or pre-market)
  estimated?: boolean;   // true if the date is an estimate
};

export type QuarterContext = {
  quarter: string;
  fiscal_year: string;
  earnings_date: string;
  days_relative: number;  // negative = before earnings, positive = after
  phase: 'pre-earnings' | 'earnings-day' | 'post-earnings';
};

export const EARNINGS_CALENDAR: Record<string, EarningsEntry[]> = {
  // NVDA fiscal year ends Jan 31
  NVDA: [
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2023-02-01', period_end: '2023-04-30', earnings_date: '2023-05-24' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2023-05-01', period_end: '2023-07-30', earnings_date: '2023-08-23' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2023-07-31', period_end: '2023-10-29', earnings_date: '2023-11-21' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2023-10-30', period_end: '2024-01-28', earnings_date: '2024-02-21' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2024-01-29', period_end: '2024-04-28', earnings_date: '2024-05-22' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2024-04-29', period_end: '2024-07-28', earnings_date: '2024-08-28' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2024-07-29', period_end: '2024-10-27', earnings_date: '2024-11-20' },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2024-10-28', period_end: '2025-01-26', earnings_date: '2025-02-26' },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2025-01-27', period_end: '2025-04-27', earnings_date: '2025-05-28' },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2025-04-28', period_end: '2025-07-27', earnings_date: '2025-08-27' },
    { quarter: 'Q3', fiscal_year: 'FY2026', period_start: '2025-07-28', period_end: '2025-10-26', earnings_date: '2025-11-19' },
    { quarter: 'Q4', fiscal_year: 'FY2026', period_start: '2025-10-27', period_end: '2026-01-25', earnings_date: '2026-02-26', estimated: true },
    { quarter: 'Q1', fiscal_year: 'FY2027', period_start: '2026-01-26', period_end: '2026-04-26', earnings_date: '2026-05-28', estimated: true },
  ],

  // MSFT fiscal year ends Jun 30
  MSFT: [
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2023-07-01', period_end: '2023-09-30', earnings_date: '2023-10-25' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2023-10-01', period_end: '2023-12-31', earnings_date: '2024-01-30' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2024-01-01', period_end: '2024-03-31', earnings_date: '2024-04-25' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2024-04-01', period_end: '2024-06-30', earnings_date: '2024-07-30' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2024-07-01', period_end: '2024-09-30', earnings_date: '2024-10-30' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2024-10-01', period_end: '2024-12-31', earnings_date: '2025-01-29' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2025-01-01', period_end: '2025-03-31', earnings_date: '2025-04-30' },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2025-04-01', period_end: '2025-06-30', earnings_date: '2025-07-29' },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2025-07-01', period_end: '2025-09-30', earnings_date: '2025-10-29' },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2025-10-01', period_end: '2025-12-31', earnings_date: '2026-01-29', estimated: true },
    { quarter: 'Q3', fiscal_year: 'FY2026', period_start: '2026-01-01', period_end: '2026-03-31', earnings_date: '2026-04-30', estimated: true },
    { quarter: 'Q4', fiscal_year: 'FY2026', period_start: '2026-04-01', period_end: '2026-06-30', earnings_date: '2026-07-29', estimated: true },
  ],

  // GOOGL fiscal year = calendar year
  GOOGL: [
    { quarter: 'Q1', fiscal_year: 'FY2023', period_start: '2023-01-01', period_end: '2023-03-31', earnings_date: '2023-04-25' },
    { quarter: 'Q2', fiscal_year: 'FY2023', period_start: '2023-04-01', period_end: '2023-06-30', earnings_date: '2023-07-25' },
    { quarter: 'Q3', fiscal_year: 'FY2023', period_start: '2023-07-01', period_end: '2023-09-30', earnings_date: '2023-10-24' },
    { quarter: 'Q4', fiscal_year: 'FY2023', period_start: '2023-10-01', period_end: '2023-12-31', earnings_date: '2024-01-30' },
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2024-01-01', period_end: '2024-03-31', earnings_date: '2024-04-25' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2024-04-01', period_end: '2024-06-30', earnings_date: '2024-07-23' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2024-07-01', period_end: '2024-09-30', earnings_date: '2024-10-29' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2024-10-01', period_end: '2024-12-31', earnings_date: '2025-02-04' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2025-01-01', period_end: '2025-03-31', earnings_date: '2025-04-29' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2025-04-01', period_end: '2025-06-30', earnings_date: '2025-07-29' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2025-07-01', period_end: '2025-09-30', earnings_date: '2025-10-28' },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2025-10-01', period_end: '2025-12-31', earnings_date: '2026-02-03', estimated: true },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2026-01-01', period_end: '2026-03-31', earnings_date: '2026-04-29', estimated: true },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2026-04-01', period_end: '2026-06-30', earnings_date: '2026-07-29', estimated: true },
  ],

  // META fiscal year = calendar year
  META: [
    { quarter: 'Q1', fiscal_year: 'FY2023', period_start: '2023-01-01', period_end: '2023-03-31', earnings_date: '2023-04-26' },
    { quarter: 'Q2', fiscal_year: 'FY2023', period_start: '2023-04-01', period_end: '2023-06-30', earnings_date: '2023-07-26' },
    { quarter: 'Q3', fiscal_year: 'FY2023', period_start: '2023-07-01', period_end: '2023-09-30', earnings_date: '2023-10-25' },
    { quarter: 'Q4', fiscal_year: 'FY2023', period_start: '2023-10-01', period_end: '2023-12-31', earnings_date: '2024-02-01' },
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2024-01-01', period_end: '2024-03-31', earnings_date: '2024-04-24' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2024-04-01', period_end: '2024-06-30', earnings_date: '2024-07-31' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2024-07-01', period_end: '2024-09-30', earnings_date: '2024-10-30' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2024-10-01', period_end: '2024-12-31', earnings_date: '2025-01-29' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2025-01-01', period_end: '2025-03-31', earnings_date: '2025-04-30' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2025-04-01', period_end: '2025-06-30', earnings_date: '2025-07-30' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2025-07-01', period_end: '2025-09-30', earnings_date: '2025-10-29' },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2025-10-01', period_end: '2025-12-31', earnings_date: '2026-01-28', estimated: true },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2026-01-01', period_end: '2026-03-31', earnings_date: '2026-04-30', estimated: true },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2026-04-01', period_end: '2026-06-30', earnings_date: '2026-07-30', estimated: true },
  ],

  // AAPL fiscal year ends last Saturday of September
  AAPL: [
    { quarter: 'Q2', fiscal_year: 'FY2023', period_start: '2022-12-31', period_end: '2023-04-01', earnings_date: '2023-05-04' },
    { quarter: 'Q3', fiscal_year: 'FY2023', period_start: '2023-04-02', period_end: '2023-07-01', earnings_date: '2023-08-03' },
    { quarter: 'Q4', fiscal_year: 'FY2023', period_start: '2023-07-02', period_end: '2023-09-30', earnings_date: '2023-11-02' },
    { quarter: 'Q1', fiscal_year: 'FY2024', period_start: '2023-10-01', period_end: '2023-12-30', earnings_date: '2024-02-01' },
    { quarter: 'Q2', fiscal_year: 'FY2024', period_start: '2023-12-31', period_end: '2024-03-30', earnings_date: '2024-05-02' },
    { quarter: 'Q3', fiscal_year: 'FY2024', period_start: '2024-03-31', period_end: '2024-06-29', earnings_date: '2024-08-01' },
    { quarter: 'Q4', fiscal_year: 'FY2024', period_start: '2024-06-30', period_end: '2024-09-28', earnings_date: '2024-10-31' },
    { quarter: 'Q1', fiscal_year: 'FY2025', period_start: '2024-09-29', period_end: '2024-12-28', earnings_date: '2025-01-30' },
    { quarter: 'Q2', fiscal_year: 'FY2025', period_start: '2024-12-29', period_end: '2025-03-29', earnings_date: '2025-05-01' },
    { quarter: 'Q3', fiscal_year: 'FY2025', period_start: '2025-03-30', period_end: '2025-06-28', earnings_date: '2025-07-31', estimated: true },
    { quarter: 'Q4', fiscal_year: 'FY2025', period_start: '2025-06-29', period_end: '2025-09-27', earnings_date: '2025-10-30', estimated: true },
    { quarter: 'Q1', fiscal_year: 'FY2026', period_start: '2025-09-28', period_end: '2025-12-27', earnings_date: '2026-01-29', estimated: true },
    { quarter: 'Q2', fiscal_year: 'FY2026', period_start: '2025-12-28', period_end: '2026-03-28', earnings_date: '2026-05-01', estimated: true },
    { quarter: 'Q3', fiscal_year: 'FY2026', period_start: '2026-03-29', period_end: '2026-06-27', earnings_date: '2026-07-30', estimated: true },
  ],
};

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

  return {
    quarter: best.quarter,
    fiscal_year: best.fiscal_year,
    earnings_date: best.earnings_date,
    days_relative: best.delta,
    phase:
      best.delta < -1
        ? 'pre-earnings'
        : best.delta <= 1
          ? 'earnings-day'
          : 'post-earnings',
  };
}
