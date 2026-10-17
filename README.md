# Deutsch Coach Curriculum Studio

My curriculum-management companion to [Deutsch B1 Coach for iOS](https://github.com/fayselomerahmed/deutsch-b1-coach-ios). It turns curriculum maintenance into a guided editing and publishing workflow, with versioned content that the mobile app can validate and retain offline.

**TypeScript · React · Next.js App Router · Vinext · Cloudflare Workers · D1 · Drizzle ORM**

## What it does

- Provides guided editors for lessons, vocabulary, grammar, quizzes, missions, and exam content.
- Keeps edits as drafts until an explicit publish action and supports restoring earlier published versions.
- Starts each section from the bundled iOS curriculum when no custom content has been published.
- Manages trial and full-access entitlements using hashed app Access IDs.
- Exposes public curriculum reads and authenticated owner-management endpoints.
- Includes aggregate product-health, privacy, and support pages.

## Engineering decisions

I use a content-file boundary between the editor and the iOS client: publishing validates a supported curriculum collection, checks its SHA-256 digest, and writes both the current version and its history in a D1 batch. A minimum-build field lets clients distinguish compatible content. The mobile app retains verified content locally, so editing the course does not make study dependent on a live connection.

Owner access is checked on write routes. The existing authentication adapter relies on identity headers supplied by the hosting gateway; an independent deployment must provide a trusted gateway or replace that adapter. SHA-256 checks content integrity; authenticated owner checks control publication.

Product-health storage uses daily event/build counts. Access entitlements and published curriculum have separate tables and routes, keeping these concerns distinct from curriculum editing.

## Owner workflow

1. Sign in with ChatGPT using the activated owner account.
2. Choose one curriculum section from the navigation.
3. Search or filter the existing app content.
4. Add, edit, duplicate, or remove records with the guided editor.
5. Publish the finished section to connected iPhones.

Edits remain private drafts until the owner selects **Publish to app**. Every publish creates a version that can be rolled back. Removing a live section returns devices to the curriculum included in their installed app.

## Source guide

- [Owner portal](app/admin-portal.tsx) — editing, publishing, rollback, and access-management UI.
- [Content catalog](lib/content-catalog.ts) — supported files and collection validation.
- [Publishing route](app/api/admin/content/route.ts) — owner verification, payload validation, and version writes.
- [Public content route](app/rest/v1/app_content/route.ts) — the mobile content contract.
- [Schema](db/schema.ts) and [migrations](drizzle) — content versions, entitlements, and aggregate metrics.
- [Authentication adapter](app/chatgpt-auth.ts) — host-provided identity and safe return paths.
- [Checks](tests/rendered-html.test.mjs) — source contracts, bundled curriculum, and privacy-related assertions.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Run the production build and repository checks with:

```bash
npm test
npm run typecheck
npm run lint
```

The Cloudflare runtime expects a D1 binding named `DB`. The local binding is configured through `.openai/hosting.json` and `vite.config.ts`; use your own database and hosting configuration for a deployment. Owner activation requires the `ACTIVATION_CODE` runtime secret and a trusted authenticated identity.

Local Wrangler state, installed dependencies, generated output, and credentials are intentionally excluded from version control.

## Validation and current status

The production build, 11 Node checks, TypeScript validation, and lint checks pass locally on Node 24.19.0. Tests exercise curriculum validation and cross-origin write rejection as well as source contracts; they do not exercise authentication, D1 writes, or a browser session end to end. Bundled lesson/A1 seeds can be edited as drafts but must meet stricter quality checks before publication.

See [deployment readiness](PRODUCTION_READINESS.md) for the trusted-gateway authentication boundary, service checks, and remaining release gates. Build/test and secret-scanning workflows run on pushes and pull requests.
