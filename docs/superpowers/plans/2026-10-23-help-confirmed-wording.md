# Confirmed wording and recipient selection

Implement inline in the current checkout, preserving unrelated work and existing
account, autosave, History, immutable-send and sample/live boundaries.

1. Test issue tiles, date/ongoing behavior, confirmed editable wording, relevant
   records, sectioned messages and verified recipient resolution before implementation.
2. Extend existing optional JSON metadata for report selections and recipient routes;
   keep old drafts readable. Resolve addresses server-side from the existing directory.
   Multiple selected routes require supported addresses for in-app sending; official
   external-only options remain clearly labeled and never get invented addresses.
3. Reuse WAVE icons and Map geometry. Split report details and requested-response
   wording into short tasks as needed; preserve all user edits. Supporting information
   remains sourced context, not proof. Keep date/upload disclosures optional.
4. Test send snapshots, retry identity and incoming sender matching for recipient
   lists using isolated fake transports only. Update browser journeys, including
   sample-banner desktop fit at 1280×800, mobile, focus and edited-draft resume.
5. Update usage docs and dated Unreleased changelog with actual checks. No deploy,
    hosted migrations, notifications, provisioning or real messages.

## Local completion evidence

- 69 focused help tests pass, including immutable multi-address retry transport and
  second-recipient reply matching through synthetic fixtures only.
- 84 isolated browser checks pass across English/Spanish, five categories,
  active/absent notice fixtures, desktop viewports, narrow screens and enlarged text.
  Desktop fit includes confirmed wording and the sample banner; long final previews
  scroll internally. Captures were visually inspected outside tracked project files.
- Node 24 build passes with the bundle-size warning. Full units: 553 pass and nine
  pre-existing unrelated failures. `git diff --check` passes.
- Usage docs and dated changelog updated; concurrent accountless-draft work preserved.
  Nothing deployed, provisioned, migrated on hosting or sent to real recipients.
