/**
 * Shared types for the FinanceBrain corpus.
 *
 * Every downloaded document — Substack article, SEC filing, price snapshot,
 * tweet, etc. — is stored as a FinancePage. The `compiled_truth` field is
 * the full text that gets indexed into gbrain. The `_facts` field is the
 * ground truth that drives question generation and scoring.
 */

import type { QuarterContext } from './earnings-calendar.ts';

export type SourceType =
  | 'substack'
  | 'sec-10k'
  | 'sec-10q'
  | 'sec-8k'
  | 'price'
  | 'news'
  | 'social'
  | 'portfolio'
  | 'market-data'
  | 'company-overview';

export type FinancePage = {
  slug: string;             // unique key used as gbrain doc ID
  type: 'article' | 'filing' | 'price-data' | 'portfolio' | 'market-data' | 'overview';
  source_type: SourceType;
  title: string;
  author?: string;
  url: string;
  published_at: string;     // ISO 8601 — the publish/filing/report date
  compiled_truth: string;   // full text indexed into gbrain
  timeline?: string;        // optional date-indexed bullet summary
  companies_mentioned: string[];   // tickers: ['NVDA', 'MSFT', ...]
  quarter_context: Partial<Record<string, QuarterContext>>; // ticker → context
  _facts: Record<string, unknown>;
};
