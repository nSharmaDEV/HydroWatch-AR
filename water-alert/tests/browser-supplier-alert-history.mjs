// Disposable synthetic API responses only: no real checks, records or notifications.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5189'
const official = 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx'
const place = { id: 'ADH:synthetic-history', name: 'Synthetic History Supplier', county: 'Benton', kind: 'system' }
const at = new Date().toISOString()
const notice = { id: 'ADH:synthetic-notice', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', area: 'Synthetic Creek Road customers', county: 'Benton', reason: 'Synthetic published main break', issued: '10/13/2026', lifted: null, url: official, firstObservedAt: at, lastObservedAt: at, guidance: { quote: 'Synthetic retained official instruction.', url: official, verifiedAt: at } }
await mkdir('test-results/supplier-alert-history', { recursive: true })
const browser = await chromium.launch()
try {
  for (const width of [1280, 390, 320]) for (const language of ['en', 'es']) {
    let state = 'active'
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(({ language, id }) => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language, checkOnOpen: true })), { language, id: place.id })
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/push/config') return route.fulfill({ json: { enabled: false, publicKey: null } })
      assert(['/api/status', '/api/check'].includes(path), `Unexpected API call ${path}`)
      const retained = state === 'lifted' ? { ...notice, lifted: '10/14/2026' } : state === 'missing' ? { ...notice, area: '', reason: '', issued: null, guidance: undefined } : notice
      const records = state === 'empty' || state === 'disappeared' ? [] : [retained]
      const check = { at, outcome: 'success', records }
      const source = { agency: 'ADH', records, retrievedAt: at, lastSuccessAt: at, error: state === 'failure' ? 'Synthetic timeout' : null, historyStartedAt: at, checks: [check, check, ...(state === 'failure' ? [{ at, outcome: 'failure', error: 'Synthetic timeout' }] : [])], lastSuccessfulCheck: check }
      return route.fulfill({ json: { places: [place], archive: state === 'empty' ? [] : [retained, { ...notice, id: 'ADH:other', placeId: 'ADH:other', name: 'Other supplier' }], sources: [source, { agency: 'ADEQ', records: [], retrievedAt: null, lastSuccessAt: null, error: 'Not checked' }], coverageStart: at } })
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (state of ['active', 'lifted', 'missing', 'empty', 'failure', 'disappeared']) {
      await page.goto(url)
      const card = page.locator('.supplier-card')
      await card.waitFor()
      const toggle = card.locator('.alert-toggle')
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
      assert.equal(await card.locator('.supplier-source-activity button').getAttribute('aria-expanded'), 'false')
      assert.equal(await card.locator('.check-history').isVisible(), false)
      const info = card.locator('.supplier-info-button')
      await info.focus(); await page.keyboard.press('Enter')
      const popup = page.getByRole('dialog')
      assert.equal(await popup.isVisible(), true)
      assert.equal(await popup.locator('time').first().getAttribute('datetime'), at)
      assert.equal(await popup.getByRole('link', { name: language === 'en' ? /Read official notice/ : /Leer aviso oficial/ }).getAttribute('href'), official)
      assert.equal(await popup.locator('.supplier-source-activity button').getAttribute('aria-expanded'), 'false')
      assert(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)))
      await page.keyboard.press('Shift+Tab')
      // Native modal traversal may visit browser chrome at the boundary.
      await page.keyboard.press('Tab')
      assert(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)))
      await page.screenshot({ path: `test-results/supplier-alert-history/${width}-${language}-${state}-info.png`, fullPage: true })
      await page.keyboard.press('Escape')
      assert.equal(await popup.isVisible(), false)
      assert(await info.evaluate(el => el === document.activeElement))
      const sidebar = page.locator('.home-sidebar')
      assert.equal(await sidebar.evaluate(el => getComputedStyle(el).borderLeftWidth), width <= 760 ? '0px' : '1px')
      assert.equal(await card.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)')
      await toggle.focus(); await page.keyboard.press('Enter')
      const history = card.locator('.supplier-alert-history')
      assert.equal(await history.isVisible(), true)
      assert.equal(await history.locator('.supplier-alert-notice').count(), state === 'empty' ? 0 : 1)
      assert.doesNotMatch(await history.innerText(), /Other supplier|Synthetic timeout|checks with the same result/)
      if (state === 'empty') assert.match(await history.innerText(), language === 'en' ? /No advisory notices saved for this supplier\./ : /No hay avisos/)
      else {
        assert.equal(await history.locator('a').last().getAttribute('href'), official)
        if (state === 'lifted') assert.equal(await history.locator('.lifted').count(), 1)
        if (state === 'active' || state === 'missing') assert.equal(await history.locator('.active').count(), 1)
        if (state === 'failure' || state === 'disappeared') assert.equal(await history.locator('.unconfirmed').count(), 1)
        if (state === 'missing') assert.equal(await history.getByText(language === 'en' ? 'Not provided in the source.' : 'No proporcionado en la fuente.', { exact: true }).count(), 5)
        else assert.match(await history.innerText(), /Synthetic published main break/)
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await page.screenshot({ path: `test-results/supplier-alert-history/${width}-${language}-${state}.png`, fullPage: true })
      await toggle.focus(); await page.keyboard.press('Enter')
      assert.equal(await history.isVisible(), false)
      await page.screenshot({ path: `test-results/supplier-alert-history/${width}-${language}-${state}-collapsed.png`, fullPage: true })
      console.log(`PASS supplier alert history ${width}px ${language} ${state}`)
    }
    assert.deepEqual(errors, [])
    await context.close()
  }
} finally { await browser.close() }
