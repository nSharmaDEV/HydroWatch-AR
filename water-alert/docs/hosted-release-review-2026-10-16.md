# Hosted release and secrets review — October 16, 2026

Read-only review of the current `water-alert/` worktree and public deployment.
Public observations were collected at **2026-10-17T03:00:20Z** (October 16 US time).
No application/configuration changes, deployment, source-check invocation, database
mutation, scheduler activation, permission request or notification send was made.
The companion logo concepts are separate design artifacts, not integrated assets.

## Outcome

**Basic hosting checks pass; fresh-data/continuous-operation readiness is not established.**
The deployment is still the older Water Alert build. Local WellPower: WAVE branding
and supplier-help work have not been published.

## Findings, in priority order

1. **Hosted observations are stale.** Both agencies' last successful checks were
   `2026-10-15T01:57:03Z`, about 49 hours before this review. The API returns stored
   observations and `error: null`; that is not freshness evidence. Local
   `src/domain.ts:28–32` explicitly marks data unavailable at 15 minutes, regardless
   of a null error. This review did not browser-verify the deployed stale display.
   No current-conditions or continuous-checking claim is justified.
2. **Opening the app does not retrieve agency feeds.** In the current worktree,
   `src/ConnectedApp.tsx` maps open/30-second polling to `GET /api/status`; only
   manual refresh calls `POST /api/check`. This matches the local label
   “Automatically refresh saved observations while this app is open,” but must not
   be described as checking the agencies on open. With scheduling inactive, a
   resident must manually refresh to request a new check. Decide whether that
   behavior is sufficient before approving a release or changing it.
3. **Hosted reliability gates remain unverified.** Cross-instance concurrency,
   cold-start/load behavior, actual scheduler account state, laptop-off freshness,
   backup/restore and deletion policy were not exercised. A successful status GET
   proves access to a persisted snapshot, not these behaviors. The checked-in
   scheduler has `ENABLED: "false"`; no remote scheduler inventory was inspected.
4. **Secret review is bounded, not a security certification.** See scope below.
   Existing operations notes record a prior credential exposure and subsequent
   user-confirmed private rotation. This review neither exposed nor rotated any
   credential and cannot independently prove revocation of the old password.

## Verified public checks

`npm run verify:hosting -- https://water-alert-blond.vercel.app` passed all six:

- HTTPS HTML without redirects and with `no-store`.
- Service-worker JavaScript with `no-store`.
- Two-agency status API JSON with `no-store`.
- Push explicitly disabled; no public VAPID key returned.
- Unauthenticated cron rejected with 401.
- Foreign-Origin status request rejected with 403.

The homepage title remains `Water Alert · Arkansas advisories`; its response has
a Content-Security-Policy header. No authenticated cron or manual check was called.

## Secrets and release controls

- Local `.env` is mode `0600`; `.env`, `.vercel/project.json`, private local device
  records and `.dev.vars` are gitignored. No tracked private-path candidates were
  found inside this app.
- Scanned 136 app/artifact files, excluding dependencies, private state and platform
  metadata. No exact matches for the checked local database URL/cron credential
  were found. Credential-URL pattern hits were confined to confirmed `.example`
  test fixtures. No private-key-block or checked provider-token pattern hits.
  Values were never printed. This is a limited pattern/exact-value scan, not a
  complete entropy, Git-history, remote deployment-artifact or platform-log audit.
- `.vercelignore` excludes env files, local data, key/certificate files and local
  tooling artifacts. `vite.config.ts` disables env-file loading for the UI build.
- API initialization fails closed outside explicitly enabled production; failures
  return generic 503 responses. Database connections enforce verified TLS, strip
  connection-string SSL overrides and use one pooled connection per pool.
- Reviewed source: exact-origin mutation controls, 16 KiB JSON limit, cron bearer
  comparison, database-backed mutation rate limits and token-checked leases exist.
  These are not proof of hosted abuse resistance or production concurrency.
- `npm audit --omit=dev --json` reported **zero production dependency advisories**
  at review time. Development dependencies were not audited in this pass.
- Current Vercel environment inventory, secret scoping, database grants/RLS,
  provider logs and historical Git objects were not re-audited. Earlier verification
  is recorded in `VERCEL.md`, not treated as newly observed here.

## Next authorization gates

Choose the on-open/manual-refresh release behavior first. Any implementation,
authenticated hosted checks, concurrency exercise, deployment or scheduler change
requires a separately scoped next step. Push remains disabled unless separately
authorized and verified on real devices. Preserve all existing records.
