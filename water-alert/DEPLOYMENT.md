# Water Alert — operations and authorization gates

## Current boundary

Code and local configuration only. No host, account, production VAPID key, external
notification send or publication was created. `WATER_ALERT_PUSH_ENABLED` defaults
to false. A service worker or saved subscription is not evidence of delivery.

The original local/container design is **one continuously running Node 24 service with durable
disk**, not serverless, ephemeral disk, multiple replicas or multiple writers.
Atomic JSON files and in-process locks do not coordinate across processes. Hosting
choice, HTTPS/reverse proxy, browser push services and contact/key configuration
require the user's approval. Do not treat this document as deployment permission.

The user subsequently selected a **Vercel-native** path. `api/index.ts` now uses
PostgreSQL state, shared leases/cooldowns/rate limits and authenticated scheduled
functions instead of local disk or timers. Read [VERCEL.md](VERCEL.md) for that
separate path: frequent cron requires Pro, provisioning/deployment remain gated,
and production/pooler/device verification has not occurred. The filesystem and
socket-rate-limit sections below describe the local/container path only.

## Local commands

From `water-alert/`, `npm ci`, `npm test`, `npm run build`.
`npm start` loads an optional `.env` and serves the built UI and API.
For same-origin built-UI rehearsal without sending, run:

```sh
WATER_ALERT_ORIGIN=http://localhost:8788 WATER_ALERT_PUSH_ENABLED=false npm start
```

Do not run another instance against a data directory already in use. Default
development UI uses `http://localhost:5178`; `127.0.0.1` is a different origin.
The API rejects mutations from absent, null or mismatching Origin headers.

`Dockerfile` builds with Node 24, serves the UI/API as a non-root user, and keeps
data outside image layers. `compose.yaml` is a **local** push-disabled rehearsal,
loopback port 8788 and its own `water-alert-live` named volume; it does not import
existing `data/live` records. Docker build/run has not been verified here. No
container or public TLS certificate has been created. `npm run icons` reproduces
the committed PNGs from the SVG using the installed Playwright Chromium browser.

## Environment

| Variable | Default / requirement |
|---|---|
| `WATER_ALERT_ORIGIN` | `http://localhost:5178`; exact public HTTPS origin for approved hosting, no path or trailing slash |
| `HOST` | `127.0.0.1`; image uses `0.0.0.0` behind an approved proxy |
| `PORT` | `8788`; integer 1–65535 |
| `WATER_ALERT_DATA_DIR` | This app's `data/live/`; use a durable isolated disk with access restricted to the service user |
| `WATER_ALERT_PUSH_ENABLED` | Only literal `true` enables sending/collection routes |
| `VAPID_PUBLIC_KEY` | Required when enabled; only this public key is exposed to the browser |
| `VAPID_PRIVATE_KEY` | Required when enabled; secret, never `VITE_*`, repository content or logs |
| `VAPID_SUBJECT` | Required when enabled; approved `mailto:` contact or HTTPS URL |

`.env.example` contains no credentials. `npm start` reads `.env`; the development
`npm run dev` uses the shell environment. Do not rotate VAPID keys casually: existing
browser subscriptions may require disable and re-enrollment with the new key.

## API and data flow

- `GET /api/status`: public agency snapshots, catalog, observed archive and change
  journal; never private devices. No-store responses.
- `POST /api/check`: approved-origin manual check, 60-second source cooldown,
  in-flight deduplication, then drain eligible pending changes.
- `GET /api/push/config`: `{ enabled, publicKey }`; no private key or contact.
- `POST /api/push/device`: opt-in subscription `{ endpoint, keys: { p256dh, auth } }`,
  `watches`, `liftWatches` and `language` (`en`/`es`). Requires observed live place
  IDs; lifts are a subset. Returns a private `token`. Replacing an enrolled endpoint
  requires `Authorization: Bearer <token>`; new enrollment is disabled with 503
  unless configured. Invalid data gets a generic 400; malformed authorization 401.
- `DELETE /api/push/device`: same bearer and exact origin, idempotent 204; remains
  available with sending disabled. No device-existence disclosure.

Mutations have 16 KiB JSON bounds and 30 requests/minute per socket address. Proxy
headers are **not trusted**: a reverse proxy may collapse visitors to one address.
Before public release, add approved edge rate limits/body limits and validate proxy
behavior. Origin checks are browser protections, not authentication against bots.
Enrollment capacity is 1000 devices, max 50 places each; deliberate public abuse
and full-capacity behavior still need an operations/security review. Log no request
bodies, bearer headers, push endpoints or keys; review proxy logging separately.

Checks run at startup/every five minutes, retries every minute, only while the
service is awake. First successful check per agency establishes a baseline without
push events. Events are retained for 30 days; only events after enrollment/save and
less than one hour old are eligible, with a fresh healthy source and a matching
current record. Unknown lifts, missing records and newly superseded active notices
are suppressed. Only explicit active-to-dated-lift transitions notify selected lift
watches. Substantive agency edits can change a derived identity; no false-alarm
rate is established. Max 50 attempts/drain, one-minute exponential backoff capped
at 15 minutes, provider 404/410 removes the device. Push TTL is five minutes.

Claims/backoff are persisted before transport; acceptance is recorded durably to avoid ordinary restart replay. A crash after
provider acceptance but before disk write can duplicate. Stable notification tags
coalesce replacement notifications but do not establish exactly-once delivery.
No alert is a safety decision or an emergency-service guarantee.

The PWA worker receives notifications and opens only same-origin app links; linked
notices open live, not previously saved sample mode. It does not cache agency/API
data. A published lift is shown with the separate current-status view, never an
all-clear. Lock-screen content may be visible to others.

## Retention and removal

`observations.json` is public agency history; `devices.json` is private subscriptions
and attempts. Both are gitignored, atomically rewritten with mode 0600. This is not
at-rest encryption or a security guarantee. Devices expire 90 days after saving;
the running server prunes each minute even when push sending is disabled. Offline
servers and backups cannot automatically enforce wall-clock removal. Do not restore
deleted subscriptions from backups; define backup expiration/deletion before hosting.

Explicit browser disable/delete unsubscribes browser delivery before server removal.
If server removal fails, credentials remain for retry and local preferences are not
erased. Clearing browser storage outside the app can lose the deletion credential;
the stored device then relies on subscription revocation or expiration. Expired
devices must disable/remove and re-enable; the UI never promises automatic renewal.

## Required verification before a delivery claim

After explicit authorization, test an opted-in real device using an isolated test
directory/approved test path—not fabricated live notices or broadcasts to real
users. Verify Android/desktop permission and installed iPhone iOS 16.4+ Home Screen
flow, lock-screen arrival with browser closed, new and explicit lift payloads, correct
place/date/source link, restart deduplication, stale/error suppression, sample
isolation, watch/language updates, expiry and unsubscribe/delete. Record timestamps,
device/browser versions and observed failures. Provider acceptance alone is not a
pass. Test offline recovery; no observed rate establishes a universal guarantee.

For pause/rollback, disable sending and restart the single service without erasing
its durable archive or device records. Deletion still works. Do not clear or replace
user records to hide an incident. Inspect source freshness, disk access and generic
check/delivery errors without logging private subscription content.
