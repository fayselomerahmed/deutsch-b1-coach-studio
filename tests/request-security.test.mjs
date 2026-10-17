import assert from "node:assert/strict";
import test from "node:test";
import { rejectCrossOriginWrite } from "../lib/request-security.ts";

test("allows same-origin mutations and authenticated non-browser clients", () => {
  for (const headers of [{}, { origin: "https://studio.example.com", "sec-fetch-site": "same-origin" }]) {
    assert.equal(rejectCrossOriginWrite(new Request("https://studio.example.com/api/admin/content", { method: "POST", headers })), null);
  }
});

test("rejects foreign, opaque, malformed and cross-site browser origins", () => {
  for (const headers of [
    { origin: "https://attacker.example" },
    { origin: "null" },
    { origin: "not-a-url" },
    { "sec-fetch-site": "cross-site" },
  ]) {
    assert.equal(rejectCrossOriginWrite(new Request("https://studio.example.com/api/admin/content", { method: "POST", headers }))?.status, 403);
  }
});
