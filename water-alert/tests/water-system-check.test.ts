// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { adhIdFromPwsid, checkWaterSystem, inspectionDate, parseWaterSystem } from '../server/water-system-check'
import { PROVIDER_PROFILES } from '../src/provider-profiles'

// Public ADH directory pages, retrieved 2026-11-16. Dated snapshots, not a feed.
const page = (id: string) => readFileSync(new URL(`fixtures/adh-ws-${id}.html`, import.meta.url), 'utf8')

it('derives only a candidate ADH id from an EPA PWSID', () => {
  expect(adhIdFromPwsid('AR0000041')).toBe('041')
  expect(adhIdFromPwsid('AR0001075')).toBe('1075')
  expect(adhIdFromPwsid('AR0000043')).toBe('043')
  expect(adhIdFromPwsid('T0467')).toBeUndefined()
  expect(adhIdFromPwsid('AR0000000')).toBeUndefined()
})

it('reads the printed inspection date without inventing one', () => {
  expect(inspectionDate('2/29/2024 12:00:00 AM')).toBe('2024-02-29')
  expect(inspectionDate('8/5/2024 12:00:00 AM')).toBe('2024-08-05')
  expect(inspectionDate('')).toBeUndefined()
  expect(inspectionDate('Not listed')).toBeUndefined()
})

it('parses a purchased-surface system and separates source names from upstream pointers', () => {
  const facts = parseWaterSystem(page('041'))!
  expect(facts).toMatchObject({
    name: 'BENTONVILLE WATER UTILITIES', systemId: '041', population: '51250',
    sourceType: 'Surface Purchased', systemType: 'Community', inspection: '2024-02-29',
  })
  // "HWY 102 MM - See ROGERS WATER UTILITIES for Source Water Assessment": the
  // upstream system is a pointer, never part of this system's source name.
  expect(facts.sourceNames).toEqual(['HWY 102 MM', 'MOBERLY LANE MM', 'BEAVER WATER DISTRICT MM'])
  expect(facts.sourceNames.join('; ')).not.toMatch(/See|Source Water Assessment/)
})

it('parses a groundwater system whose source has no upstream pointer', () => {
  const facts = parseWaterSystem(page('747'))!
  expect(facts).toMatchObject({ name: 'VILLAGE WATER LLC', systemId: '747', population: '113', sourceType: 'Ground', systemType: 'Community', inspection: '2026-02-05' })
  expect(facts.sourceNames).toEqual(['WELL #1'])
})

it('reproduces the hand-verified Bentonville profile from the same public page', () => {
  const hand = PROVIDER_PROFILES['ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb']
  const facts = parseWaterSystem(page('041'))!
  expect(facts.systemId).toBe(hand.systemId)
  expect(facts.population).toBe(hand.population)
  expect(facts.sourceNames.join('; ')).toBe(hand.sourceName)
  expect(inspectionDate('2/29/2024 12:00:00 AM')).toBe('2024-02-29')
  expect(hand.inspection.en).toBe('Feb 29, 2024')
})

const cave = { pwsid: 'AR0000043', name: 'CAVE SPRINGS WATERWORKS' }
const serve = (html: string, status = 200) => vi.fn(async () => new Response(html, { status })) as unknown as typeof fetch

it('verifies the system ADH published under this name', async () => {
  const result = await checkWaterSystem(cave, serve(page('043')), '2026-11-16')
  expect(result).toMatchObject({
    state: 'verified', checkedAt: '2026-11-16', sourceUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=043',
    facts: { name: 'CAVE SPRINGS WATERWORKS', systemId: '043', population: '5365', inspection: '2024-08-05' },
  })
})

it('saves nothing when the derived id lands on a different system', async () => {
  // PWS 043 is Cave Springs; asking for it under Bentonville's name must fail.
  const result = await checkWaterSystem({ pwsid: 'AR0000043', name: 'BENTONVILLE WATER UTILITIES' }, serve(page('043')), '2026-11-16')
  expect(result).toEqual({ state: 'mismatch' })
})

it('saves nothing when ADH cannot be read, never a blank profile', async () => {
  expect(await checkWaterSystem(cave, serve('oops', 503), '2026-11-16')).toEqual({ state: 'incomplete' })
  expect(await checkWaterSystem(cave, serve('<html><body>maintenance</body></html>'), '2026-11-16')).toEqual({ state: 'incomplete' })
  const offline = vi.fn(async () => { throw new Error('ETIMEDOUT') }) as unknown as typeof fetch
  expect(await checkWaterSystem(cave, offline, '2026-11-16')).toEqual({ state: 'incomplete' })
})
