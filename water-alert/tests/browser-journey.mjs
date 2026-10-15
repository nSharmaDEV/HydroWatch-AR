// UI-only verification. Every API request is intercepted; no backend or notifications run.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:5189'
const output = 'test-results/journey'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const places = [
  { id: 'ADH:review-supplier', name: 'Review Water Supplier', county: 'Benton', kind: 'system' },
  { id: 'ADH:review-none', name: 'Review Ridge Supplier', county: 'Washington', kind: 'system' },
  { id: 'ADEQ:review-lake', name: 'Review Cove Lake', county: 'Carroll', kind: 'lake' },
]
const at = new Date().toISOString()
const records = [
  { id: 'review-boil', placeId: places[0].id, name: places[0].name, county: places[0].county, agency: 'ADH', kind: 'boil', area: 'Published review area', reason: 'Recorded repair', issued: 'Oct 12, 2026', lifted: null, url: 'https://health.arkansas.gov/wa_engTraining/boilwaterorder.aspx', firstObservedAt: at, lastObservedAt: at },
  { id: 'review-hab', placeId: places[2].id, name: places[2].name, county: places[2].county, agency: 'ADEQ', kind: 'hab', area: 'Review north cove', reason: 'Published review advisory', issued: 'Oct 10, 2026', lifted: null, url: 'https://adeq.state.ar.us/water/planning/hab/advisories.json', firstObservedAt: at, lastObservedAt: at },
]
function fixture(failed = false) {
  return { places, archive: records, coverageStart: at, sources: ['ADH', 'ADEQ'].map(agency => ({ agency, records: records.filter(n => n.agency === agency), retrievedAt: at, lastSuccessAt: at, error: failed ? 'Simulated failed retrieval' : null })) }
}
const labels = {
  en: { supplier: /My public water supplier/, select: 'Select Review Water Supplier', confirm: 'Yes — watch this place', home: 'My Water', settings: 'Settings', places: 'Places', history: 'History', sample: 'Try sample mode', sampleIntro: 'Try a resident journey', sampleList: 'Use sample watch list', exit: 'Exit sample', remove: 'Remove Review Water Supplier', undo: 'Undo', noMatch: 'No matching supplier', edit: 'Edit search', unavailable: 'Data unavailable', previous: /Previously observed/, privacy: /Privacy and stored data/, deletion: 'Remove saved data', more: /All observed places/, alerts: /Alert Options/ },
  es: { supplier: /Mi proveedor público de agua/, select: 'Elegir Review Water Supplier', confirm: 'Sí — seguir este lugar', home: 'Mi agua', settings: 'Ajustes', places: 'Lugares', history: 'Historial', sample: 'Probar modo de muestra', sampleIntro: 'Prueba un recorrido de residente', sampleList: 'Usar lista de muestra', exit: 'Salir de muestra', remove: 'Quitar Review Water Supplier', undo: 'Deshacer', noMatch: 'Ningún proveedor coincide', edit: 'Editar búsqueda', unavailable: 'Datos no disponibles', previous: /observad[oa].*anteriormente/, privacy: /Privacidad y datos guardados/, deletion: 'Eliminar datos guardados', more: /Todos los lugares observados/, alerts: /Opciones de avisos/ },
}
async function visible(locator) { await locator.waitFor({ state: 'visible' }); assert(await locator.isVisible()) }
async function layout(page) {
  const metrics = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth, nav: getComputedStyle(document.querySelector('nav')).position, focus: document.activeElement?.id }))
  assert(metrics.scroll <= metrics.width, `Horizontal overflow: ${JSON.stringify(metrics)}`)
  assert.equal(metrics.nav, metrics.width <= 760 ? 'fixed' : 'static')
}
try {
  for (const width of [1440, 820, 390, 320]) for (const language of ['en', 'es']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const t = labels[language]
    const requests = [], errors = []
    let failed = false, deletionFails = true
    await context.addInitScript(({ language }) => {
      localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [], liftWatches: [], language, checkOnOpen: true }))
      window.__permissionRequests = 0
      if ('Notification' in window) Notification.requestPermission = async () => { window.__permissionRequests++; return 'denied' }
    }, { language })
    await context.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname
      requests.push(`${req.method()} ${path}`)
      if (path === '/api/status' || path === '/api/check') return route.fulfill({ json: fixture(failed) })
      if (path === '/api/push/config') return route.fulfill({ json: { enabled: false, publicKey: null } })
      if (path === '/api/push/device' && req.method() === 'DELETE') return route.fulfill({ status: deletionFails ? 503 : 200, json: {} })
      throw new Error(`Unexpected API request: ${req.method()} ${path}`)
    })
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(url)
    await visible(page.getByRole('button', { name: t.supplier }))
    await layout(page)
    await page.screenshot({ path: `${output}/${width}-${language}-welcome.png`, fullPage: true })
    await page.keyboard.press('Tab')
    assert(await page.getByRole('button', { name: t.supplier }).evaluate(el => el === document.activeElement))
    await page.keyboard.press('Enter')
    await page.getByRole('searchbox').fill('No such supplier')
    await visible(page.getByRole('heading', { name: t.noMatch }))
    await page.getByRole('button', { name: t.edit }).click()
    assert.equal(await page.getByRole('searchbox').evaluate(el => el === document.activeElement), true)
    await page.getByRole('searchbox').fill('Review Water')
    // Enter activates the selection and confirmation; focus moves to the new main view.
    await page.getByRole('button', { name: t.select, exact: true }).focus()
    await page.keyboard.press('Enter')
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('water-alert:live:v1')).watches), [])
    await page.keyboard.press('Tab') // Back to search
    await page.keyboard.press('Tab') // Confirm this exact place
    assert(await page.getByRole('button', { name: t.confirm }).evaluate(el => el === document.activeElement))
    await page.keyboard.press('Enter')
    await visible(page.getByRole('heading', { name: t.home }))
    // Use the real journeys, not injected preferences, to add the remaining places.
    const nav = name => page.getByRole('navigation').getByRole('button', { name, exact: true })
    await nav(t.places).click()
    const addLake = language === 'en' ? /Add a lake or waterbody/ : /Añadir un lago o cuerpo de agua/
    await page.getByRole('button', { name: addLake }).click()
    await page.getByRole('button', { name: `${language === 'en' ? 'Select' : 'Elegir'} Review Cove Lake` }).click()
    await page.getByRole('button', { name: t.confirm }).click()
    await nav(t.places).click()
    await page.getByRole('button', { name: language === 'en' ? /Add a public water supplier/ : /Añadir un proveedor público de agua/ }).click()
    await page.getByRole('button', { name: `${language === 'en' ? 'Select' : 'Elegir'} Review Ridge Supplier` }).click()
    await page.getByRole('button', { name: t.confirm }).click()
    assert.equal(await page.locator('.status-card.boil').count(), 1)
    assert.equal(await page.locator('.status-card.hab').count(), 1)
    assert.equal(await page.locator('.status-card.none').count(), 1)
    await layout(page)
    await page.screenshot({ path: `${output}/${width}-${language}-live-home.png`, fullPage: true })
    await page.locator('.status-card.boil .supplier-info-button').click()
    await page.getByRole('dialog').getByRole('button', { name: language === 'en' ? 'Notice details' : 'Detalles del aviso' }).click()
    await visible(page.getByText('Oct 12, 2026', { exact: true }))
    assert.equal(await page.getByText('Published (this record)', { exact: true }).count(), 0)
    assert.match(await page.locator('.detail-disclosures').innerText(), /CDT|CST/)
    assert.doesNotMatch(await page.locator('.detail-disclosures').innerText(), /America\/Chicago/)
    await layout(page)
    await page.screenshot({ path: `${output}/${width}-${language}-notice.png`, fullPage: true })
    await nav(t.places).click()
    await page.getByRole('button', { name: t.remove }).click()
    await page.getByRole('button', { name: t.undo }).click()
    assert.equal(await page.getByRole('button', { name: t.remove }).count(), 1)
    await nav(t.history).click()
    assert.equal(await page.locator('.history-record').count(), 2)
    await page.getByRole('button', { name: t.more }).click()
    await layout(page)
    await nav(t.settings).click()
    await page.getByRole('button', { name: t.alerts }).click()
    assert.equal(await page.locator('.push-controls .primary').isDisabled(), true)
    assert.equal(await page.evaluate(() => window.__permissionRequests), 0)
    await nav(language === 'en' ? 'Home' : 'Inicio').click()
    failed = true
    await page.getByRole('button', { name: language === 'en' ? 'Check sources' : 'Consultar fuentes', exact: true }).click()
    await page.locator('.status-card.unavailable').first().waitFor()
    assert.equal(await page.locator('.status-card.unavailable').count(), 3)
    await visible(page.locator('.supplier-card').first().getByText(language === 'en' ? 'Current advisory status unavailable.' : 'El estado actual de los avisos no está disponible.'))
    await visible(page.locator('.status-card:not(.supplier-card)').getByText(t.previous).first())
    const gray = await page.locator('.status-card.unavailable').first().evaluate(el => getComputedStyle(el).borderTopColor)
    assert.equal(gray, 'rgb(123, 137, 151)')
    await page.screenshot({ path: `${output}/${width}-${language}-failed-source.png`, fullPage: true })
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('water-alert:live:v1')))
    await nav(t.settings).click()
    await page.getByRole('button', { name: t.sample, exact: true }).click()
    // Live and sample languages are independently persisted, just like watch choices.
    if (language === 'es') await page.getByRole('button', { name: 'ES', exact: true }).click()
    await visible(page.getByRole('heading', { name: t.sampleIntro }))
    await page.getByRole('button', { name: t.sampleList }).click()
    assert.equal(await page.locator('.status-card.boil').count(), 1)
    assert.equal(await page.locator('.status-card.none').count(), 1)
    assert.equal(await page.locator('.status-card.unavailable').count(), 1)
    await layout(page)
    await page.screenshot({ path: `${output}/${width}-${language}-sample-home.png`, fullPage: true })
    const sampleRequestCount = requests.length
    await page.getByRole('checkbox').check()
    assert.equal(await page.locator('.status-card.hab').count(), 1)
    assert.equal(await page.locator('.status-card.unavailable').count(), 0)
    assert.equal(requests.length, sampleRequestCount)
    await page.getByRole('button', { name: t.exit, exact: true }).click()
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('water-alert:live:v1'))), before)
    await nav(t.settings).click()
    await page.getByRole('button', { name: t.privacy }).click()
    await page.evaluate(() => localStorage.setItem('water-alert:push-device:v1', JSON.stringify({ token: 'a'.repeat(43), signature: 'old' })))
    await page.getByRole('button', { name: t.deletion }).click()
    await page.waitForFunction(() => document.querySelector('.message'))
    assert.notEqual(await page.evaluate(() => localStorage.getItem('water-alert:push-device:v1')), null)
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('water-alert:live:v1')).watches), before.watches)
    deletionFails = false
    await page.getByRole('button', { name: t.deletion }).click()
    await visible(page.getByRole('button', { name: /My public water supplier/ }))
    assert.equal(await page.evaluate(() => localStorage.getItem('water-alert:push-device:v1')), null)
    assert.equal(requests.filter(r => r === 'POST /api/push/device').length, 0)
    assert.equal(requests.filter(r => r === 'DELETE /api/push/device').length, 2)
    assert.deepEqual(errors, [])
    console.log(`PASS ${width}px ${language}: confirmation, keyboard, states, history, alerts, isolated sample, failed-source and deletion retry; no real API calls`)
    await context.close()
  }
} finally { await browser.close() }
