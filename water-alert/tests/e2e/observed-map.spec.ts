import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import { SOURCES } from '../../src/domain'
import { SUPPLIER_LOCATIONS } from '../../src/supplier-locations'

const at = '2026-10-21T12:00:00Z'
const place = { id: 'ADH:d1bf471be8487e1b4003bb2e98916593413537252b895fe5a05f3e68f29f081d', name: 'BULL SHOALS WATER SYSTEM', county: 'MARION', kind: 'system' }
const notice = { id: 'synthetic-map-event', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Synthetic published affected area', reason: 'Synthetic main break', issued: '10/20/2026', lifted: null, url: SOURCES.ADH, lastObservedAt: at }
const unmapped = { ...notice, id: 'synthetic-unmapped', placeId: 'ADH:unmapped-test', name: 'Synthetic unmapped supplier' }

async function openWorkspace(page: Page, context: BrowserContext, baseURL: string | undefined, populated = false) {
  const archive = populated ? SUPPLIER_LOCATIONS.map((p, i) => ({ ...notice, id: `synthetic-catalog-${i}`, placeId: p.placeId, name: `Synthetic ${p.sourceName}`, county: 'Synthetic county' })) : [notice, unmapped]
  const unexpected: string[] = [], errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.clock.setFixedTime(new Date(at))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL || route.request().method() !== 'GET') { unexpected.push(url.href); return route.abort() }
    if (url.pathname === '/api/status') return route.fulfill({ json: { sources: [{ agency: 'ADH', records: populated ? [archive[0]] : archive, retrievedAt: at, lastSuccessAt: at, error: null }, { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null }], places: populated ? [] : [place], archive, coverageStart: at } })
    if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (url.pathname.startsWith('/api/')) { unexpected.push(url.href); return route.abort() }
    return route.continue()
  })
  await page.goto('/')
  await page.getByRole('navigation').getByRole('button', { name: 'Map', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Advisory map', exact: true })).toBeVisible()
  await expect(page.locator('.logo-intro')).not.toBeVisible()
  return { unexpected, errors }
}

test('map and results share filters and selection without leaving the workspace', async ({ page, context, baseURL }, info) => {
  const checks = await openWorkspace(page, context, baseURL)
  const phone = info.project.name === 'phone-sized'
  const map = page.getByRole('group', { name: 'Arkansas supplier map' })
  const marker = map.getByRole('button', { name: /BULL SHOALS.*Active advisory/ })
  await expect(marker).toBeVisible()
  await expect(page.getByText('Markers show supplier locations, not affected boundaries.', { exact: true })).toBeVisible()
  if (phone) await page.screenshot({ path: info.outputPath('advisory-map-phone.png'), fullPage: true })
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  const zoom = await map.getAttribute('viewBox')
  await marker.focus()
  await page.keyboard.press('Enter')
  const details = phone ? page.getByRole('dialog') : page.getByRole('region', { name: place.name })
  await expect(details.getByText(notice.area, { exact: true })).toBeVisible()
  if (phone) {
    await page.screenshot({ path: info.outputPath('advisory-details-phone.png'), fullPage: true })
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await page.keyboard.press('Shift+Tab')
    await expect(details.locator('a').last()).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(details.getByRole('button', { name: /Back to results/ })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(marker).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    await page.getByRole('button', { name: 'List', exact: true }).click()
  } else await details.getByRole('button', { name: /Back to results/ }).click()
  await expect(page.locator('.supplier-map-svg')).toHaveAttribute('viewBox', zoom!)
  const results = page.getByRole('region', { name: 'Supplier results' })
  await expect(results.getByText('Location unavailable')).toBeVisible()
  await expect(results.getByRole('list')).toHaveCount(1)
  await results.getByRole('button', { name: /Synthetic unmapped/ }).click()
  await expect((phone ? page.getByRole('dialog') : page.getByRole('region', { name: unmapped.name })).getByRole('heading', { name: unmapped.name })).toBeVisible()
  await page.getByRole('button', { name: /Back to results/ }).click()
  if (phone) {
    const row = results.getByRole('button', { name: /Synthetic unmapped/ })
    await row.click()
    await page.getByRole('button', { name: 'Close supplier details' }).click()
    await expect(row).toBeFocused()
    await row.click()
    await page.mouse.click(10, 5)
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(row).toBeFocused()
  }
  await page.getByRole('button', { name: 'My places', exact: true }).click()
  await expect(results.getByRole('button')).toHaveCount(0)
  await expect(page.locator('.supplier-marker')).toHaveCount(0)
  await page.getByRole('button', { name: 'All places', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search supplier or county' }).fill('no matches')
  await expect(page.getByText('No suppliers match this search.')).toBeVisible()
  await page.getByRole('searchbox').fill('')
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('none')
  await expect(results.getByRole('button')).toHaveCount(0)
  await expect(page.locator('.supplier-marker')).toHaveCount(0)
  await page.getByRole('combobox').selectOption('all')
  await page.getByRole('button', { name: 'Sources and coverage limits', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sources and coverage limits' })).toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Map', exact: true }).first().click()
  await expect(page.locator('.supplier-map-svg')).toHaveAttribute('viewBox', zoom!)
  await page.getByRole('button', { name: 'ES', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mapa de avisos' })).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Buscar proveedor o condado' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(checks.unexpected).toEqual([])
  expect(checks.errors).toEqual([])
})

for (const size of [{ width: 1280, height: 700 }, { width: 1440, height: 780 }]) {
  test(`desktop workspace fits ${size.width}×${size.height} and restores list scroll`, async ({ page, context, baseURL }, info) => {
    test.skip(info.project.name === 'phone-sized', 'Desktop-only geometry')
    await page.setViewportSize(size)
    const checks = await openWorkspace(page, context, baseURL, true)
    const map = page.getByRole('group', { name: 'Arkansas supplier map' })
    await expect(map.getByRole('button')).toHaveCount(SUPPLIER_LOCATIONS.length)
    const workspace = page.locator('.map-workspace')
    const box = (await workspace.boundingBox())!
    expect(box.y + box.height).toBeLessThan(size.height - 35)
    const geo = (await page.locator('.map-geography').boundingBox())!
    expect(geo.width / box.width).toBeGreaterThan(.62)
    expect(geo.width / box.width).toBeLessThan(.68)
    const results = page.getByRole('region', { name: 'Supplier results' })
    expect(await results.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
    await results.evaluate(el => { el.scrollTop = 360 })
    const row = results.getByRole('button').nth(5)
    await row.scrollIntoViewIfNeeded()
    const before = await results.evaluate(el => el.scrollTop)
    await row.click()
    await page.getByRole('button', { name: /Back to results/ }).click()
    expect(await results.evaluate(el => el.scrollTop)).toBe(before)
    await expect(row).toHaveAttribute('aria-pressed', 'true')
    await page.screenshot({ path: info.outputPath(`advisory-map-${size.width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Sources and coverage limits', exact: true }).click()
    await page.getByText('Map sources and limitations', { exact: true }).click()
    await expect(page.getByText('Provider office reference point', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Supplier identity evidence.*Salem/ })).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=492')
    await page.getByRole('navigation').getByRole('button', { name: 'Map', exact: true }).first().click()
    await page.setViewportSize({ width: size.width, height: 480 })
    await page.addStyleTag({ content: 'html { font-size: 24px !important; }' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator('.map-boundary-note').scrollIntoViewIfNeeded()
    await expect(page.locator('.map-boundary-note')).toBeVisible()
    expect(checks.unexpected).toEqual([])
    expect(checks.errors).toEqual([])
  })
}
