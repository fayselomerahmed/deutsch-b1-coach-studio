import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isSupportedContentFile, validateContentCollection, validateDraftCollection } from "../lib/content-catalog.ts";

const fixture = async (name) => JSON.parse(await readFile(new URL(`../public/curriculum/${name}.json`, import.meta.url), "utf8"));

test("opens every bundled curriculum collection as an editable draft", async () => {
  for (const name of ["lessons", "grammar", "vocab_a1", "vocab_a2", "vocab_b1", "quizzes", "practical_missions", "everyday_phrases"]) {
    const values = await fixture(name);
    assert.equal(validateDraftCollection(name, values).length, values.length);
  }
});

test("keeps publication quality gates stronger than seed-draft validation", async () => {
  for (const name of ["lessons", "vocab_a1"]) {
    const values = await fixture(name);
    assert.throws(() => validateContentCollection(name, values));
  }
  for (const name of ["grammar", "vocab_a2", "vocab_b1", "quizzes", "practical_missions", "everyday_phrases"]) {
    assert.ok(validateContentCollection(name, await fixture(name)).length > 0);
  }
});

test("rejects unsupported paths, empty collections and duplicate stable IDs", async () => {
  assert.equal(isSupportedContentFile("../../secret"), false);
  assert.throws(() => validateContentCollection("quizzes", []), /at least one/);
  const values = await fixture("quizzes");
  assert.throws(() => validateContentCollection("quizzes", [values[0], values[0]]), /same unique ID/);
});

test("rejects incompatible nested records, levels, and quiz answer choices", async () => {
  const values = await fixture("quizzes");
  const missing = structuredClone(values);
  delete missing[0].prompt;
  assert.throws(() => validateContentCollection("quizzes", missing));
  const level = structuredClone(values);
  level[0].level = "C2";
  assert.throws(() => validateContentCollection("quizzes", level), /unsupported CEFR/);
  const answer = structuredClone(values);
  answer[0].correctAnswer = "not in choices";
  assert.throws(() => validateContentCollection("quizzes", answer), /correct answer/);
});
