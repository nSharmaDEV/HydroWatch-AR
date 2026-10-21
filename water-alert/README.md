# WellPower: WAVE — app development

See the [project overview](../README.md) for the problem, features, sample journey,
sources, limitations and contribution disclosure.

## Local setup

Use **Node.js 24.x**. From this directory:

```sh
npm ci
npm run dev
```

Open **http://localhost:5178**. Vite proxies `/api` to the Express service at
`http://127.0.0.1:8788`. Both bind locally. Default local operation uses JSON state
under ignored `data/live/`; hosted operation uses PostgreSQL. Sample mode is
fictional and separate from live records.

No `.env` is required for default local operation. Keep production credentials
out of local demos. See [`.env.example`](.env.example) and the deployment guides
before configuring optional hosting or push. The frontend deliberately does not
load runtime `.env` files.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local UI and API |
| `npm run dev:ui` | UI only; sample mode works without the API |
| `npm test` | Unit/integration suite |
| `npm run build` | TypeScript checks and production UI build |
| `npm run preview` | Preview built UI; does not start the API |
| `npm run test:e2e` | Synthetic Playwright journeys with an isolated UI server |

Install Chromium once with `npx playwright install chromium` before browser tests.
Those tests intercept API requests and block external requests/service workers;
they do not verify real agency retrieval or notification delivery.

Latest cleanup check (October 20, 2026, Node 24.22.0): **445 unit/integration tests
and production build pass**. The full browser suite has **78 passing and 22 failing
checks**, involving card geometry/element and section-order expectations. App and
test code were unchanged by cleanup; browser failures remain unresolved. See the
[changelog](CHANGELOG.md) for details.

## Opening logo

The supplied logo is traced as SVG outlines for a 2.51-second opening animation,
including a 0.7-second hold after the logo fills and before it fades to the app,
shown once per browser session using `sessionStorage`. The app mounts underneath;
the decorative overlay never captures input or locks scrolling and is removed
afterward. Reduced motion shows the completed logo with a short fade (650ms total).
If session storage is blocked, the intro still finishes but can replay on reload.
The existing PNG header logo is unchanged. To regenerate the intro's outlined
artwork, run `node scripts/trace-logo.mjs` with local Potrace and Playwright Chromium;
these tracing tools are not required to run or build the website.

## Public-water supplier scope

The website now offers public-water suppliers and ADH boil-water notices only.
Lakes, waterbodies, recreational-water advisories and private wells are outside
the current user-facing scope, in both English and Spanish and in sample mode.
Previously saved lake choices and historical agency records are retained but
hidden; this is not a data purge. Legacy ADEQ parsing/storage remains in the
backend. Existing server notification choices are not automatically changed:
save supplier-only alert choices or disable the subscription in Settings.

## Documentation

- [Change history](CHANGELOG.md): dated changes and local/deployed distinctions.
- [Detailed implementation notes](IMPLEMENTATION-NOTES.md): retained evidence,
  sample walkthrough, parsing semantics, API/storage/privacy details and open gates.
- [Deployment](DEPLOYMENT.md), [Vercel](VERCEL.md), [free hosting](FREE-HOSTING.md).
- [Push status and verification](PUSH-PLAN.md): production enablement is not proof
  of reliable automatic advisory-to-device delivery; email is not implemented.
- [Annual-report research](docs/research/adh-ccr-2025/README.md): historical,
  document-scoped findings, not current safety assessments.
- [Submission checklist](CAC-CHECKLIST.md): evidence and outstanding human reviews.
- [Design history](../docs/wireframes/README.md): synthetic proposals, not shipped UI.

Keep `water-alert/` as the hosting project root. Repository cleanup has not changed
runtime paths, migrated data, deployed code or submitted a competition entry.
