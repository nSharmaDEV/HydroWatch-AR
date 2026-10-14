# Water Alert — Vercel deployment playbook

## Goal and current boundary

The user selected a Vercel-native backend. Code is implemented locally. On
2026-10-13, with explicit approval, the `water-alert/` directory was linked to
the new `water-alert` project in the verified Hobby/free workspace
`nirmays06-3523s-projects`. No Git integration or deployment was created.
Also created the separate Supabase organization `Water Alert`
(`vcbtwkiieuqxvxlwnczt`). The user privately created `WellPower: WAVE`
(`eeuknpzklzoijvjsshwx`, us-east-1). With subsequent explicit approval, applied
`server/migrations/001-cloud.sql` and `server/runtime-role.sql` through
`supabase db query --linked --project-ref eeuknpzklzoijvjsshwx --file <absolute-path>`.
Hosted checks confirmed four tables with RLS, restricted runtime CRUD (test writes
rolled back), and browser-role read denial. The user subsequently set the runtime
password privately and enabled LOGIN. Verified port-6543 pooler login with verified
TLS in `psql` and a read-only Node `pg` query using the app's `databaseOptions`.
Runtime URL and project CA are saved only in ignored local `.env` (mode 0600),
with cloud operation and push disabled. Hosted concurrency checks remain pending.
No paid plan, VAPID key generation, deployment or external push send has occurred.
This document is not authorization for further work.

Vercel serves `dist/` and routes `/api/*` to `api/index.ts`. No listening server,
background timer or filesystem persistence runs in the cloud path. PostgreSQL stores
observations, subscriptions, latest source captures, leases and rate counters. The
existing local Node/filesystem implementation remains available independently.

## Decisions before provisioning

- User requires **free-only** hosting. Vercel Hobby serves the app/API; a separate
  Cloudflare Workers Free cron invokes the API every five minutes. `vercel.json`
  contains no Vercel cron. Sources still become unavailable after 15 minutes.
- Supabase Free PostgreSQL + Cloudflare was approved as an approach; subsequent
  approvals covered Vercel linking and database setup, not deployment or scheduling.
  Neon Free was replaced after reviewing its compute quota.
  See [FREE-HOSTING.md](FREE-HOSTING.md) for restricted role and free pooler setup.
  Use a dedicated PostgreSQL database and TLS-verified pooled runtime connection.
- Approve production HTTPS origin, VAPID contact/key setup and browser push services.
  Database URLs and private keys must never be pasted into chat or committed.
- Approve production deployment separately.

## Setup after authorization

From `water-alert/`:

```sh
npm ci
npm test
npm run build
npx vercel login
npx vercel link
```

Link this folder, not the repository root. Confirm scope before accepting project
creation prompts. Set Node 24 and Fluid compute with at least 180-second function
duration. Match the function region to the database. CLI build/routing and managed
database behavior have not been verified; they remain deployment gates.

Put the approved direct administrative URL in private `.env` as `DATABASE_URL_ADMIN`,
then run `npm run db:migrate`. This applies `server/migrations/001-cloud.sql` with
verified TLS; builds/requests never run migrations. Provision a separate runtime
role through the approved provider. Grant only schema usage and SELECT/INSERT/UPDATE/
DELETE on the four `water_alert` tables. Never grant PUBLIC/browser-data-API access,
runtime DDL permissions or runtime superuser credentials.

### Production variables

| Variable | Requirement |
|---|---|
| `WATER_ALERT_CLOUD_ENABLED` | Literal `true` after provisioning approval |
| `WATER_ALERT_ORIGIN` | Exact canonical HTTPS origin, no path/trailing slash |
| `DATABASE_URL` | Restricted PostgreSQL runtime connection; pooler recommended |
| `DATABASE_SSL_CA` | Optional project CA PEM for verified TLS; runtime and migration |
| `CRON_SECRET` | Random 32–128 character base64url secret; scheduled Worker sends its bearer |
| `WATER_ALERT_PUSH_ENABLED` | Start with `false`; literal `true` enables push |
| `VAPID_PUBLIC_KEY` | Required when push enabled; this key alone is public |
| `VAPID_PRIVATE_KEY` | Required when enabled; secret, never `VITE_*` |
| `VAPID_SUBJECT` | Approved real `mailto:` contact or HTTPS URL |

Scope secrets to Production. Platform-provided `VERCEL_ENV` must be `production`;
preview/development cloud requests fail closed with 503. Previews may show sample UI,
but cannot use production subscriptions/checks. An isolated test deployment needs
its own approved project/database/devices, not production secrets in Preview.

Only after explicit approval, `npx vercel --prod` publishes. Configure the separate
scheduled Worker after the database gate is resolved; an API deployment alone does
not establish scheduled checking. Stay on free plans; never enable paid upgrades.

## Scheduling and coordination

`GET /api/cron` authenticates with constant-time bearer comparison and no-store
responses. The scheduled Worker invokes it every five minutes; the shared cooldown
prevents duplicate source checks, with push retries/pruning each invocation. Manual
checks use a shared 60-second cooldown. Only the two approved feeds are fetched;
strict parsers, 15-second timeouts, first-check baselines and failure states remain.

Shared leases suppress overlapping jobs: source lease 120 seconds; push lease 150.
Tokens prevent an old worker releasing a newer lease. State mutations lock one JSONB
row in short transactions; source/push network calls run outside transactions. Push
claims/backoff are persisted before transport; acceptance is saved conditionally.
Deletion/resaving cannot be undone by a sender completion. An in-progress send cannot
be recalled; browser unsubscribe remains first. Crash-after-send can still duplicate.

Cloud drains attempt at most 10 notifications/invocation, each with a 10-second
transport timeout and five-minute TTL. Remaining work retries later. One-hour event
expiry remains; an 80-second drain budget stops starting further sends, leaving
headroom for source checks and final writes inside the 180-second function limit.
Future-only watches, healthy sources, unknown-status suppression and explicit
lifts remain required. Provider acceptance is never proof of device delivery.

Cloud mutation limits are shared: 30/minute per HMAC-hashed platform client address,
300/minute globally. Only the Vercel entry point trusts `x-vercel-forwarded-for`,
documented as platform-overwritten; missing/invalid addresses share a limited bucket.
Rate rows expire during mutations; no raw address is stored here. Review platform
logs separately. Origin checks are not bot authentication; edge/WAF review remains.

Two JSONB state documents retain the existing 1000-device/50-watch caps. This is a
bounded prototype, not verified full-capacity performance. Remote pooled concurrency,
load/security review and backup/deletion policies remain gates. Devices are pruned
on active cron/drain/update; paused/failing cron cannot guarantee wall-clock removal.

Local JSON data is not automatically imported. First cloud checks establish new
baselines without historical broadcasts. Any archive/subscription migration needs
separate consent, retention review and a baseline-preserving procedure.

## Verification and rollback

Check real-deployment API/worker routing, freshness with this computer off, cron 401
without authorization, exact origins, no-store headers, restart/persistence and
source-failure states. Exercise concurrent invocations on the hosted pooler. Local
tests use embedded PostgreSQL (PGlite), not a hosted database or Vercel emulator.

Verify consenting real devices, especially installed iPhone iOS 16.4+ PWA, using an
approved isolated test setup: new/lift payloads, closed-browser arrival, links,
language/watch changes, deletion and failure recovery. Never fabricate production
notices or broadcast tests to other users. `DEPLOYMENT.md` has the device checklist.

To pause sends, disable push and redeploy with approval; leave cloud enabled so
checks, deletion and pruning work. Preserve database records; never restore deleted
subscriptions or roll back to a filesystem-writing handler on Vercel. Email remains
unimplemented; supplier/guidance and human review gates remain separate.

References checked during implementation:
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/headers/request-headers
