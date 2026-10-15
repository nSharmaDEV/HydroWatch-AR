// Synthetic status only; never activate a phone/email link or contact the provider.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const at = new Date().toISOString()
const notice = { id: 'ADH:contact-preview', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Entire System', reason: 'Synthetic preview — not a live advisory', issued: '10/14/2026', lifted: null, url: 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx' }
await mkdir('test-results/provider-contact', { recursive: true })
const browser = await chromium.launch()
try {
  for (const width of [1280, 390, 320]) for (const language of ['en', 'es']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(({ id, language }) => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language, checkOnOpen: true })), { id: place.id, language })
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/push/config') return route.fulfill({ json: { enabled: false, publicKey: null } })
      assert(['/api/status', '/api/check'].includes(path))
      return route.fulfill({ json: { places: [place], archive: [notice], sources: [{ agency: 'ADH', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }, { agency: 'ADEQ', records: [], retrievedAt: null, lastSuccessAt: null, error: 'Not checked' }], coverageStart: at } })
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(process.argv[2] ?? 'http://localhost:5189')
    const contact = page.locator('.supplier-card .provider-contact')
    await contact.waitFor()
    assert.equal(await contact.locator('a[href^="tel:"]').getAttribute('href'), 'tel:+14795492158')
    assert.equal(await contact.locator('a[href^="mailto:"]').getAttribute('href'), 'mailto:LEISUREHILLSWATERCO@GMAIL.COM')
    await contact.locator('a[href^="tel:"]').focus()
    await page.keyboard.press('Tab')
    assert(await contact.locator('a[href^="mailto:"]').evaluate(el => el === document.activeElement))
    await contact.locator('summary').click()
    assert(await contact.locator('time').isVisible())
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: `test-results/provider-contact/${width}-${language}.png`, fullPage: true })
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log('Provider contact checks pass at 1280, 390 and 320px in EN/ES; no calls/emails initiated.')
} finally { await browser.close() }
