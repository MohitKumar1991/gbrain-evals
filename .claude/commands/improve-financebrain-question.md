# FinanceBrain Question Improver

You are improving questions in the FinanceBrain retrieval benchmark (`eval/data/financebrain-v1/questions.json`). The benchmark indexes ~1,910 financial documents (SEC filings, earnings transcripts, price data, social/substack posts) into gbrain and measures Recall@5 — whether the correct source document appears in the top-5 retrieval results.

A question has these fields:
- `question`: the natural-language query
- `answer`: the correct factual answer
- `answer_slugs`: list of corpus document IDs the system must retrieve
- `notes`: context the benchmark author knows but the user doesn't
- `validated`: boolean

**Your job:** apply the rules below to the question(s) given, output improved versions with a short rationale for each change. Do not change `id`, `category`, or `answer_slugs` unless explicitly asked — those require corpus verification. Flag slug issues separately.

---

## Rules

### R1 — Answer must paraphrase, never quote verbatim

The `answer` field is what a model should *produce*. If it contains 6+ consecutive words verbatim from the source document, keyword retrieval gets free signal — it matches the answer text against the corpus, not the question. That inflates keyword scores and masks retrieval failure.

**Fix:** paraphrase numbers, facts, and conclusions. If the source's exact phrasing is evidentially important (e.g., a specific legal or disclosure term), put it in `notes`, not `answer`.

**Before:**
```
"answer": "...'The scale surprised even the true believers.'"
```
**After:**
```
"answer": "... the growth exceeded expectations of industry insiders."
"notes": "Source quote: 'The scale surprised even the true believers.'"
```

**Self-check:** does the answer contain any phrase of 6+ words that could appear verbatim in the answer_slugs' content? If yes, paraphrase it.

---

### R2 — One question, one fact

Questions joined by "and" that test two independent facts require a larger gold set and obscure which retrieval path failed. If both sub-facts come from the same single document, the conjunction is fine. If they require separate retrieval paths or separate claims, split into two questions.

**Test:** are the two facts on the *same retrieval path* — both in the same document or the same type of query? If yes, the conjunction is fine. If they require different documents or different searches (one is a price move, the other is a risk factor disclosure), split. The trigger is not "does the question contain 'and'" — it's "would a retrieval system that nails one sub-fact necessarily find the other?"

**Before:**
```
"question": "What does Alphabet's FY2024 annual report say about its revenue concentration in advertising, and what AI-related risk factors does it disclose?"
```
**After (two questions):**
```
"question": "What does Alphabet's FY2024 10-K say is the primary risk from its revenue concentration in digital advertising?"
"question": "What risk factors does Alphabet's FY2024 10-K disclose about competition and supply chain in AI?"
```

---

### R3 — Phrase as a real user, not a benchmark author

Questions should be phrased the way someone who *hasn't read the source* would ask. If the question presupposes knowledge of the source (references the article title, uses the source's own category labels, or contains a hint that makes the source obvious), it tests keyword matching, not retrieval.

**Test:** would someone who has never read any of the answer_slugs phrase the question this way? If no, rewrite.

**Before:**
```
"question": "What were the key ARR milestones for vibe coding platforms reported in the 2025 AI year-end recap?"
```
**After:**
```
"question": "How large was the AI code-generation startup market by end of 2025, and which companies led on ARR growth?"
```

**Special case — time-series questions:** it is acceptable to specify an exact date range ("Q1 FY2022 through Q3 FY2026") because the range is the substance of the question, not a source hint.

---

### R4 — Editorial framing belongs in notes

The `answer` field should be factual and concise: numbers, names, dates, conclusions. Interpretation, context, and commentary ("Apple deliberately carries ~2x more debt than equity — structured leverage for buybacks, not distress") belongs in `notes`. The answer is what an LLM should reproduce; notes are for the benchmark author.

**Before:**
```
"answer": "Total debt $119.06B, stockholders equity only $56.95B. Apple deliberately carries ~2x more debt than equity — structured leverage for buybacks, not distress."
```
**After:**
```
"answer": "Total debt $119.06B, stockholders equity $56.95B, net debt $89.12B, cash $65.17B."
"notes": "Apple's structural over-leverage is by design — capital returned via buybacks, not financial distress."
```

---

### R5 — Gold set is minimum sufficient, not maximum related

Each slug in `answer_slugs` must directly contain the answer. Don't add "related" documents that corroborate context but don't contain the fact. Don't omit documents that also contain the answer (especially when the same fact appears in both an 8-K press release and a financials page).

**Thin set (under-specified):** a question about Q3 FY2025 NVDA earnings lists only the financials page but not the 8-K press release that also contains the exact numbers.

**Bloated set (over-specified):** a question about a specific announced metric lists every earnings transcript from the past two years because they all mention it tangentially.

**Rule:** if a document *must* be retrieved to fully answer the question, it belongs in the gold set. If a document contains the answer but so do 3 other documents, include whichever is most directly sourced (usually the filing or press release, not the secondary analysis).

---

### R6 — Time-series scope: K=5 or temporal_recall

For `time-series` questions, the gold set often spans 10–20 quarterly documents, which mathematically caps Recall@5 at 25–50%. This is not a question defect — the breadth is the point. Do not artificially narrow the date range to fit K=5.

**Instead:** ensure the question is tagged `"temporal": true` in questions.json. The benchmark uses `temporal_recall` (quarter-coverage metric) as the headline for these questions. Recall@5 is shown as a secondary metric with a "structurally capped" note.

**For temporal questions:** the question's date range should match the slug set exactly. If the question says "Q1 FY2022 through Q3 FY2026" but the slugs only cover FY2023–FY2025, fix the date range in the question text.

---

### R7 — Don't ask for facts the source doesn't contain

The question must be answerable from `answer_slugs` alone. If the answer requires classification, derivation, or interpretation that the benchmark author performed post-hoc, the question is testing LLM reasoning, not retrieval. A retrieval system that perfectly retrieves the source can still fail the question.

**Test:** open every answer_slug and try to point to the exact text that produces each claim in the answer. If any claim requires knowledge not present in those documents, the question fails R7.

**Before:**
```
"question": "How is the long book distributed across thematic clusters, and which has the largest NAV exposure?"
"notes": "Taxonomy derived from ticker descriptions; not labeled in source data."
```
The notes field itself is confessing the violation. The source contains tickers and weights, not cluster labels.

**After:**
```
"question": "What are the top 5 holdings in the long book by NAV percentage, and what is their combined weight?"
```

**If the question can't be rewritten to fit what the source contains**, it doesn't belong in this retrieval benchmark. Flag it for removal.

---

### R8 — Question scope must match gold-set scope

Plural-scope language in the question ("across earnings calls," "in each quarter," "over the past N years") implies the gold set covers multiple periods or sources. If the gold set is a single document, either rewrite the question to be singular or expand the gold set and tag `"temporal": true`.

**Test:** count plural-implying phrases. Count gold-set documents. They must be consistent.

**Before:**
```
"question": "What has Microsoft disclosed about GitHub Copilot subscriber growth and broader Copilot enterprise adoption across earnings calls?"
"answer_slugs": ["transcripts/MSFT-2024-Q3"]
```
The question promises longitudinal coverage the gold set can't deliver.

**After (single-call):**
```
"question": "On Microsoft's Q3 FY2024 earnings call, what did the company disclose about GitHub Copilot subscriber count and Fortune 500 enterprise adoption?"
```

**After (multi-call):** expand gold set to relevant quarterly transcripts and add `"temporal": true`.

---

## Output format

For each question reviewed, produce:

```
### <question-id>

**Issues found:** [list each rule violated, e.g. R1 (verbatim quote), R7 (fact not in source)]

**Revised question:**
<rewritten question text, or "no change needed">

**Revised answer:**
<rewritten answer, or "no change needed">

**Revised notes:**
<updated notes, or "no change needed">

**Slug flags:**
<any gold-set issues: thin, bloated, missing slug, or R7 violation — requires corpus verification>

**Rationale:**
<1-2 sentences on what changed and why>
```

If a question has no issues, say so explicitly rather than forcing a change.

---

## Common patterns to watch for

These failure modes appear repeatedly across the question bank:

1. **Transcript questions over-quote.** Authors read transcripts and paste memorable phrases. Every transcript question is high-risk for R1. Paraphrase aggressively; put verbatim into notes.

2. **Notes as confession.** If the notes field says "taxonomy derived by benchmark author" or "not labeled in source data," that's a red flag the question violates R7. Notes should explain context, not admit violations.

3. **Questions written backwards from a known source.** The author read the source first and wrote a question the summary answers. These sound unnatural ("key ARR milestones reported in the 2025 year-end recap") and often fail R3. Apply the stranger test: would someone who never read this source phrase the question this way?

4. **"Across / throughout / in each quarter" with a thin gold set.** R8 violation pattern. The question implies breadth the gold set doesn't cover.

5. **Answer contains editorial conclusions.** "Apple deliberately carries ~2x more debt — structured leverage for buybacks, not distress" is the author's interpretation. Facts in answer, interpretation in notes.

6. **Market-reactions answers leak the significance methodology.** Authors show their work: "Baseline avg: ±1.51%. Threshold: ±3.02%. Significant — 3.4× the baseline." The user just needs the conclusion ("significant" or "not significant") plus the price move. The methodology (baseline, threshold, multiplier) belongs in notes.

---

## Canonical example of a clean question

`financials-11` is the template for what good looks like:

```json
{
  "id": "financials-11",
  "category": "financials",
  "question": "What was Meta Platforms' operating cash flow, capex, and free cash flow in Q3 2024?",
  "answer": "Operating cash flow $24.72B, capex -$8.26B, free cash flow $16.47B. Meta also repurchased $8.82B of stock in the same quarter.",
  "answer_slugs": ["financials/meta-2024-09-30"],
  "notes": "Period ending 2024-09-30. Verified from _facts cash_flow."
}
```

Why it passes all rules:
- R1: paraphrased, no verbatim source text
- R2: one thematically coherent financial question (cash generation + capital allocation — same retrieval path)
- R3: real-user phrasing
- R4: answer is factual, notes carry context
- R5: one slug, minimum sufficient
- R7: all numbers directly in the source financials page
- R8: singular scope, singular period, one slug

---

## Corpus problems (don't try to fix in questions)

These are retrieval failures the question cannot compensate for:
- A substack article that paraphrases a claim from another source without the exact numbers
- A quarter missing from the corpus entirely (gap in 8-K or financials scrape)
- A single-source claim where the one document that contains it is not reliably retrieved

Flag these in `Slug flags` if you spot them, but do not remove the slug or change the question to avoid them.
