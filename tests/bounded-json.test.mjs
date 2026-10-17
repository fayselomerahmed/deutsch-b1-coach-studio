import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedJson } from "../lib/bounded-json.ts";

const requestFor = (body, headers = {}) => new Request("https://studio.example.com", {
  method: "POST", body, headers, duplex: "half",
});

test("parses JSON up to the exact byte limit", async () => {
  const body = '{"value":42}';
  assert.deepEqual(await readBoundedJson(requestFor(body), Buffer.byteLength(body)), { value: 42 });
});

test("rejects oversized bodies without Content-Length or with an understated header", async () => {
  for (const headers of [{}, { "content-length": "1" }, { "content-length": "invalid" }]) {
    await assert.rejects(readBoundedJson(requestFor('{"value":42}', headers), 5), /too large/);
  }
});

test("stops and cancels an oversized streamed body before parsing it", async () => {
  let cancelled = false;
  let chunksRead = 0;
  const stream = new ReadableStream({
    pull(controller) {
      chunksRead += 1;
      controller.enqueue(new TextEncoder().encode('xxxxxxxx'));
    },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  await assert.rejects(readBoundedJson(requestFor(stream), 10), /too large/);
  assert.equal(cancelled, true);
  assert.equal(chunksRead, 2);
});

test("rejects a declared oversized body without reading its chunks", async () => {
  let chunksRead = 0;
  let cancelled = false;
  const stream = new ReadableStream({
    pull() { chunksRead += 1; },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  await assert.rejects(readBoundedJson(requestFor(stream, { "content-length": "11" }), 10), /too large/);
  assert.equal(chunksRead, 0);
  assert.equal(cancelled, true);
});

test("counts UTF-8 bytes and decodes characters split across chunks", async () => {
  const body = '{"word":"für"}';
  const bytes = new TextEncoder().encode(body);
  const stream = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      controller.close();
    },
  });
  assert.deepEqual(await readBoundedJson(requestFor(stream), bytes.length), { word: "für" });
  await assert.rejects(readBoundedJson(requestFor(body), body.length), /too large/);
});

test("rejects empty, malformed JSON, invalid UTF-8, and invalid limits", async () => {
  for (const body of ["", "not JSON", Uint8Array.of(0xff)]) {
    await assert.rejects(readBoundedJson(requestFor(body), 50));
  }
  for (const limit of [0, -1, 1.5, Infinity]) {
    await assert.rejects(readBoundedJson(requestFor("{}"), limit), /size limit/);
  }
});

test("cancels an invalid UTF-8 stream and releases its reader", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(Uint8Array.of(0xff)); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = requestFor(stream);
  await assert.rejects(readBoundedJson(request, 50), /encoded data/);
  assert.equal(cancelled, true);
  assert.equal(request.body.locked, false);
});
