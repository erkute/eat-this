# Dependency security audit — 2026-06-10

## Applied

- Next.js `15.5.15` → `15.5.19` to resolve the reported high-severity Next.js advisories.
- Updated compatible Next.js app dependencies and development tooling within their current major versions.
- Overrode Next.js's transitive PostCSS dependency to `^8.5.15`.
- Synced local Sanity Studio packages to the declared `5.30.0` runtime version.
- Updated `actions/checkout` and `actions/setup-node` from v4 to v5.

## Remaining audit findings

### Next.js app: 8 moderate

All remaining findings come from `firebase-admin@13.10.0` and its Google Cloud
dependency tree. `firebase-admin@14` resolves them, but requires Node `>=22`;
App Hosting currently runs `nodejs20`. Upgrade the runtime and Admin SDK
together in a dedicated migration.

### Sanity Studio: 13 moderate

All remaining findings come from Sanity's internal UUID dependency tree.
`npm audit fix --force` incorrectly proposes downgrading Sanity and Vision from
v5 to v2/v3. Do not apply that downgrade. Recheck after future Sanity releases.

## Verification

- `npm ci` succeeds for `nextjs/` and `studio/`.
- Next.js tests, lint, and production build pass.
- Sanity Studio build passes.
