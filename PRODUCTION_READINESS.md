# Deployment readiness

Status: production build verified locally; deployment security and end-to-end service checks are still required.

## Verified on 2026-10-17

- Clean `npm ci` on Node 24.19.0.
- `npm test`: complete Vinext/Cloudflare build and 11 passing checks.
- `npm run typecheck` and `npm run lint`: pass.
- Runtime tests cover curriculum draft structure, stricter publication quality, malformed records, stable-ID uniqueness, and cross-origin write rejection.
- Next.js is updated to 16.4.2 and the production-dependency audit reports zero known findings. The full toolchain audit still has advisories in development/build dependencies; a zero production-only audit does not certify bundled worker code as safe.

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
- [ ] Resolve the remaining Vinext/Vite/Cloudflare/Drizzle build-tool advisories in a separately tested toolchain upgrade. Do not expose development or preview servers publicly or deploy unreviewed uploaded images while this gate is open.
