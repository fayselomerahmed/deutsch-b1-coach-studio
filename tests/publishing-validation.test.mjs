import assert from "node:assert/strict";
import test from "node:test";
import { parseMinimumBuild } from "../lib/publishing-validation.ts";

test("defaults an omitted minimum build to one", () => {
  assert.equal(parseMinimumBuild(undefined), 1);
});

test("accepts positive safe integer build numbers without rounding", () => {
  for (const value of [1, 42, Number.MAX_SAFE_INTEGER]) {
    assert.equal(parseMinimumBuild(value), value);
  }
});

test("rejects nonfinite, fractional, nonpositive, and unsafe builds", () => {
  for (const value of [NaN, Infinity, -Infinity, 1.5, 0, -1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => parseMinimumBuild(value), /positive safe integer/);
  }
});

test("does not coerce strings, null, booleans or structured JSON values", () => {
  for (const value of ["1", "", "Infinity", null, true, false, [], [1], {}]) {
    assert.throws(() => parseMinimumBuild(value), /positive safe integer/);
  }
});
