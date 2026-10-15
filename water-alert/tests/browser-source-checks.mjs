// Synthetic source-check evidence; every API call intercepted, no notifications.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5189'
await mkdir('test-results/source-checks', { recursive: true })
const browser = await chromium.launch()
const place = { id: 'ADH:review-history', name: 'Review History Supplier', county: 'Benton', kind: 'system' }
const stamp = i => new Date(Date.now() - (20 - i) * 60000).toISOString()
const checks = [0, 1].map(i => ({ at: stamp(i), outcome: 'success', records: [] }))
for (let i = 2; i < 10; i++) checks.push({ at: stamp(i), outcome: 'failure', error: `Synthetic HTTP ${500 + i}` })
const source = { agency: 'ADH', records: [], retrievedAt: checks.at(-1).at, lastSuccessAt: checks[1].at, error: 'Synthetic retrieval failed', checks, lastSuccessfulCheck: checks[1] }
try {
  for (const width of [1440, 1280, 390, 320]) for (const language of ['en', 'es']) {
    let displayedSource = source
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(({ language, id }) => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language, checkOnOpen: true })), { language, id: place.id })
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/status' || path === '/api/check') return route.fulfill({ json: { places: [place], archive: [], coverageStart: checks[0].at, sources: [displayedSource, { agency: 'ADEQ', records: [], retrievedAt: null, lastSuccessAt: null, error: 'Not checked' }] } })
      if (path === '/api/push/config') return route.fulfill({ json: { enabled: false, publicKey: null } })
      throw new Error(`Unexpected API call ${path}`)
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(url)
    const card = page.locator('.status-card').first()
    await card.waitFor()
    assert.match(await card.innerText(), language === 'en' ? /Current advisory status unavailable/ : /El estado actual de los avisos no está disponible/)
    await card.locator('.supplier-info-button').focus(); await page.keyboard.press('Space')
    assert.equal(await card.locator('dialog .source-link').last().getAttribute('href'), 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx')
    const toggle = card.locator('.supplier-source-activity .check-toggle')
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    assert.equal(await card.locator('dialog').isVisible(), true)
    assert.equal(await card.locator('.latest-attempt').count(), 0)
    await page.screenshot({ path: `test-results/source-checks/${width}-${language}-collapsed-failure.png`, fullPage: true })
    await toggle.focus(); await page.keyboard.press('Enter')
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true')
    assert.equal(await card.locator('.check-event').count(), 6)
    await card.getByRole('button', { name: language === 'en' ? 'Show more checks' : 'Mostrar más consultas' }).click()
    const repeated = card.locator('.repeated-checks summary')
    await repeated.focus(); await page.keyboard.press('Enter')
    assert.equal(await card.locator('.repeated-checks').getAttribute('open'), '')
    assert.equal(await card.locator('.individual-check').count(), 2)
    const history = card.locator('.check-history')
    assert.doesNotMatch(await history.innerText(), /America\/Chicago|Feed retrieved successfully|Fuente recuperada correctamente/)
    assert.equal(await history.locator('.check-event.failure').count(), 8)
    assert.equal(await history.locator('.check-range').count(), 0)
    assert.equal(await history.locator('.repeated-checks summary span').first().evaluate(el => getComputedStyle(el).transform), 'none')
    assert.equal(await history.locator('.check-result p').first().evaluate(el => getComputedStyle(el).fontSize), '15px')
    assert.match(await card.locator('dialog').innerText(), language === 'en' ? /Limited coverage/ : /Cobertura limitada/)
    assert.match(await card.locator('.last-check').innerText(), language === 'en' ? /No matching active advisory/ : /No se encontró/)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `test-results/source-checks/${width}-${language}.png`, fullPage: true })
    await toggle.focus(); await page.keyboard.press('Enter')
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    for (const state of ['none', 'active', 'no-success']) {
      const at = new Date().toISOString()
      const records = state === 'active' ? [{ id: 'ADH:synthetic', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: place.county, area: 'Synthetic affected area', reason: 'Synthetic main break', issued: '10/14/2026', lifted: null, url: 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx' }] : []
      const check = { at, outcome: 'success', records }
      displayedSource = state === 'no-success' ? { ...source, checks: [checks.at(-1)], lastSuccessfulCheck: null, lastSuccessAt: null } : { agency: 'ADH', records, retrievedAt: at, lastSuccessAt: at, error: null, checks: [check], lastSuccessfulCheck: check }
      await page.reload()
      await card.waitFor()
      await card.locator('.supplier-info-button').click()
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
      assert.equal(await card.locator('.latest-attempt').count(), 0)
      assert.equal(await card.locator('.last-check').count(), 0)
      assert.equal(await card.locator('time').count(), 1)
      assert.equal(await card.locator('dialog .source-link').last().isVisible(), true)
      const expected = state === 'none' ? language === 'en' ? /No active advisory found/ : /No se encontró aviso activo/ : state === 'active' ? language === 'en' ? /Boil-water notice/ : /Aviso de hervir el agua/ : language === 'en' ? /Current advisory status unavailable/ : /El estado actual de los avisos no está disponible/
      assert.match(await card.innerText(), expected)
      await page.keyboard.press('Tab'); await toggle.focus()
      assert.notEqual(await toggle.evaluate(el => getComputedStyle(el).outlineStyle), 'none')
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: `test-results/source-checks/${width}-${language}-collapsed-${state}.png`, fullPage: true })
    }
    await card.getByRole('button', { name: language === 'en' ? 'Notice details' : 'Detalles del aviso' }).click()
    const savedHistory = page.locator('.supplier-source-activity')
    assert.equal(await savedHistory.locator('button').first().getAttribute('aria-expanded'), 'false')
    await savedHistory.locator('button').first().focus(); await page.keyboard.press('Enter')
    assert.equal(await savedHistory.locator('button').first().getAttribute('aria-expanded'), 'true')
    assert.match(await page.locator('.check-history').innerText(), /64/)
    assert.match(await page.locator('.check-history').innerText(), /1 MB/)
    assert.doesNotMatch(await page.locator('main').innerText(), /\(America\/Chicago\)/)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `test-results/source-checks/${width}-${language}-details.png`, fullPage: true })
    assert.deepEqual(errors, [])
    console.log(`PASS source checks ${width}px ${language}: historical no-match, actual failures, keyboard disclosures, grouping, show more, official link, no overflow`)
    await context.close()
  }
} finally { await browser.close() }
