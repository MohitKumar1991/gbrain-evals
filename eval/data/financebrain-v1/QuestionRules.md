# FinanceBrain Question Rules

Rules for writing and reviewing questions in `questions.json`.
Each question must pass all applicable rules before `human_reviewed` is set to `true`.

Questions have two review flags:
- **`ai_reviewed`** — set `true` after the AI rule pass (R1–R8 check). Reset to `false` if the question is manually edited after the pass.
- **`human_reviewed`** — set `true` only after a human has confirmed the question meets all applicable rules.

Run `/improve-financebrain-question` to apply these rules to any question.

---

## R1 — Answer must paraphrase, never quote verbatim

The `answer` field is what a model should *produce*. If it contains 6+ consecutive words verbatim from the source document, keyword retrieval gets free signal — it matches the answer text against the corpus rather than retrieving based on the question. That inflates keyword scores and masks retrieval failure.

**Fix:** paraphrase the substance. If the source's exact phrasing is evidentially important (a legal term, a specific disclosure, a verbatim claim you need to verify), put it in `notes`.

**Self-check:** does the answer contain any phrase of 6+ words that could appear verbatim in the answer_slugs' content? If yes, paraphrase it.

---

## R2 — One question, one fact

Questions joined by "and" that test two independent facts on different retrieval paths obscure which retrieval layer failed. If both sub-facts come from the same document (same retrieval path), the conjunction is fine.

**Test:** would a retrieval system that perfectly retrieves one sub-fact necessarily find the other? If no, split into two questions.

---

## R4 — Editorial framing belongs in notes

The `answer` field should be factual and concise: numbers, names, dates, direct conclusions. Interpretation, context, and commentary belong in `notes`. The answer is what an LLM should reproduce; notes are for the benchmark author.

**Examples of editorial that belong in notes:**
- "Apple deliberately carries ~2x more debt than equity — structured leverage for buybacks, not distress"
- "NVDA runs an exceptionally capex-light model"
- "the fastest product ramp in company history" (unless it is the literal answer to the question)

---

## R5 — Gold set is minimum sufficient

Each slug in `answer_slugs` must directly contain the answer. Do not add related documents that provide context but not the answer. Do not omit documents that independently contain the answer (e.g., if the same metric appears in both a financials page and an 8-K press release, include both).

**Thin set:** a single slug when the same fact is in two independent source documents.
**Bloated set:** documents added because they mention the topic, not because they contain the specific answer.

---

## R6 — Time-series questions: use temporal_recall, not Recall@K

Time-series questions intentionally have 10–20 gold slugs (one per quarter). With K=5, Recall@5 is structurally capped at 25–50%. This is not a defect — the breadth is the point.

**Fix:** tag the question `"temporal": true`. The benchmark uses `temporal_recall` (quarter-coverage) as the headline metric. Recall@5 is shown as a secondary metric.

The question's stated date range must match the slug set exactly. If the question says "Q1 FY2022 through Q3 FY2026" but slugs only cover FY2023–FY2025, fix the question text.

---

## R7 — Don't ask for facts the source doesn't contain

The question must be answerable from `answer_slugs` alone. If the answer requires classification, derivation, or analysis the benchmark author performed after reading the source, the question is testing LLM reasoning, not retrieval.

**Test:** open every answer_slug. Can you point to the exact text that produces every claim in the answer? If any claim requires knowledge not present in those documents, flag it.

**Exception:** questions explicitly testing planned features (e.g., portfolio thematic clustering) may ask for derived output that the source does not contain. These must be documented in `notes` with the reason.

---

## R8 — Question scope must match gold-set scope

Plural-scope language ("across earnings calls," "in each quarter," "over the past N years") implies the gold set covers multiple periods or sources. If the gold set is a single document, rewrite the question to be singular, or expand the gold set and tag `"temporal": true`.

**Test:** count plural-implying phrases. Count gold-set documents. They must be consistent.

---

## Common patterns to watch for

1. **Transcript questions over-quote.** Transcripts are conversational and the phrasing is memorable. Every transcript question is high-risk for R1. Paraphrase aggressively; put verbatim into notes.

2. **Notes-as-confession.** If the notes field says "taxonomy derived by benchmark author" or "not in source data" without explaining it's intentional, that's a flag the question violates R7. Notes should explain context, not admit violations.

3. **Market-reactions answers leak methodology.** All 13 market-reactions questions show the significance methodology (baseline, threshold, multiplier) in the answer. That belongs in notes; the answer should state only the price move and the conclusion (significant / not significant).

4. **"Across / throughout / in each quarter" with a thin gold set.** R8 violation. The question implies breadth the gold set doesn't cover.

5. **Editorial conclusions in answer.** Interpretive framing ("fastest ramp in company history," "most widely used AI assistant globally") belongs in notes unless the source explicitly states it and it is the literal answer to the question.

---

## Question fields reference

```json
{
  "id": "category-NN",
  "category": "financials | transcript | sec | news | product | supply-chain | portfolio | time-series | market-reactions",
  "question": "The retrieval query",
  "answer": "Factual answer — paraphrased, no verbatim, no editorial",
  "answer_slugs": ["path/to/source-doc"],
  "answer_slug_pattern": "optional pattern for social/substack where exact slug varies",
  "notes": "Context, verbatim quotes for verification, methodology, intentional exceptions",
  "validated": true,
  "temporal": true,
  "ai_reviewed": true,
  "human_reviewed": false
}
```
