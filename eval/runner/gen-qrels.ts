#!/usr/bin/env bun
/**
 * Generate eval/data/gold/financebrain-qrels.json from questions.json.
 *
 * This is the one-way derivation: questions.json is the authoring source
 * (UI reads it, humans edit it); the qrels file is the scorer input and
 * must never be used by adapters. Re-run whenever questions.json changes.
 *
 * Usage: bun eval/runner/gen-qrels.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR   = join(import.meta.dirname, "../data/financebrain-v1");
const GOLD_DIR   = join(import.meta.dirname, "../data/gold");
const OUT_PATH   = join(GOLD_DIR, "financebrain-qrels.json");

type RawQuestion = {
  id: string;
  answer_slugs?: string[];
  answer_slug_pattern?: string;
  temporal?: boolean;
};

const { queries } = JSON.parse(readFileSync(join(DATA_DIR, "questions.json"), "utf8")) as {
  queries: RawQuestion[];
};

const qrels = {
  version: 1,
  _comment:
    "FinanceBrain gold qrels — scorer-only input. Never loaded by adapters. " +
    "Generated from questions.json by gen-qrels.ts. Do not edit by hand.",
  queries: queries.map(q => {
    const relevant = (q.answer_slugs ?? []).map(s => s.toLowerCase());
    const entry: Record<string, unknown> = {
      id: q.id,
      relevant,
      grades: Object.fromEntries(relevant.map(s => [s, 3])),
    };
    if (q.answer_slug_pattern) entry.relevant_pattern = q.answer_slug_pattern.toLowerCase();
    if (q.temporal)            entry.temporal = true;
    return entry;
  }),
};

writeFileSync(OUT_PATH, JSON.stringify(qrels, null, 2) + "\n");
console.log(`Written ${qrels.queries.length} qrels → ${OUT_PATH}`);
