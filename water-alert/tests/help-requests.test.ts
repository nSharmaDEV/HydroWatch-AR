// @vitest-environment node
import { afterEach, expect, test } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HelpStore } from '../server/help-store'
import { blankRequest, routeFor } from '../src/help-requests'
const dirs: string[] = []
async function store() { const dir = await mkdtemp(join(tmpdir(), 'wave-help-')); dirs.push(dir); return new HelpStore(dir) }
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))) })
const place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'Leisure Hills', county: 'Benton', kind: 'system' as const }
test('official record metadata round trips without losing source status or verification limits', async () => {
  const s = await store(), record = { agency: 'ADH', date: '2026-10-14', problem: 'power outage', area: 'entire system', status: 'Notice listed; no lift date recorded', verified: false }
  const d = { ...blankRequest(place), facts: [{ id: 'notice', text: 'Saved notice.', kind: 'saved' as const, included: true, sources: [], record }] }
  const saved = await s.save('alice', d, 0)
  expect((await new HelpStore(dirs[0]).list('alice'))[0].draft.facts?.[0]).toMatchObject({ record })
  await expect(s.save('alice', { ...d, facts: [{ ...d.facts[0], record: { ...record, problem: 'x'.repeat(16001) } }] }, saved.revision)).rejects.toThrow()
})
test('optional identity and generation metadata round trip with bounded validation', async () => {
  const s = await store(), d = { ...blankRequest(place), residentName: 'Resident Example', replyContact: 'reply@example.test', generatedFrom: 'v1:12:123', subjectEdited: false, bodyEdited: true, answers: { contacted: 'Yes', contactMethod: 'Phone', frequency: 'Occasional' } }
  const saved = await s.save('alice', d, 0)
  const resumed = (await new HelpStore(dirs[0]).list('alice'))[0].draft
  expect(resumed.residentName).toBe(d.residentName)
  expect(resumed.replyContact).toBe(d.replyContact)
  expect(resumed.generatedFrom).toBe(d.generatedFrom)
  expect(resumed.subjectEdited).toBe(false)
  expect(resumed.bodyEdited).toBe(true)
  expect(resumed.answers).toEqual(d.answers)
  for (const patch of [{ residentName: 'x'.repeat(121) }, { replyContact: 'x'.repeat(201) }, { generatedFrom: 'x'.repeat(129) }, { replyContact: 'Injected\nHeader' }, { bodyEdited: 'false' as unknown as boolean }, { subjectEdited: 0 as unknown as boolean }]) await expect(s.save('alice', { ...d, ...patch }, saved.revision)).rejects.toThrow()
})
test('resident location descriptions persist privately with strict count and text bounds', async () => {
  const s = await store(), d = { ...blankRequest(place), locations: ['Oak Street', 'Community centre'] }
  const saved = await s.save('alice', d, 0)
  expect((await new HelpStore(dirs[0]).list('alice'))[0].draft.locations).toEqual(d.locations)
  for (const locations of [Array(11).fill('Place'), [''], ['x'.repeat(201)], ['Oak\nStreet'], ['Oak', 'Oak']]) await expect(s.save('alice', { ...d, locations }, saved.revision)).rejects.toThrow()
})
test('confirmed wording and recipient lists persist; unsupported additional recipients block the entire send', async () => {
  const s = await store(), d = { ...blankRequest(place), description: 'No water', subject: 'Service', body: 'My report', recipientRoutes: ['provider', 'adh'] as const, wording: { report: { first: 'No water' }, response: { first: 'Restore service please' } } }
  const saved = await s.save('alice', { ...d, recipientRoutes: [...d.recipientRoutes] }, 0)
  expect(saved.draft.recipientRoutes).toEqual(['provider', 'adh'])
  expect(saved.draft.wording).toEqual(d.wording)
  await expect(s.prepare('alice', d.id, saved.revision)).rejects.toThrow('destination')
  const sendable = await s.save('alice', { ...saved.draft, recipientRoutes: ['provider'] }, saved.revision)
  const p = await s.prepare('alice', d.id, sendable.revision)
  expect(p.message.destinations).toEqual(['LEISUREHILLSWATERCO@GMAIL.COM'])
  await expect(s.save('alice', { ...sendable.draft, recipientRoutes: ['provider', 'provider'] }, sendable.revision)).rejects.toThrow()
  await expect(s.save('alice', { ...sendable.draft, wording: { report: { first: 'x'.repeat(1001) }, response: {} } }, sendable.revision)).rejects.toThrow()
})
test('guided progress and attributed fact edits round trip with bounded validation', async () => {
  const s = await store(), d = { ...blankRequest(place), flowStep: 'records' as const, facts: [{ id: 'notice:0', text: 'Edited agency fact', kind: 'saved' as const, included: true, sources: [{ recordId: 'notice', url: 'https://example.test/source', label: 'ADH' }] }] }
  const saved = await s.save('alice', d, 0)
  expect(saved.draft.flowStep).toBe('records')
  expect(saved.draft.facts).toEqual(d.facts)
  await expect(s.save('alice', { ...d, facts: [{ ...d.facts[0], text: 'x'.repeat(16001) }] }, saved.revision)).rejects.toThrow()
  await expect(s.save('alice', { ...d, facts: [{ ...d.facts[0], sources: [{ ...d.facts[0].sources[0], url: 'javascript:alert(1)' }] }] }, saved.revision)).rejects.toThrow()
})
test('tailored answers persist privately with bounded recognized keys and legacy drafts still load', async () => {
  const s = await store(), d = { ...blankRequest(place), issue: 'advisory' as const, answers: { response: 'Clarify my next step', amount: '$12' } }
  const saved = await s.save('alice', d, 0)
  expect(saved.draft.answers).toEqual(d.answers)
  await expect(s.save('alice', { ...d, answers: { response: 'x'.repeat(1001) } }, saved.revision)).rejects.toThrow()
  const legacy = await s.save('alice', blankRequest(place), 0)
  expect(legacy.draft.answers).toEqual({})
})
test('draft survives a new store and cannot be read or updated by another account', async () => {
  const s = await store(), d = blankRequest(place)
  d.description = 'No water since Monday'
  const saved = await s.save('alice', d, 0)
  expect((await new HelpStore(dirs[0]).list('alice'))[0].draft.description).toBe(d.description)
  expect(await s.list('bob')).toEqual([])
  await expect(s.save('bob', { ...saved.draft, description: 'changed' }, saved.revision)).rejects.toThrow()
  await expect(s.save('alice', d, 0)).rejects.toThrow('conflict')
})
test('structured source citations persist and freeze separately from email text with bounded safe URLs', async () => {
  const s = await store(), d = { ...blankRequest(place), description: 'A question', subject: 'Notice question', body: 'Please clarify.', sources: [{ recordId: 'notice-1', url: 'https://example.test/notice', label: 'ADH' }] }
  const saved = await s.save('alice', d, 0)
  expect(saved.draft.sources).toEqual(d.sources)
  const sent = await s.prepare('alice', d.id, saved.revision)
  expect(sent.message.sources).toEqual(d.sources)
  await s.save('alice', { ...saved.draft, sources: [] }, saved.revision)
  expect((await s.list('alice'))[0].messages[0].sources).toEqual(d.sources)
  for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'http://example.test/']) {
    await expect(s.save('alice', { ...blankRequest(place), sources: [{ ...d.sources[0], url }] }, 0)).rejects.toThrow()
  }
})
test('send freezes content, deduplicates concurrent attempts, and never treats acceptance as delivery', async () => {
  const s = await store(), d = blankRequest(place); d.description = 'No service'; d.subject = 'Service request'; d.body = 'Please investigate.'
  const saved = await s.save('alice', d, 0)
  const first = await s.prepare('alice', d.id, saved.revision)
  const again = await s.prepare('alice', d.id, saved.revision)
  expect(first.send).toBe(true); expect(again.send).toBe(false)
  expect(again.message.id).toBe(first.message.id)
  await s.accept('alice', d.id, first.message.id, 'mail-1')
  const record = (await s.list('alice'))[0]
  expect(record.messages[0].delivery).toBe('sent'); expect(record.status).toBe('open')
  const same = await s.save('alice', record.draft, record.revision)
  expect((await s.prepare('alice', d.id, same.revision)).send).toBe(false)
  record.revision = same.revision
  record.draft.body = 'Follow up'; await s.save('alice', record.draft, record.revision)
  expect((await s.list('alice'))[0].messages[0].body).toBe('Please investigate.')
  await s.setStatus('alice', d.id, 'closed')
  await s.delivery('mail-1', 'delivered', 'event-1')
  expect((await s.list('alice'))[0].status).toBe('closed')
})
test('unknown send outcomes cannot be retried beyond the provider idempotency window', async () => {
  let now = 1_000_000; const original = await store(); const s = new HelpStore(dirs.at(-1)!, () => now)
  const d = blankRequest(place); d.description = 'Issue'; d.subject = 'Help'; d.body = 'Please help.'
  const r = await s.save('alice', d, 0), p = await s.prepare('alice', d.id, r.revision)
  await s.uncertain('alice', d.id, p.message.id)
  now += 25 * 60 * 60 * 1000
  await expect(s.retry('alice', d.id, p.message.id)).rejects.toThrow('unknown')
  expect(await original.list('bob')).toEqual([])
})
test('unverified destinations, samples and foreign attachment ids cannot enter live sends', async () => {
  const s = await store(), d = blankRequest(place)
  expect(routeFor(d).email).toBe('LEISUREHILLSWATERCO@GMAIL.COM')
  await expect(s.save('alice', { ...d, place: { ...place, id: 'ADH:sample-creek' } }, 0)).rejects.toThrow()
  await expect(s.save('alice', { ...d, attachments: [{ id: 'foreign', name: 'a.txt', type: 'text/plain', data: 'YQ==' }] }, 0)).rejects.toThrow()
  d.route = 'adh'; d.description = 'Issue'; d.subject = 'Help'; d.body = 'Help'
  const r = await s.save('alice', d, 0)
  await expect(s.prepare('alice', d.id, r.revision)).rejects.toThrow('destination')
})
test('delivery before acceptance asks the webhook provider to retry rather than losing the event', async () => {
  const s = await store()
  expect(await s.delivery('not-yet-accepted', 'delivered', 'early-event')).toBe(false)
  const d = blankRequest(place); d.description = 'No service'; d.subject = 'Help'; d.body = 'Investigate please.'
  const saved = await s.save('alice', d, 0), p = await s.prepare('alice', d.id, saved.revision)
  await s.accept('alice', d.id, p.message.id, 'not-yet-accepted')
  expect(await s.delivery('not-yet-accepted', 'delivered', 'early-event')).toBe(true)
  expect(await s.delivery('not-yet-accepted', 'delivered', 'early-event')).toBe(true)
  expect((await s.list('alice'))[0].messages[0].delivery).toBe('delivered')
})
test('untrusted fields are discarded and valid foreign attachment ids never retrieve private bytes', async () => {
  const s = await store(), alice = blankRequest(place)
  const attachment = { id: crypto.randomUUID(), name: 'private.txt', type: 'text/plain', data: Buffer.from('PRIVATE').toString('base64') }
  alice.attachments = [attachment]
  await s.save('alice', alice, 0)
  const bob = blankRequest(place)
  await expect(s.save('bob', { ...bob, attachments: [{ ...attachment, data: undefined as unknown as string }] }, 0)).rejects.toThrow()
  const result = await s.save('bob', { ...bob, secretExtra: 'discard', place: { ...place, secretExtra: 'discard' } } as typeof bob, 0)
  expect(JSON.stringify(result)).not.toContain('secretExtra')
  expect(JSON.stringify(await s.list('bob'))).not.toContain('PRIVATE')
  await expect(s.prepare('bob', alice.id, 1)).rejects.toThrow('not found')
})
