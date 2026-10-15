// Synthetic advisory evidence only. Intercept all API calls; never enroll/send.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5189'
await mkdir('test-results/adeq-cards', { recursive: true })
const browser = await chromium.launch()
const place = { id: 'ADEQ:review-lake', name: 'Synthetic Review Lake *', county: 'Crittenden County', kind: 'lake' }
const at = new Date().toISOString()
const record = { id: 'ADEQ:review-record', placeId: place.id, name: place.name, county: place.county, agency: 'ADEQ', kind: 'hab', area: 'Synthetic published area', reason: '', issued: 'June 21, 2019', lifted: null, liftStatus: 'unknown', url: 'https://adeq.state.ar.us/water/planning/hab/advisories.json', sourceUpdatedAt: 'September 28, 2026', firstObservedAt: '2026-10-13T12:00:00Z', lastObservedAt: at }
try {
  for (const width of [1440, 390, 320]) for (const language of ['en', 'es']) {
    let current = record
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addInitScript(({ language, id }) => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language, checkOnOpen: true })), { language, id: place.id })
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/push/config') return route.fulfill({ json: { enabled: false, publicKey: null } })
      if (path !== '/api/status' && path !== '/api/check') throw new Error(`Unexpected API ${path}`)
      return route.fulfill({ json: { places: [place], archive: [current], coverageStart: record.firstObservedAt, sources: [{ agency: 'ADEQ', records: [current], retrievedAt: at, lastSuccessAt: at, error: null }, { agency: 'ADH', records: [], retrievedAt: null, lastSuccessAt: null, error: 'Not checked' }] } })
    })
    const page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    const capture = async name => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow`)
      await page.screenshot({ path: `test-results/adeq-cards/${width}-${language}-${name}.png`, fullPage: true })
    }
    await page.goto(url)
    const card = page.locator('.status-card').first()
    await card.waitFor()
    assert(await card.evaluate(el => el.classList.contains('unavailable')))
    assert.match(await card.innerText(), /N\/A/)
    await capture('unknown-home')
    await card.locator('button').last().click()
    await page.locator('.detail-layout').waitFor()
    assert.match(await page.locator('.detail-status').innerText(), language === 'en' ? /cannot confirm whether this advisory is active or lifted/ : /no puede confirmar si este aviso está activo o se levantó/)
    assert.match(await page.locator('.detail-disclosures').innerText(), language === 'en' ? /Not provided — record reads “N\/A”/ : /No proporcionado — el registro indica “N\/A”/)
    await capture('unknown-detail')
    await page.getByRole('navigation').getByRole('button', { name: language === 'en' ? 'History' : 'Historial', exact: true }).click()
    const history = page.locator('.history-record')
    await history.waitFor()
    assert.match(await history.innerText(), language === 'en' ? /No lift date is provided/ : /No se proporciona una fecha/)
    assert.match(await history.innerText(), /June 21, 2019/)
    assert.match(await history.innerText(), /September 28, 2026/)
    assert.equal(await history.locator(`time[datetime="${record.firstObservedAt}"]`).count(), 1)
    assert.equal(await history.locator(`time[datetime="${at}"]`).count(), 1)
    const guidance = history.locator('.adeq-guidance')
    assert.match(await guidance.innerText(), /A water body with no HAB advisory is not an indication/)
    const summary = guidance.locator('summary')
    await summary.focus(); await page.keyboard.press('Enter')
    assert.equal(await guidance.locator('details').getAttribute('open'), '')
    assert.equal(await guidance.locator('a[href="tel:+15016820744"]').isVisible(), true)
    assert.equal(await guidance.locator('a[href="mailto:adh.ep.its@arkansas.gov"]').isVisible(), true)
    assert.equal(await guidance.locator('time').getAttribute('datetime'), '2026-10-14')
    assert.equal(await guidance.locator('blockquote[lang="en"]').count(), 4)
    await capture('unknown-history-guidance')
    current = { ...record, liftStatus: undefined }
    await page.reload()
    await card.waitFor()
    assert(await card.evaluate(el => el.classList.contains('hab')))
    assert.match(await card.innerText(), /June 21, 2019/)
    await capture('current-home')
    await card.locator('button').last().click()
    await page.locator('.detail-layout').waitFor()
    assert.equal(await page.locator('.adeq-guidance').count(), 1)
    await capture('current-detail')
    assert.deepEqual(errors, [])
    console.log(`PASS ADEQ cards ${width}px ${language}: unknown home/detail/history, provenance, keyboard guidance, current HAB/detail, no overflow`)
    await context.close()
  }
} finally { await browser.close() }
