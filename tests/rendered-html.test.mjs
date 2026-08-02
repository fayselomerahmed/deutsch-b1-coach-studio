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

  assert.match(page, /Deutsch Coach Content Studio/);
  assert.match(layout, /app-icon\.png/);
  assert.match(portal, /Sign in with ChatGPT/);
  assert.match(portal, /Choose JSON file/);
  assert.match(portal, /Roll back/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.doesNotMatch(page + layout + portal, /codex-preview|Your site is taking shape/i);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("public/app-icon.png", root));
});

test("keeps learner reads public and owner writes authenticated", async () => {
  const [publicRoute, writeRoute, activationRoute, schema] = await Promise.all([
    readFile(new URL("app/rest/v1/app_content/route.ts", root), "utf8"),
    readFile(new URL("app/api/admin/content/route.ts", root), "utf8"),
    readFile(new URL("app/api/admin/activate/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
  ]);

  assert.match(publicRoute, /export async function GET/);
  assert.doesNotMatch(publicRoute, /getChatGPTUser|verifyOwner/);
  assert.match(writeRoute, /verifyOwner/);
  assert.match(writeRoute, /sha256Hex/);
  assert.match(activationRoute, /activationCode/);
  assert.match(schema, /contentVersions/);
});
