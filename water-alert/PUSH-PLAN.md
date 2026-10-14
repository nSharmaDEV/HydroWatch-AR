# Water Alert push implementation plan

Goal: implement resident alerts locally without deployment, accounts, production key generation or external notification sends. Inline execution as requested.

Architecture: persist changes atomically with observations; a separate private device store holds opt-in subscriptions and delivery attempts. A single running service checks agencies and drains pending pushes. HTTPS hosting, durable disk, VAPID configuration and device testing remain release gates.

Constraints: existing checkout/branch only; preserve prior apps and user work; two approved agency URLs only; no inferred lifts or unknown-status alerts; sample mode cannot subscribe. No safety or reliable-delivery claim. Sending through browser push services requires explicit operator configuration/authorization.

## 1. Durable changes
- [x] Add failing `tests/server.test.ts` cases for per-agency baseline suppression, restart persistence and deduplication.
- [x] Run `npm test -- tests/server.test.ts`; implement a compatible event journal in `server/store.ts`; rerun.

## 2. Device delivery
- [x] Add failing `tests/push.test.ts` cases for future-only matching, retries, expiration, deduplication, validation and authorized removal.
- [x] Implement serialized atomic device storage in `server/push.ts`, injected transport and restricted HTTPS push endpoints; rerun.
- [x] Test and implement API wiring in `server/app.ts` and environment-gated VAPID transport in `server/index.ts`.

## 3. Installed-PWA opt-in
- [x] Test and implement `src/push.ts`, `public/sw.js` and EN/ES settings controls in `src/App.tsx`. Request permission only on user action; server acceptance is not verified device delivery. Provide disable/delete and visible failures; sample mode cannot subscribe.

## 4. Verification and operations
- [x] Add single-instance persistent-disk container configuration and an environment example; no deployment or keys generated. Docker is unavailable locally; container execution remains unverified.
- [ ] Run tests/build and inspect local UI. Document exact remaining hosting/device gates. No commits, merges, publication or external sends.
