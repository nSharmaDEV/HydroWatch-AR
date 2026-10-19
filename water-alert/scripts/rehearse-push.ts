// Recording-only local rehearsal: no env files, server, network transport or disk state.
import assert from 'node:assert/strict'
import { createLocalPushHarness, rehearsalNotice } from '../tests/helpers/push-harness.js'

const h = createLocalPushHarness()
await h.observe([rehearsalNotice])
await h.enroll()
await h.drain()
assert.equal(h.payloads.length, 0, 'Baseline must not record a notification')
h.advance(1000)
const next = { ...rehearsalNotice, id: 'ADH:rehearsal-next' }
await h.observe([rehearsalNotice, next])
await h.fail()
await h.drain()
assert.equal(h.payloads.length, 0, 'Failed source must suppress recording')
h.advance(1000)
await h.observe([rehearsalNotice, next])
await h.drain()
assert.equal(h.payloads.length, 1, 'Fresh matching event must be recorded')
h.restart()
await h.drain()
assert.equal(h.payloads.length, 1, 'Restart must not duplicate the recorded event')
h.advance(1000)
await h.observe([rehearsalNotice, { ...next, lifted: '10/17/2026' }])
await h.drain()
assert.equal(h.payloads.length, 2, 'Explicit lift must be recorded')
assert.equal(await h.remove(), true)
h.advance(1000)
await h.observe([rehearsalNotice, { ...next, lifted: '10/17/2026' }, { ...next, id: 'ADH:rehearsal-after-removal' }])
await h.drain()
assert.equal(h.payloads.length, 2, 'Removed device must not record future events')
console.log(JSON.stringify({
  mode: 'LOCAL RECORDING ONLY — no notifications sent',
  checks: ['baseline suppression', 'failed-source suppression', 'future new notice', 'restart deduplication', 'explicit lift', 'device removal'],
  recordedPayloadCount: h.payloads.length,
  realDeviceDelivery: 'NOT TESTED',
}, null, 2))
