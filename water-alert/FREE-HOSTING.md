# Free-only hosting — configuration and remaining gate

The user approved **Vercel Hobby + Supabase Free PostgreSQL + Cloudflare Workers
Free**, replacing the initially suggested Neon database after quota review.
With subsequent approval, linked the Vercel Hobby project and provisioned the
Supabase project/private tables and runtime role. The user saved the runtime
connection and project CA privately in ignored local `.env`; verified the app's
read-only Node connection through the transaction pooler with verified TLS.
Production cloud operation is now enabled at `https://water-alert-blond.vercel.app`;
push remains disabled. Initial HTTPS/API/cron protection and real feed retrieval /
database persistence checks passed. Separately approved Cloudflare scheduler
activation was registered October 17. Bounded read-only observation caught the
18:00 UTC trigger ending with an exception; PostgreSQL and public API retrieval
times remained at 17:34 UTC, before activation. Subsequent diagnosis reproduced workerd rejecting the deployed
`redirect: 'error'` option before sending a request. The local repair uses supported
`manual` mode and rejects redirect responses without following them; all 218 tests,
build and ad-hoc workerd checks pass. With separate explicit approval, deployed
version `f3cc8086-68bd-449b-9813-7397fad042cf`; read-only API verification at
18:21:05 UTC confirmed the unchanged schedule, secret binding, exact origin and
disabled public/preview URLs. The natural 18:25 UTC event completed `ok` with zero
exceptions. At 18:25:22 UTC, read-only verified-TLS PostgreSQL checks confirmed
successful ADH (30 records) and ADEQ (52 records) retrievals at 18:25:20 UTC,
matching validated captures and public API snapshots. Push stayed disabled.
Subsequently, the user reported the laptop off approximately 1:30–2:00 p.m. CDT
October 17. Read-only verification at 19:01 UTC found successful ADH/ADEQ check
journal entries at 18:35, 18:40, 18:45 and 18:55 UTC during that interval, with public
status matching durable state and push still disabled. This supports the bounded
laptop-off check, based on user-reported power times; it does not establish exact
five-minute retrieval cadence (a ten-minute gap is present) or day-long reliability. See steps 6–7 in
`CAC-CHECKLIST.md` for the dated evidence. No manual refresh or send was performed.
See [VERCEL.md](VERCEL.md) for the dated setup and verification record.
No paid plans, trials requiring payment, add-ons or automatic upgrades are authorized.

October 14: after a prior tool-output exposure, the user privately rotated the
runtime credential, updated ignored `.env` and confirmed readiness. Read-only TLS
verification passed before the user reauthorized deployment. The replacement URL
was transferred privately to Vercel Production. Cloudflare execution verification,
VAPID and device-send gates remain open; laptop-off checking is not established.

## Why the database plan changed

Neon's current Free plan includes **100 CU-hours per project per month** and
suspends after **five idle minutes**. Continuous five-minute checks can prevent
suspension. At minimum 0.25 CU, a 31-day month consumes `0.25 × 24 × 31 = 186`
CU-hours, before browser polling/manual checks. Exhausting free compute suspends
the database until the next billing period. The proposed Neon setup therefore
does **not** support a claim of continuous free monthly operation.

Do not silently slow checks: the app treats records older than 15 minutes as
unavailable. A slower cron alone also does not bound database activity from
browser traffic.

Approved replacement: Supabase Free used only as PostgreSQL, with the existing
backend. Current published limits: 500 MB database,
5 GB egress, two active projects, pausing after one week of inactivity; no automatic
backups or uptime SLA. It has no published monthly CU-hour allowance like Neon's.
This is a prototype option, not an unlimited/free reliability guarantee. Verify
pooler/TLS/custom-role behavior and private-schema permissions before deployment.
No browser Supabase client, Auth account system or public Data API is needed.

## Supabase setup prepared locally

After separate provisioning authorization, create a **Free organization/project**,
not a project inside a paid organization. No paid IPv4 add-on, dedicated pooler,
branching, custom domain or backup add-on. Monitor the free storage/egress quotas.

- Use the dashboard **Connect → Transaction pooler** string for production
  `DATABASE_URL`, port 6543. Copy the actual host; do not invent it from the region.
  The custom role username is `water_alert_runtime.PROJECT_REF`. Percent-encode
  reserved password characters. The URL stays server-side, never `VITE_*`.
- For schema initialization, use the direct administrative connection on an
  IPv6-capable network, or the free session pooler on port 5432 for IPv4. Set private
  `DATABASE_URL_ADMIN` and run `npm run db:migrate` only after authorization.
- `server/database-connection.ts` caps each warm function at one connection,
  verifies TLS certificates and strips URL options that could override verification.
  Queries use unnamed parameters and short explicit transactions, not persistent
  session state or named prepared statements.
- If the endpoint needs the project's CA, download it from Database settings and
  set `DATABASE_SSL_CA` to the PEM text privately. Both runtime and migration use
  it; otherwise system certificate roots apply. Never use `rejectUnauthorized=false`.
- Apply `server/runtime-role.sql` once through the approved administrative session
  **after** the schema migration. It creates a non-login, non-privileged role,
  grants only CRUD on the four app tables, enables RLS with server-only policies,
  and revokes access from PUBLIC and existing anon/authenticated/service_role roles.
  An existing runtime role causes rollback rather than silently changing it.
- In an authorized interactive `psql` administrative session, use
  `\password water_alert_runtime` to set its private password without a SQL literal
  or shell argument, then `ALTER ROLE water_alert_runtime LOGIN;`. No password is
  included in repository SQL. Verify actual pooler login and restricted permissions.
- Keep `water_alert` out of exposed Data API schemas. Do not use the administrator
  connection or Supabase service-role API key as the application's runtime credential.

Local embedded-Postgres tests verify runtime CRUD, denied DDL/TRUNCATE, RLS flags
and denied browser-role access. Hosted checks also verified grants/RLS, runtime
CRUD with rolled-back writes, browser-role read denial, and runtime login through
the transaction pooler with verified TLS. Hosted concurrency, quotas and Vercel
load behavior remain unverified. Initial Vercel deployment and source persistence
are now verified; see the dated results in `VERCEL.md`.

## Scheduled Worker — approved activation registered October 17

`scheduler/worker.ts` is a small dependency-free scheduled trigger. It sends one
authenticated GET to the exact HTTPS origin's `/api/cron`, with a 150-second
timeout and redirects rejected. It cancels the response body and reports only
generic failures, not secrets or upstream response bodies. Agency parsing, SQL
coordination and notification sending remain in the Vercel function.

`scheduler/wrangler.json` now specifies `*/5 * * * *` with `ENABLED=true`,
no secrets, and no HTTP/preview URL. With setup-only approval on October 17, its
origin was set to `https://water-alert-blond.vercel.app`. All five local scheduler
tests pass. After user OAuth login and dashboard confirmation of Workers Free,
uploaded `water-alert-scheduler` with a private secret binding and an explicit
empty cron list using temporary configuration (the tracked cron plan is unchanged).
CLI returned a partial-trigger error 10063 requiring initial account workers.dev
subdomain setup. Subsequent read-only API checks verified `ENABLED=false`, exact
origin, secret binding, zero schedules and disabled public/preview URLs. No secret
values were printed; temporary secret/config files were removed. Activation and a
successful authenticated production invocation remain unverified. Tests exercise
an injected local transport; the actual Cloudflare runtime has not been tested.

After the user completed subdomain onboarding and explicitly approved activation,
deployed version `4d16daed-7bcb-4a17-841c-8f42358f4f2f`. At
2026-10-17T17:51:07Z, read-only API verification confirmed `ENABLED=true`, exact
origin, retained private secret binding, `*/5 * * * *` schedule registered at
17:50:58Z, and disabled public/preview URLs. All five scheduler tests pass; public
push configuration remains disabled. Schedule registration is not proof of a
successful authenticated run, laptop-off operation or sustained reliability.

Cloudflare Workers Free currently permits five cron triggers/account, 100,000
requests/day and 10 ms CPU/invocation. One five-minute trigger is 288 daily
invocations; waiting on the Vercel network request is not CPU time. Measure real
Worker CPU use rather than assuming compliance. Cron can be delayed or fail;
provider acceptance never proves device arrival. Push retry opportunities are
now five-minute, not one-minute. Vercel Hobby Fluid supports the configured
180-second function duration, but CPU/memory/transfer quotas still need monitoring.

## Steps only after separate account/deployment authorization

1. Provision the approved free database project, apply the existing
   migration and restricted runtime grants following `VERCEL.md`.
2. Link the Vercel Hobby project and configure production variables privately.
   Keep push disabled until consenting-device testing is authorized.
3. Set `scheduler/wrangler.json` vars `WATER_ALERT_ORIGIN` to the exact canonical
   production origin; retain `ENABLED=false`. Choose the correct Cloudflare Free
   account when authenticating. Do not add a paid custom domain.
4. From `water-alert/scheduler/`, after authorization:

   ```sh
   npx wrangler login
   npx wrangler secret put CRON_SECRET
   npx wrangler deploy
   ```

   Enter the same private `CRON_SECRET` as Vercel through the prompt, never as a
    command argument, committed variable or chat message. Worker secret setup and
    deployment are remote changes; the October 17 approved setup is recorded above.
5. Verify protected API responses/routing and free plan selection, then change
   `ENABLED` to `true` and redeploy only with approval. Cron changes can take time
   to propagate. Verify fresh checks with this computer off and monitor quotas.
6. To pause scheduled checking, set `ENABLED=false` and redeploy with approval.
   Preserve the database. The app must become unavailable when freshness expires;
   pausing cron also pauses retries and scheduled device pruning.

## Verified references (October 13, 2026)

- https://neon.com/pricing
- https://supabase.com/pricing
- https://supabase.com/docs/guides/database/connecting-to-postgres.md
- https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL
- https://developers.cloudflare.com/workers/platform/limits/
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/cron-jobs/usage-and-pricing
