# Deutsch Coach Curriculum Studio

The secure, hosted curriculum management system for the Deutsch B1 Coach iOS app.

## Owner workflow

1. Sign in with ChatGPT using the activated owner account.
2. Choose one curriculum section from the navigation.
3. Search or filter the existing app content.
4. Add, edit, duplicate, or remove records with the guided editor.
5. Publish the finished section to connected iPhones.

Edits remain private drafts until the owner selects **Publish to app**. Every publish creates a version that can be rolled back. Removing a live section returns devices to the curriculum included in their installed app.

## Safety model

- Learner reads are public and read-only.
- Publishing requires the activated owner identity.
- Every payload is validated, hashed with SHA-256, and versioned.
- The editor starts from the exact bundled app curriculum when no custom version exists.
- The iOS app retains its last verified content and works offline.

## Local verification

Requires Node.js `>=22.13.0`.

```bash
npm install
npm test
```
