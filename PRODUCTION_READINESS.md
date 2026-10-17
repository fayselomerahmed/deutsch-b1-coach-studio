# Deployment readiness

Status: production build and repository checks verified in hosted CI; deployment security and end-to-end service checks are still required.

## Verified on 2026-10-17

Evidence: [CI run 39064138260](https://github.com/fayselomerahmed/deutsch-b1-coach-studio/actions/runs/39064138260), commit `949157f`.

- Clean `npm ci` on Node 24.21.0 in hosted CI.
- `npm test`: complete Vinext/Cloudflare production build and 15 passing checks.
- `npm run typecheck` and `npm run lint`: pass.
- Runtime tests cover curriculum draft structure, stricter publication quality, malformed records, stable-ID uniqueness, cross-origin write rejection, and minimum-build validation. Supplied minimum-build values must be finite, positive safe integers; omitted values default to `1`. Invalid values are rejected rather than coerced or rounded.
- Next.js is updated to 16.4.2 and the production-dependency audit reports zero known findings. The full toolchain audit still has advisories in development/build dependencies; a zero production-only audit does not certify bundled worker code as safe.
- Same-major security updates use Vite 8.3.4, Cloudflare's Vite plugin 1.64.0, and Wrangler 4.151.1. The resolved tree uses sharp 0.35.5, undici 7.29.1, and ws 8.21.0. A scoped Vinext override updates its pinned image-size parser from 2.0.2 to 2.0.4 without migrating Vinext's public API. The production build, 15 checks, type checking, lint, and zero-finding production-dependency audit all pass with this tree.

The test suite includes source-contract checks; it is not a browser or D1 integration suite. The hosted workflow repeats the build, tests, type checking, linting, and production-dependency audit.

## Important trust boundary

The authentication adapter reads identity headers supplied by a trusted hosting gateway. A standalone Worker that accepts those headers from the internet is **not secure**. Before deployment, ensure the gateway strips client-supplied identity headers, authenticates the user, and prevents direct access to an unprotected origin, or replace the adapter with independently verified sessions. Cross-origin write protection is defense in depth, not authentication.

The checked-in hosting project ID is unset. Supply your own deployment configuration privately. Never commit activation codes, API tokens, user exports, or database state.

## Required before accepting real users

- [ ] Trusted identity gateway/session verification and negative tests for spoofed headers, non-owner writes, and cross-site requests.
- [ ] D1 migrations, backups, recovery, concurrent publishing, rollback, entitlement expiry/revocation, and owner-activation race tests against a staging deployment.
- [ ] Request size/rate limits at the gateway; abuse controls for public metrics/access routes; bounded operational logs without private Access IDs.
- [ ] Complete and teacher-review baseline lesson and A1 vocabulary seeds before publication. Draft editing intentionally allows structurally valid seeds while publication retains the stricter quality gates.
- [ ] Browser checks for keyboard/screen-reader access, empty/error/loading states, editing, publishing, and restoration.
- [ ] Deployment-specific operator identity, privacy policy, private support/privacy contact, and retention/deletion process.
- [ ] Review framework advisories, dependency audit results, and the Vinext compatibility surface before every deployment.
- [ ] Resolve the remaining build-tool advisories described below before a production security claim. Do not expose development or preview servers publicly, and build only trusted source while this gate is open.

## Remaining dependency gates

The unresolved high advisory is [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); upstream lists no patched version as of 2026-10-17. It reaches this tree through `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch` and `vinext → vite-plugin-commonjs → vite-plugin-dynamic-import → fast-glob`. These tools process build/lint patterns, not user-supplied application form values. This reduces the exposure of this specific use, but does not remove the advisory. A safe fix needs upstream removal/repair or a reviewed toolchain migration, not a fictitious version override.

The remaining moderate chain is `drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild`. Its embedded esbuild is affected by the [development-server request exposure advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99). The database migration tooling is not an application server; never expose its development tooling publicly. The audit's automatic proposal downgrades Drizzle Kit to 0.18.1, which is not a safe drop-in fix for this schema/migration setup. Keep this as an explicit migration gate rather than running a forced downgrade.
