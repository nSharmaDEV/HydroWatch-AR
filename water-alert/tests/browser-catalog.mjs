// UI-only catalog verification: every API request is synthetic and intercepted.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5189'
const output = 'test-results/catalog'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const names = ['Beaver Lake', 'Buffalo National River', 'FAYETTEVILLE WATERWORKS', 'SPRINGDALE WATER UTILITIES', 'ROGERS WATER UTILITIES', 'BENTONVILLE WATER UTILITIES']
const at = new Date().toISOString()
const records = ['Beaver Lake', 'Beaver Lake', 'Buffalo River'].map((name, i) => ({ id: `review-catalog-${i}`, placeId: `ADEQ:published-area-${i}`, name, county: 'Published county', agency: 'ADEQ', kind: 'hab', area: `Published area ${i}`, reason: '', issued: 'October 13, 2026', lifted: null, url: 'https://adeq.state.ar.us/water/planning/hab/advisories.json', lastObservedAt: at }))
const fixture = failed => ({ places: [], archive: failed ? [] : records, coverageStart: failed ? null : at, sources: ['ADH', 'ADEQ'].map(agency => ({ agency, records: failed || agency === 'ADH' ? [] : records, retrievedAt: failed ? null : at, lastSuccessAt: failed ? null : at, error: failed ? 'Simulated unavailable source' : null })) })
try {
  for (const width of [1440, 390]) for (const language of ['en', 'es']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    let failed = true
    const requests = [], errors = []
    await context.addInitScript(language => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [], liftWatches: [], language, checkOnOpen: true })), language)
    await context.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname
      requests.push(`${req.method()} ${path}`)
      if (path === '/api/status' || path === '/api/check') return route.fulfill({ json: fixture(failed) })
      if (path === '/api/push/config') return route.fulfill({ json: { enabled: false, publicKey: null } })
      throw new Error(`Unexpected request: ${req.method()} ${path}`)
    })
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(url)
    const nav = name => page.getByRole('navigation').getByRole('button', { name, exact: true })
    const select = name => page.getByRole('button', { name: `${language === 'en' ? 'Select' : 'Elegir'} ${name}`, exact: true })
    const confirm = language === 'en' ? 'Yes — watch this place' : 'Sí — seguir este lugar'
    for (const [i, name] of names.entries()) {
      if (i === 0) await page.getByRole('button', { name: language === 'en' ? /A lake or waterbody/ : /Un lago o cuerpo de agua/ }).click()
      else {
        await nav(language === 'en' ? 'Places' : 'Lugares').click()
        await page.getByRole('button', { name: i < 2 ? language === 'en' ? /Add a lake or waterbody/ : /Añadir un lago o cuerpo de agua/ : language === 'en' ? /Add a public water supplier/ : /Añadir un proveedor público de agua/ }).click()
      }
      await page.getByRole('searchbox').fill(i === 1 ? 'Buffalo River' : name)
      await select(name).click()
      await page.getByRole('link', { name: language === 'en' ? /Catalog source/ : /Fuente del catálogo/ }).waitFor()
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('water-alert:live:v1')).watches.length), i)
      await page.getByRole('button', { name: confirm }).click()
      await page.locator('.status-card').nth(i).waitFor()
    }
    assert.equal(await page.locator('.status-card.unavailable').count(), 6)
    failed = false
    await page.getByRole('button', { name: language === 'en' ? 'Check sources' : 'Consultar fuentes', exact: true }).click()
    await page.locator('.status-card.hab').first().waitFor()
    assert.equal(await page.locator('.status-card.hab').count(), 2)
    assert.equal(await page.locator('.status-card.none').count(), 4)
    const lake = page.locator('.status-card').filter({ has: page.getByRole('heading', { name: 'Beaver Lake', exact: true }) })
    assert.match(await lake.innerText(), /Published area 0/)
    assert.match(await lake.innerText(), /Published area 1/)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await page.screenshot({ path: `${output}/${width}-${language}-synthetic-home.png`, fullPage: true })
    await lake.getByRole('button').click()
    assert.match(await page.locator('.detail-status').innerText(), /Published area 1/)
    await nav(language === 'en' ? 'History' : 'Historial').click()
    assert.equal(await page.locator('.history-record').count(), 3)
    assert.equal(requests.filter(r => r.includes('/api/push/device')).length, 0)
    assert.deepEqual(errors, [])
    console.log(`PASS catalog ${width}px ${language}: six selectable places, confirmation, Buffalo alias, retained area records, history and unavailable states; no real API calls`)
    await context.close()
  }
} finally { await browser.close() }
