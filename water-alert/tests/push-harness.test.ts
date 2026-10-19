// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { createLocalPushHarness, rehearsalNotice } from './helpers/push-harness'

it('records future new/lift payloads without network access and deduplicates after restart', async () => {
  const network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Network forbidden') })
  try {
    const h = createLocalPushHarness()
    await h.observe([rehearsalNotice])
    await h.enroll()
    await h.drain()
    expect(h.payloads).toEqual([])
    h.advance(1000)
    const next = { ...rehearsalNotice, id: 'ADH:rehearsal-next' }
    await h.observe([rehearsalNotice, next])
    await h.drain()
    expect(h.payloads).toHaveLength(1)
    expect(h.payloads[0]).toMatchObject({ title: '[TEST ONLY] Fictional water supplier', tag: `new:${next.id}`, url: `/?notice=${encodeURIComponent(next.id)}`, sourceUrl: rehearsalNotice.url })
    expect(h.payloads[0].body).toContain('New published notice')
    h.restart()
    await h.drain()
    expect(h.payloads).toHaveLength(1)
    h.advance(1000)
    await h.observe([rehearsalNotice, { ...next, lifted: '10/17/2026' }])
    await h.drain()
    expect(h.payloads).toHaveLength(2)
    expect(h.payloads[1].body).toContain('Agency published a lift')
    expect(network).not.toHaveBeenCalled()
  } finally { network.mockRestore() }
})

it.each(['failed', 'stale', 'unknown', 'missing'] as const)('suppresses %s sources/records', async kind => {
  const h = createLocalPushHarness()
  await h.observe([rehearsalNotice]); await h.enroll(); h.advance(1000)
  const next = { ...rehearsalNotice, id: 'ADH:rehearsal-next' }
  await h.observe([rehearsalNotice, next])
  if (kind === 'failed') await h.fail()
  if (kind === 'stale') h.advance(16 * 60_000)
  if (kind === 'unknown') await h.observe([rehearsalNotice, { ...next, liftStatus: 'unknown' }])
  if (kind === 'missing') await h.observe([rehearsalNotice])
  await h.drain()
  expect(h.payloads).toEqual([])
})

it('resaving choices suppresses old events and uses Spanish for future matching events', async () => {
  const h = createLocalPushHarness()
  await h.observe([rehearsalNotice]); await h.enroll(); h.advance(1000)
  const next = { ...rehearsalNotice, id: 'ADH:rehearsal-next' }
  await h.observe([rehearsalNotice, next]); h.advance(1000)
  await h.enroll({ language: 'es' }); await h.drain()
  expect(h.payloads).toEqual([])
  h.advance(1000)
  await h.observe([rehearsalNotice, { ...next, lifted: '10/17/2026' }]); await h.drain()
  expect(h.payloads).toHaveLength(1)
  expect(h.payloads[0].body).toContain('La agencia publicó el levantamiento')
})

it('does not match unwatched suppliers or unwanted lifts', async () => {
  const h = createLocalPushHarness()
  await h.observe([rehearsalNotice]); await h.enroll({ liftWatches: [] }); h.advance(1000)
  await h.observe([{ ...rehearsalNotice, lifted: '10/17/2026' }, { ...rehearsalNotice, id: 'ADH:rehearsal-other', placeId: 'ADH:rehearsal-other-supplier' }])
  await h.drain()
  expect(h.payloads).toEqual([])
})

it('removes the synthetic device idempotently and prevents future recording', async () => {
  const h = createLocalPushHarness()
  await h.observe([rehearsalNotice]); await h.enroll()
  expect(await h.remove()).toBe(true)
  expect(await h.remove()).toBe(false)
  h.advance(1000)
  await h.observe([{ ...rehearsalNotice, lifted: '10/17/2026' }]); await h.drain()
  expect(h.payloads).toEqual([])
})

it('expires synthetic devices after 90 days even with a fresh event', async () => {
  const h = createLocalPushHarness()
  await h.observe([rehearsalNotice]); await h.enroll(); h.advance(90 * 86400_000)
  await h.observe([{ ...rehearsalNotice, lifted: '10/17/2026' }]); await h.drain()
  expect(h.payloads).toEqual([])
  expect(await h.remove()).toBe(false)
})

it('rejects sample watches and more than 50 choices', async () => {
  const h = createLocalPushHarness()
  const notices = Array.from({ length: 51 }, (_, i) => ({ ...rehearsalNotice, id: `ADH:rehearsal-${i}`, placeId: `ADH:rehearsal-place-${i}` }))
  await h.observe(notices)
  await expect(h.enroll({ watches: ['ADH:sample'], liftWatches: [] })).rejects.toThrow()
  await expect(h.enroll({ watches: notices.map(n => n.placeId), liftWatches: [] })).rejects.toThrow()
  await expect(h.enroll({ watches: notices.slice(0, 50).map(n => n.placeId), liftWatches: [] })).resolves.toBeUndefined()
})

it('keeps concurrent rehearsal instances independent', async () => {
  const a = createLocalPushHarness(); const b = createLocalPushHarness()
  await a.observe([rehearsalNotice]); await a.enroll(); a.advance(1000)
  await a.observe([{ ...rehearsalNotice, lifted: '10/17/2026' }])
  await b.drain()
  expect(b.payloads).toEqual([])
  expect(await b.remove()).toBe(false)
  await a.drain()
  expect(a.payloads).toHaveLength(1)
})
