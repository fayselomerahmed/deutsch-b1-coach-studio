# Deutsch Coach Curriculum Studio

The content-management companion to [Deutsch B1 Coach for iOS](https://github.com/fayselomerahmed/deutsch-b1-coach-ios): edit course material, publish versioned updates, and keep the mobile learning experience offline-capable.

TypeScript · React · Next.js App Router · Vinext · Cloudflare Workers · D1 · Drizzle ORM

[![Build and tests](https://github.com/fayselomerahmed/deutsch-b1-coach-studio/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/fayselomerahmed/deutsch-b1-coach-studio/actions/workflows/build.yml)

## Why a companion service?

Curriculum editing should not require an iOS release for every change, and a learner should not lose access when the server is unavailable. The studio publishes versioned content files; the mobile app validates and retains them locally. Learning progress remains on the iPhone rather than in this dashboard's database.

## Implemented

- Guided editors for lessons, grammar, vocabulary, quizzes, practical missions, and everyday phrases.
- Draft editing, explicit publication, version history, and rollback.
- Bundled curriculum as an editing baseline when no live collection is published.
- Trial/full-access management using hashed app Access IDs.
- Public curriculum reads and owner-checked management routes.
- Aggregate event/build counts rather than learner recordings or study answers.

## Engineering highlights

**A stable contract with the iOS client.** [Publishing](app/api/admin/content/route.ts) validates a supported collection and its SHA-256 digest, then writes the current file and version history in a D1 batch. Minimum-build targeting supports client compatibility. Hashing checks integrity; it is not a substitute for authenticated publishing.

**Drafts and releases have different validation needs.** The [content catalog](lib/content-catalog.ts) checks structure for incremental draft editing and applies stronger quality rules before publication. This allows incomplete seed material to be improved without weakening the publication gate.

**Explicit trust and privacy boundaries.** Owner checks protect writes; [request protection](lib/request-security.ts) rejects cross-origin browser mutations. The [identity adapter](app/chatgpt-auth.ts) relies on a trusted gateway—not arbitrary internet-supplied headers. [Access records](db/entitlement-store.ts) store hashes and suffixes of Access IDs separately from curriculum and aggregate metrics.

## Verified build and checks

The [verified CI run](https://github.com/fayselomerahmed/deutsch-b1-coach-studio/actions/runs/39037286238) passed a clean Node 24 installation, production build, **11 automated checks**, TypeScript validation, ESLint, and the production-dependency audit on 2026-10-17.

Checks cover runtime content validation, malformed records, duplicate IDs, cross-origin rejection, and source contracts. They are not browser or D1 end-to-end tests. The full build-tool audit still has documented upstream advisories; a passing production-only audit is not a blanket security certification.

## Run locally

Use Node 24, as pinned in `.nvmrc` and verified in [CI](.github/workflows/build.yml).

```bash
git clone https://github.com/fayselomerahmed/deutsch-b1-coach-studio.git
cd deutsch-b1-coach-studio
npm ci
npm run dev
```

```bash
npm run typecheck
npm run lint
npm test
```

`npm test` runs the production build and automated checks. The Cloudflare runtime requires a D1 binding named `DB`; see [Vite configuration](vite.config.ts), [schema](db/schema.ts), and [migrations](drizzle). Owner activation requires a privately configured `ACTIVATION_CODE` and authenticated gateway identity. No deployment credentials or active hosting project are included.

## Deployment scope

This repository is a companion engineering project, not a ready-to-deploy standalone authentication service. A deployment must strip client-supplied identity headers and prevent access around the trusted gateway, or replace the adapter with independently verified sessions. Database recovery, browser/service integration tests, private support/privacy contact, and remaining dependency issues are explicit [deployment gates](PRODUCTION_READINESS.md).

[Owner portal](app/admin-portal.tsx) · [Mobile content route](app/rest/v1/app_content/route.ts) · [Tests](tests) · [Security](SECURITY.md)
