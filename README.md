# WellPower: WAVE

**Water Advisory Verification & Empowerment**

WellPower: WAVE helps Arkansas residents find published water advisories for their
chosen public water supplier, understand the source information, and
prepare a next step. It is an independent, AI-assisted student project—not an
agency service or a water-safety certification. “Verification” means checking
published records, not testing water.

## What it does

- Shows ADH boil-water notices for public-water suppliers, with source
  links, retrieval times and explicit unavailable/stale states.
- Lets residents confirm and watch specific suppliers, review
  observed advisory history, and see changes since a previous visit.
- Provides dated supplier facts and annual-report findings where reviewed,
  separate from current advisory status.
- Offers provider contacts, guided help and editable preparation drafts. Nothing
  is automatically called, emailed, filed or submitted by those tools.
- Includes English/Spanish controls, an installable web app and clearly labeled
  fictional sample mode. Agency records and some reference text remain in English.

**No advisory found does not mean the water is safe.** A failed or stale source
shows unavailable information, never an all-clear. Confirm your supplier against
your bill; a city or county is not a verified service boundary.

## Try it

[Hosted app](https://water-alert-blond.vercel.app) ·
[App setup and technical documentation](water-alert/README.md)

Choose **Try sample mode** for a repeatable fictional walkthrough without sending
real notifications or submitting requests. The hosted app can differ from the
latest local source; see the [changelog](water-alert/CHANGELOG.md).

## Run locally

Requires **Node.js 24.x** and npm. From the repository root:

```sh
cd water-alert
npm ci
npm run dev
```

Open **http://localhost:5178**. The command starts the React/Vite UI and local
Express API (port 8788). Default local operation does not require accounts or
push credentials; live agency retrieval requires internet. Do not copy production
credentials into a judge/demo environment.

```sh
# From water-alert/
npm test
npm run build
```

For isolated, synthetic browser tests:

```sh
npx playwright install chromium
npm run test:e2e
```

## Project layout

| Path | Contents |
| --- | --- |
| `water-alert/src/` | React + TypeScript interface and typed domain logic |
| `water-alert/server/`, `api/`, `scheduler/` | Local API, hosted API entry point and scheduler |
| `water-alert/tests/` | Unit, integration and synthetic browser tests |
| `water-alert/public/`, `assets/` | Install metadata, icons and WAVE branding |
| `water-alert/docs/` | WAVE research, source provenance and supporting documentation |
| `docs/` | WAVE design history and synthetic wireframes—not the shipped app |
| `certificate.crt` | Public Supabase Root 2021 CA certificate; not a private key |

## Sources, privacy and limits

- Official live sources: [ADH boil-water list](https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx)
  and [ADEQ HAB feed](https://adeq.state.ar.us/water/planning/hab/advisories.json).
  These are the only live advisory feeds; coverage is not a complete statewide
  supplier directory, address lookup or private-well monitoring service.
- Annual reports are historical documents, not current safety assessments.
  [Research provenance](water-alert/docs/research/adh-ccr-2025/README.md) preserves
  reviewed sources, mappings, hashes and unresolved findings.
- Watch preferences are stored in the browser. Optional push enrollment stores
  subscription and watch information on the server. Preparation drafts stay in
  page memory and are lost when leaving or reloading; nothing is sent automatically.
- Web Push is implemented, but reliable deployed automatic advisory-to-device
  delivery remains unverified. Email alerts are not implemented. Local tests are
  not proof of production delivery. See [push status](water-alert/PUSH-PLAN.md).
- No water testing, prediction, medical/legal advice, compensation guarantee or
  automatic agency submission. Human Spanish/accessibility review remains open.

## Contribution and submission

Development used substantial AI assistance, including code, tests and UI copy.
The student must review the implementation and record their actual contributions
and AI use; this README does not claim sole student authorship. Eligibility,
the public demo video and final submission require human confirmation. See the
[WAVE submission checklist](water-alert/CAC-CHECKLIST.md).

This current project tree is WAVE-only. Earlier unrelated prototypes are preserved
outside this repository; older Git commits may still contain them.
