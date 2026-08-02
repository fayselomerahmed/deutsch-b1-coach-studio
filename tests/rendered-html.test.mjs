import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the branded owner portal without starter content", async () => {
  const [page, layout, portal, styles, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/admin-portal.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page + layout, /Deutsch Coach Curriculum Studio/);
  assert.match(layout, /app-icon\.png/);
  assert.match(portal, /Sign in with ChatGPT/);
  assert.match(portal, /Add.*singular/);
  assert.match(portal, /Publish to app/);
  assert.match(portal, /Duplicate/);
  assert.match(portal, /Remove/);
  assert.match(portal, /Restore previous version/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.doesNotMatch(page + layout + portal, /codex-preview|Your site is taking shape/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("public/app-icon.png", root));
});

test("includes the app curriculum as the safe editing baseline", async () => {
  const names = [
    "grammar",
    "vocab_a1",
    "vocab_a2",
    "vocab_b1",
    "lessons",
    "quizzes",
    "practical_missions",
    "everyday_phrases",
  ];

  for (const name of names) {
    const payload = JSON.parse(await readFile(new URL(`public/curriculum/${name}.json`, root), "utf8"));
    assert.ok(Array.isArray(payload));
    assert.ok(payload.length > 0);
    assert.equal(new Set(payload.map((item) => item.id)).size, payload.length);
  }
});

test("keeps learner reads public and owner writes authenticated", async () => {
  const [publicRoute, writeRoute, activationRoute, schema, validator, publicAccessRoute, adminAccessRoute, entitlementStore] = await Promise.all([
    readFile(new URL("app/rest/v1/app_content/route.ts", root), "utf8"),
    readFile(new URL("app/api/admin/content/route.ts", root), "utf8"),
    readFile(new URL("app/api/admin/activate/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("lib/content-catalog.ts", root), "utf8"),
    readFile(new URL("app/api/access/entitlement/route.ts", root), "utf8"),
    readFile(new URL("app/api/admin/entitlements/route.ts", root), "utf8"),
    readFile(new URL("db/entitlement-store.ts", root), "utf8"),
  ]);

  assert.match(publicRoute, /export async function GET/);
  assert.doesNotMatch(publicRoute, /getChatGPTUser|verifyOwner/);
  assert.match(writeRoute, /verifyOwner/);
  assert.match(writeRoute, /sha256Hex/);
  assert.match(activationRoute, /activationCode/);
  assert.match(schema, /contentVersions/);
  assert.match(validator, /validateContentCollection/);
  assert.match(validator, /correct answer must exactly match one answer choice/i);
  assert.doesNotMatch(publicAccessRoute, /getChatGPTUser|verifyOwner/);
  assert.match(publicAccessRoute, /export async function POST/);
  assert.doesNotMatch(publicAccessRoute, /searchParams|get\("access_id"\)/);
  assert.match(adminAccessRoute, /verifyOwner/);
  assert.match(entitlementStore, /SHA-256/);
  assert.match(entitlementStore, /access_entitlements/);
});

test("ships guided trial and full-access administration", async () => {
  const [portal, migration] = await Promise.all([
    readFile(new URL("app/admin-portal.tsx", root), "utf8"),
    readFile(new URL("drizzle/0001_happy_jackpot.sql", root), "utf8"),
  ]);

  assert.match(portal, /full version/);
  assert.match(portal, /Trial/);
  assert.match(portal, /Access IDs are hashed before storage/);
  assert.match(migration, /access_entitlements/);
});

test("ships opt-in aggregate product health without learner identifiers", async () => {
  const [eventRoute, adminRoute, metricStore, portal, privacy, migration] = await Promise.all([
    readFile(new URL("app/api/analytics/event/route.ts", root), "utf8"),
    readFile(new URL("app/api/admin/metrics/route.ts", root), "utf8"),
    readFile(new URL("db/metric-store.ts", root), "utf8"),
    readFile(new URL("app/admin-portal.tsx", root), "utf8"),
    readFile(new URL("app/privacy/page.tsx", root), "utf8"),
    readFile(new URL("drizzle/0002_useful_tenebrous.sql", root), "utf8"),
  ]);

  assert.match(eventRoute, /validateMetricEvent/);
  assert.doesNotMatch(eventRoute, /getChatGPTUser|verifyOwner|deviceId|email|transcript/i);
  assert.match(adminRoute, /verifyOwner/);
  assert.match(metricStore, /GROUP BY day, event/);
  assert.match(metricStore, /PRIMARY KEY \(day, event, app_build\)/);
  assert.doesNotMatch(metricStore, /user_id|device_id|email|transcript|recording/i);
  assert.match(portal, /Product health/);
  assert.match(portal, /Intl\.NumberFormat\("de-DE"/);
  assert.match(privacy, /off by default/i);
  assert.match(migration, /product_metrics/);
});
