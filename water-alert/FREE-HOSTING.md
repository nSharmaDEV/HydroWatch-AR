# Free-only hosting — configuration and remaining gate

The user approved **Vercel Hobby + Supabase Free PostgreSQL + Cloudflare Workers
Free**, replacing the initially suggested Neon database after quota review.
With subsequent approval, linked the Vercel Hobby project and provisioned the
Supabase project/private tables and runtime role. The user saved the runtime
connection and project CA privately in ignored local `.env`; verified the app's
read-only Node connection through the transaction pooler with verified TLS.
Cloud operation and push remain disabled. No deployment or scheduler activation
has occurred. See [VERCEL.md](VERCEL.md) for the setup record.
No paid plans, trials requiring payment, add-ons or automatic upgrades are authorized.

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
deployment remain unverified.

## Scheduled Worker implemented locally

`scheduler/worker.ts` is a small dependency-free scheduled trigger. It sends one
authenticated GET to the exact HTTPS origin's `/api/cron`, with a 150-second
timeout and redirects rejected. It cancels the response body and reports only
generic failures, not secrets or upstream response bodies. Agency parsing, SQL
coordination and notification sending remain in the Vercel function.

`scheduler/wrangler.json` schedules `*/5 * * * *` but ships with `ENABLED=false`,
no production origin, no secrets, and no HTTP/preview URL. Tests exercise it with
an injected local transport; the actual Cloudflare runtime has not been tested.

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
   deploy are remote changes and have not been run here.
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
