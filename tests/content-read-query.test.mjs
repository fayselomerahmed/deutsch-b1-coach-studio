import assert from "node:assert/strict";
import test from "node:test";
import { buildContentReadQuery } from "../lib/content-read-query.ts";

test("preserves full curriculum reads while never selecting owner metadata", () => {
  const { sql, bindings } = buildContentReadQuery();
  assert.match(sql, /, payload_base64 FROM content_files ORDER BY file_name$/);
  assert.doesNotMatch(sql, /published_by|SELECT \*/);
  assert.deepEqual(bindings, []);
});

test("metadata checks do not retrieve curriculum payloads from D1", () => {
  const { sql } = buildContentReadQuery({ includePayload: false });
  assert.match(sql, /^SELECT file_name, version, sha256, minimum_build, published_at FROM/);
  assert.doesNotMatch(sql, /payload_base64/);
});

test("filters requested curriculum files in SQL with bound values", () => {
  const { sql, bindings } = buildContentReadQuery({ includePayload: true, fileNames: ["lessons", "grammar"] });
  assert.match(sql, /WHERE file_name IN \(\?, \?\) ORDER BY file_name$/);
  assert.doesNotMatch(sql, /lessons|grammar/);
  assert.deepEqual(bindings, ["lessons", "grammar"]);
});

test("an empty valid-name filter cannot fall back to every curriculum payload", () => {
  const { sql, bindings } = buildContentReadQuery({ fileNames: [] });
  assert.match(sql, /WHERE 1 = 0 ORDER BY file_name$/);
  assert.deepEqual(bindings, []);
});

test("deduplicates the small allowlisted collection filter", () => {
  const { sql, bindings } = buildContentReadQuery({ includePayload: false, fileNames: ["grammar", "grammar"] });
  assert.match(sql, /WHERE file_name IN \(\?\) ORDER BY file_name$/);
  assert.deepEqual(bindings, ["grammar"]);
});
