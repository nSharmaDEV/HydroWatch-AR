import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { SOURCES, type Notice, type Place, type SourceSnapshot } from '../../src/domain'
import { en, es } from '../../src/strings'
import { PLACE_CATALOG } from '../../src/place-catalog'
import { LEISURE_HILLS_ID } from '../../src/annual-reports'
import zipSnapshot from '../../src/directory/zip-suppliers.json' with { type: 'json' }

// Synthetic incident on the exact directory-backed supplier ID. Not a live record.
const at = '2026-10-17T12:00:00Z'
const place: Place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
const displayName = 'Leisure Hills Mobile Home Park'
const notice: Notice = { id: 'e2e-synthetic-notice', placeId: place.id, name: place.name, agency: 'ADH', kind: 'boil', county: place.county, area: 'Synthetic test: entire system', reason: 'Synthetic test incident', issued: '10/17/2026', lifted: null, url: SOURCES.ADH, firstObservedAt: at, lastObservedAt: at }
const evidenceByPage = new WeakMap<Page, { unexpected: string[]; errors: string[] }>()

function observations(state: 'fresh' | 'failed' | 'stale' = 'fresh') {
  const checkedAt = state === 'stale' ? '2026-10-17T11:45:00Z' : at
  const sources: SourceSnapshot[] = [
    { agency: 'ADH', records: [notice], retrievedAt: checkedAt, lastSuccessAt: checkedAt, error: state === 'failed' ? 'Synthetic retrieval failure' : null },
    { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
  ]
  return { sources, archive: [notice], places: [place], coverageStart: at }
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.clock.setFixedTime(new Date(at))
  const unexpected: string[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  // No production URL, local backend, private data files, or real agency retrieval.
  // Fulfill only status reads; fail the test on every other API or external request.
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === baseURL && url.pathname === '/api/push/config' && request.method() === 'GET') return route.fulfill({ json: { enabled: false } })
    if (url.origin === baseURL && url.pathname === '/api/help/session' && request.method() === 'GET') return route.fulfill({ json: { enabled: false, user: null, delivery: false } })
    if (url.origin !== baseURL || (url.pathname.startsWith('/api/') &&
      (url.pathname !== '/api/status' || request.method() !== 'GET'))) {
      unexpected.push(`${request.method()} ${url.origin}${url.pathname}`)
      await route.abort()
    } else if (url.pathname === '/api/status') {
      await route.fulfill({ json: observations() })
    } else {
      await route.continue()
    }
  })
  await test.info().attach('fixture-scope', { body: 'Synthetic incident; curated contact hrefs only. No live verification or sends.', contentType: 'text/plain' })
  // Assertions also run when the journey fails, exposing accidental network activity.
  evidenceByPage.set(page, { unexpected, errors })
})

test.afterEach(async ({ page }) => {
  const evidence = evidenceByPage.get(page)!
  expect(evidence.unexpected, 'No external requests or API mutations').toEqual([])
  expect(evidence.errors, 'No uncaught browser exceptions').toEqual([])
})

async function watchSupplier(page: Page, supplier = place) {
  await page.goto('/')
  await page.getByRole('navigation').getByRole('button', { name: 'Places', exact: true }).click()
  await page.getByRole('button', { name: /Add a place/ }).click()
  await page.getByRole('searchbox').fill(supplier.name)
  await page.getByRole('button', { name: `Select ${supplier.name}`, exact: true }).click()
  await expect(page.getByRole('article')).toBeVisible()
  await expect(page.getByText('Does this match your water bill?')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Places', exact: true }).click()
}

for (const language of ['en', 'es'] as const) {
  test(`ZIP suggestions remain optional and reachable (${language})`, async ({ page }) => {
    const t = language === 'en' ? en : es
    await page.goto('/')
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    await page.getByRole('searchbox').fill('72712')
    await page.getByRole('button', { name: language === 'en' ? 'Search' : 'Buscar', exact: true }).click()
    await expect(page.getByText(`${t.zipHeading} 72712`, { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: t.zipNext, exact: true })).toHaveCount(0)
    const viewport = page.viewportSize()!
    for (const control of [page.locator('.search-field'), page.locator('.zip-results'), page.locator('.zip-provenance > summary'), page.locator('.search-glass > details').last()]) {
      const box = (await control.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - (viewport.width < 761 ? 70 : 0))
    }
    const names = await page.locator('.place-row h2').evaluateAll(elements => elements.map(e => e.getAttribute('title')!))
    expect(names).toEqual(zipSnapshot.zips['72712'].map(id => zipSnapshot.systems[id as keyof typeof zipSnapshot.systems].name).sort((a, b) => a.localeCompare(b, 'en')))
    expect(await page.locator('.zip-results').evaluate(el => getComputedStyle(el).overflowY)).toBe('auto')
    expect(await page.locator('.zip-results').evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
    const selected = page.locator('.place-row button').last()
    const label = (await selected.getAttribute('aria-label'))!
    await selected.click()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('water-alert:live:v1')!).watches)).toEqual([])
    await page.getByRole('button', { name: language === 'en' ? 'Back' : 'Atrás', exact: true }).click()
    await expect(page.getByRole('searchbox')).toHaveValue('72712')
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
    await page.locator('.zip-provenance > summary').click()
    await expect(page.getByText(t.zipCaution, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: t.zipFallback, exact: true }).click()
    await expect(page.getByRole('searchbox')).toBeFocused()
    await page.getByRole('searchbox').fill('99999')
    await expect(page.getByText(t.zipNoMatch, { exact: true })).toBeVisible()
    await page.locator('.zip-provenance > summary').click()
    await page.getByRole('button', { name: t.zipFallback, exact: true }).click()
    await page.getByRole('searchbox').fill('BELLA VISTA POA')
    await expect(page.getByRole('heading', { name: 'Bella Vista POA', exact: true })).toBeVisible()
    // Also cover the requested ZIP, including a narrow phone with longer Spanish labels.
    if (viewport.width < 761) await page.setViewportSize({ width: 320, height: viewport.height })
    await page.getByRole('searchbox').fill('72713')
    await expect(page.locator('.place-row')).toHaveCount(zipSnapshot.zips['72713'].length)
    for (const control of [page.locator('.search-field'), page.locator('.zip-results'), page.locator('.zip-provenance > summary'), page.locator('.search-glass > details').last()]) {
      const box = (await control.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - (viewport.width < 761 ? 70 : 0))
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`zip-scroll-${language}.png`) })
  })

  test(`supplier directory labels and acronyms stay readable (${language})`, async ({ page }) => {
    await page.goto('/#search')
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    await expect(page.getByRole('searchbox')).toHaveAttribute('placeholder', language === 'en' ? en.supplierZipSearch : es.supplierZipSearch)
    await expect(page.locator('.place-row')).toHaveCount(3)
    const viewport = page.viewportSize()!
    for (const button of await page.locator('.place-row button').all()) {
      const rect = (await button.boundingBox())!
      expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height - (viewport.width < 761 ? 70 : 0))
    }
    await page.getByRole('searchbox').fill('BELLA VISTA POA')
    await expect(page.getByRole('heading', { name: 'Bella Vista POA', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bella Vista POA', exact: true })).toHaveAttribute('title', 'BELLA VISTA POA')
  })
}

test('supplier preview keeps main controls in view and expands evidence separately', async ({ page }) => {
  await page.goto('/#search')
  await page.getByRole('searchbox').fill(place.name)
  await page.getByRole('button', { name: `Select ${place.name}`, exact: true }).click()
  const preview = page.locator('.result-glass')
  await expect(preview.getByRole('article')).toBeVisible()
  const details = preview.locator('.preview-details')
  await expect(details).not.toHaveAttribute('open')
  const viewport = page.viewportSize()!
  for (const control of [preview.getByRole('button', { name: 'Back', exact: true }), preview.getByRole('button', { name: 'Next', exact: true }), details.locator('summary').first()]) {
    const rect = await control.boundingBox()
    expect(rect).not.toBeNull()
    expect(rect!.y).toBeGreaterThanOrEqual(0)
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height - (viewport.width < 761 ? 70 : 0))
  }
  await details.locator('summary').first().click()
  await expect(details).toHaveAttribute('open', '')
  await preview.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Places', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: displayName, exact: true })).toBeVisible()
  const help = page.getByRole('button', { name: 'Get help with a water issue', exact: true })
  const add = page.getByRole('button', { name: '+ Add a place', exact: true })
  const buttonStyle = (element: HTMLElement | SVGElement) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, color: style.color, radius: style.borderRadius }
  }
  await expect(help).toBeVisible()
  expect(await help.evaluate(buttonStyle)).toEqual(await add.evaluate(buttonStyle))
  const helpWidth = (await help.boundingBox())!.width
  const cardWidth = (await page.getByRole('article').boundingBox())!.width
  expect(helpWidth).toBeGreaterThan(cardWidth * .85)
  const contact = page.locator('.supplier-contact-section').first()
  await expect(contact).toHaveCSS('padding-top', '16px')
  await expect(help).toHaveCSS('margin-top', '16px')
  const contactBox = (await contact.boundingBox())!
  const helpBox = (await help.boundingBox())!
  expect(helpBox.y - contactBox.y - contactBox.height).toBeCloseTo(16, 0)
  const sources = contact.locator('.contact-sources')
  await expect(sources).toHaveCSS('margin-top', '0px')
  const actions = contact.locator('.provider-contact-actions a')
  await expect(actions.nth(0)).toHaveText('Call')
  await expect(actions.nth(1)).toHaveText('Email')
  expect((await actions.nth(0).boundingBox())!.width).toBeCloseTo((await actions.nth(1).boundingBox())!.width, 0)
  await expect(sources.locator('.contact-email-source')).toHaveText('Email source: EPA')
  await expect(sources).not.toContainText('Checked')
})

for (const [language, t] of [['en', en], ['es', es]] as const) {
  for (const entry of PLACE_CATALOG.filter(entry => entry.place.kind === 'system')) {
    test(`supplier parity without an active notice: ${entry.place.name} (${language})`, async ({ page }) => {
      await page.route('**/api/status', route => route.fulfill({ json: {
        ...observations(), archive: [], places: [entry.place],
        sources: observations().sources.map(source => ({ ...source, records: [] })),
      } }))
      await watchSupplier(page, entry.place)
      await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
      await expect(page.locator('.supplier-finding .status-label')).toContainText(t.noneBoil)
      await page.getByRole('button', { name: new RegExp(`^${t.providerHelp}`) }).click()
      const report = page.locator('.annual-report')
      // Leisure Hills is a groundwater system with reviewed findings; the city
      // suppliers share Beaver Water District and a clean or unreviewed report,
      // shown as a heading-only Annual report card.
      const leisure = entry.place.id === LEISURE_HILLS_ID
      // Findings: heading is just "Annual report ··· PDF" (count lives in the Provider information chip).
      // Clean/unreviewed: "Annual report · year · pill · PDF".
      await expect(report.locator('h4')).toContainText(language === 'en' ? 'Annual report' : 'Informe anual')
      await expect(report.locator('.report-year')).toHaveCount(leisure ? 0 : 1)
      await expect(report.locator('.provider-card-facts')).toHaveCount(leisure ? 1 : 0)
      if (leisure) {
        await expect(report.locator('.provider-card-heading .status-pill')).toHaveCount(0)
        await expect(page.locator('.provider-info-chip')).toHaveText(language === 'en' ? '2025: 4 compliance issues' : '2025: 4 problemas de cumplimiento')
      } else {
        await expect(report.locator('.report-year')).toHaveText('2025')
        await expect(report.locator('.provider-card-heading .status-pill')).toContainText(entry.place.name.startsWith('SPRINGDALE')
          ? language === 'en' ? 'Not yet reviewed' : 'Aún no revisado'
          : language === 'en' ? 'No violations reported' : 'No se reportaron infracciones')
        await expect(report.locator('.provider-card-heading .status-pill')).toBeVisible()
      }
      await expect(page.locator('.provider-system-card .provider-card-note')).toHaveText(language === 'en' ? /^ADH directory, checked .+\.$/ : /^Directorio de ADH, revisado el .+\.$/)
      await expect(page.locator('.provider-water-source dd')).toHaveText(leisure ? /Roubidoux Formation Aquifer/ : /Beaver Water District/)
      await expect(page.locator(`.provider-info-content a[href="${entry.url}"]`)).toHaveCount(1)
      await expect(page.locator('.provider-system-card .provider-card-heading a')).toHaveAttribute('href', entry.url)
      await expect(page.locator('.provider-system-card .provider-card-facts')).toBeVisible()
      await expect(page.locator('.provider-system-card')).toContainText(leisure ? 'WELL #1' : 'BEAVER WATER DISTRICT')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (test.info().project.name === 'phone-sized') {
        await page.setViewportSize({ width: 320, height: 844 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      await page.screenshot({ path: test.info().outputPath(`supplier-parity-${language}.png`), fullPage: true })
      await page.getByRole('button', { name: language === 'en' ? 'Get help with a water issue' : 'Obtener ayuda con un problema de agua', exact: true }).click()
      await expect(page.locator('.request-guided-workspace')).toBeVisible()
    })
  }

  for (const scenario of [
    { name: 'GURDON WATERWORKS', id: 'ADH:734db608102088dbce04b8d92156cc248a9cc375a70905fe288aca9f5f550c4a', count: 1, pws: '087', kind: 'deficiency' },
    { name: 'SALEM WATER USERS LLC', id: 'ADH:dbf53925bdd33aa59425250c763c498e78d49d9b9dafa33585f495b829f2d212', count: 1, pws: '492', kind: 'intervals' },
    { name: 'LESLIE WATER SYSTEM', id: 'ADH:02cb014bef8a82412f4e855b029446ca9bdeade1bd8655f44abb39350e718682', count: 4, pws: '500', kind: 'upstream' },
    { name: 'CENTRAL LOGAN COUNTY PWFB', id: 'ADH:410e67db91f7d62c58b60070829a626df9b22f370e9f034925149311abe84287', count: 2, pws: '845', kind: 'conflict' },
    { name: 'RIVERSIDE RESORT AT KINGS RIVER', id: 'ADH:12bb8f46cb9fd02f88bf88b6d20172df4c34e235781dd5d43199b24761259eba', count: 0, pws: '', kind: 'missing' },
  ]) {
    test(`reviewed supplier report formatting: ${scenario.kind} (${language})`, async ({ page }) => {
      const supplier: Place = { ...place, name: scenario.name, id: scenario.id, county: ({ deficiency: 'Clark', intervals: 'Saline', upstream: 'Searcy', conflict: 'Logan', missing: 'Carroll' })[scenario.kind] ?? '' }
      const synthetic = { ...notice, name: supplier.name, placeId: supplier.id }
      const fixture = observations()
      await page.route('**/api/status', route => route.fulfill({ json: {
        ...fixture, places: [supplier], archive: [synthetic],
        sources: fixture.sources.map(source => source.agency === 'ADH' ? { ...source, records: [synthetic] } : source),
      } }))
      await watchSupplier(page, supplier)
      await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
      await expect(page.locator('.supplier-finding .status-label')).toContainText(t.activeBoil)
      await page.getByRole('button', { name: new RegExp(`^${t.providerHelp}`) }).click()
      const report = page.locator('.annual-report')
      if (scenario.kind === 'missing') {
        await expect(report.getByText(language === 'en' ? 'No 2025 report found' : 'No se encontró informe de 2025', { exact: true })).toBeVisible()
        await expect(report.locator('.report-toggle')).toHaveCount(0)
      } else {
        await expect(report.locator('.report-issues')).not.toBeVisible()
        const toggle = report.locator('.report-toggle')
        await toggle.focus()
        await page.keyboard.press('Enter')
        await expect(report.locator('.report-issues>ol>li')).toHaveCount(scenario.count)
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
        const first = report.locator('.report-issues>ol>li').first()
        const expectedPage = scenario.kind === 'intervals' ? 3 : 2
        await expect(first.locator('.report-issue-header a')).toHaveAttribute('href', `https://health.arkansas.gov/eng/d.aspx?P=${scenario.pws}&YEAR=2025#page=${expectedPage}`)
        if (scenario.kind === 'intervals') {
          await expect(report.locator('.report-periods li')).toHaveCount(2)
          await expect(report.locator('.report-periods')).toContainText('04/01/2025 – 04/30/2025')
          await expect(report.locator('.report-periods')).toContainText('10/01/2025 – 12/31/2025')
        } else if (scenario.kind === 'deficiency') {
          await expect(first.locator('.report-issue-kind')).toHaveText(language === 'en' ? 'Significant deficiency' : 'Deficiencia significativa')
          await expect(first.locator('dt').first()).toHaveText(language === 'en' ? 'Identified on' : 'Identificado el')
        } else if (scenario.kind === 'upstream') {
          await expect(first.locator('.report-issue-kind')).toHaveText(language === 'en' ? 'Upstream supplier finding' : 'Hallazgo del proveedor de origen')
          await expect(first).toContainText('Community Water')
        } else await expect(page.locator('.provider-info-chip')).toContainText(language === 'en' ? 'clarification needed' : 'requiere aclaración')
      }
      await report.scrollIntoViewIfNeeded()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (test.info().project.name === 'phone-sized') {
        await page.setViewportSize({ width: 320, height: 844 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      await page.screenshot({ path: test.info().outputPath(`reviewed-${scenario.kind}-${language}.png`), fullPage: true })
      await expect(page.locator('.supplier-finding .status-label')).toContainText(t.activeBoil)
    })
  }

  test(`issues-first annual report and independent provider details (${language})`, async ({ page }) => {
    await watchSupplier(page)
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    await page.getByRole('button', { name: new RegExp(`^${t.providerHelp}`) }).click()
    const report = page.locator('.annual-report')
    // With findings the visible header is just "Annual report ··· PDF"; the dated count sits in the
    // Provider information chip, and the year/status remain in the heading for screen readers.
    await expect(report.getByRole('heading', { name: language === 'en' ? /^Annual report 2025: 4 compliance issues reported;/ : /^Informe anual 2025: 4 problemas de cumplimiento reportados;/ })).toBeVisible()
    await expect(report.locator('.report-year')).toHaveCount(0)
    await expect(report.getByRole('combobox')).toHaveCount(0)
    await expect(report.locator('.provider-card-heading .status-pill')).toHaveCount(0)
    await expect(page.locator('.provider-info-chip')).toHaveText(language === 'en' ? '2025: 4 compliance issues' : '2025: 4 problemas de cumplimiento')
    await expect(report.locator('.provider-caveat')).toHaveCount(0)
    await expect(report.getByText(/Historical report|Informe histórico/)).toHaveCount(0)
    await expect(report.locator('.report-issues')).not.toBeVisible()
    await expect(page.locator('.provider-system-card')).toBeVisible()
    await report.scrollIntoViewIfNeeded()
    await page.screenshot({ path: test.info().outputPath(`annual-report-${language}-collapsed.png`), fullPage: true })
    const toggle = report.locator('.report-toggle')
    await expect(toggle).toHaveText(language === 'en' ? 'View 4 issues' : 'Ver 4 problemas')
    // Reference card: a light tint and no full-width status bar keep it distinct from Advisory history cards.
    const header = report.locator('.provider-card-heading')
    const pdf = header.getByRole('link', { name: language === 'en' ? /View original report/ : /Ver informe original/ })
    await expect(pdf).toBeVisible()
    await expect(report.locator('.report-toggle')).toHaveCount(1)
    await expect(report.locator('.alert-status')).toHaveCount(0)
    await expect(report).toHaveClass(/report-summary-issues/)
    await expect(report).toHaveCSS('background-color', 'rgb(246, 249, 250)')
    const titleBox = await header.locator('h4').boundingBox()
    const pdfBox = await pdf.boundingBox()
    if (test.info().project.name === 'desktop') {
      // On phones the PDF link wraps below the title, so vertical centring is a desktop check.
      expect(Math.abs(titleBox!.y + titleBox!.height / 2 - pdfBox!.y - pdfBox!.height / 2)).toBeLessThan(8)
      // The heading reads title first and the PDF link last, on one line, with no leader.
      await expect(header.locator('.profile-leader')).toHaveCount(0)
      expect(pdfBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width)
    }
    // Teal "View issues" bar with white text spanning the card content, label centred.
    await expect(toggle).toHaveCSS('background-color', 'rgb(8, 127, 131)')
    await expect(toggle).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(toggle).toHaveCSS('justify-content', 'center')
    const toggleBox = (await toggle.boundingBox())!
    const cardBox = (await report.boundingBox())!
    const inset = await report.evaluate(node => { const s = getComputedStyle(node); return { left: parseFloat(s.paddingLeft) + parseFloat(s.borderLeftWidth), right: parseFloat(s.paddingRight) + parseFloat(s.borderRightWidth) } })
    expect(Math.abs(cardBox.x + inset.left - toggleBox.x)).toBeLessThan(2)
    expect(Math.abs(cardBox.x + cardBox.width - inset.right - (toggleBox.x + toggleBox.width))).toBeLessThan(2)
    const labelCentre = await toggle.evaluate(node => { const range = document.createRange(); range.selectNodeContents(node.firstChild!); const r = range.getBoundingClientRect(); return r.x + r.width / 2 })
    expect(Math.abs(labelCentre - (toggleBox.x + toggleBox.width / 2))).toBeLessThan(3)
    // The reviewed/summarized date sits in the heading; Ongoing when printed and Issue types share a row on
    // desktop and stack on phones.
    await expect(header.locator('.report-reviewed')).toContainText(language === 'en' ? /Reviewed|AI summary/ : /Revisado|Resumido por IA/)
    const factBoxes = await Promise.all((await report.locator('.report-facts>div').all()).map(node => node.boundingBox()))
    expect(factBoxes).toHaveLength(2)
    if (test.info().project.name === 'desktop') {
      expect(Math.abs(factBoxes[0]!.y - factBoxes[1]!.y)).toBeLessThan(1)
      expect(factBoxes[1]!.x).toBeGreaterThanOrEqual(factBoxes[0]!.x + factBoxes[0]!.width)
    } else {
      expect(factBoxes[1]!.y).toBeGreaterThan(factBoxes[0]!.y)
    }
    await expect(report.locator('.report-facts dt')).toHaveText(language === 'en' ? ['Ongoing when printed', 'Issue types'] : ['En curso al imprimirse', 'Tipos de problemas'])
    await expect(report.locator('.report-ongoing-since')).toHaveText(language === 'en' ? 'since Oct 1, 2025' : /desde 1 .*oct.*2025/i)
    // The collapsed-header chip sits at the right, just left of the −/+ icon.
    const headerToggle = page.locator('.provider-info-toggle')
    const chipBox = (await headerToggle.locator('.provider-info-chip').boundingBox())!
    const iconBox = (await headerToggle.locator('.disclosure-icon').boundingBox())!
    expect(chipBox.x + chipBox.width).toBeLessThanOrEqual(iconBox.x + 1)
    expect(iconBox.x - (chipBox.x + chipBox.width)).toBeLessThan(16)
    // Category counts are a list, one category per line.
    await expect(report.locator('.report-category-list li')).toHaveText(language === 'en'
      ? ['2 Monitoring/reporting', '1 Licensing', '1 Public notice']
      : ['2 Monitoreo/informes', '1 Licencia', '1 Aviso público'])
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(report.locator('.report-issues>ol>li')).toHaveCount(4)
    await expect(page.getByRole('button', { name: /Supplier details & tools|Detalles y herramientas del proveedor/ })).toHaveCount(0)
    const issues = report.locator('.report-issues>ol>li')
    await expect(issues).toHaveCount(4)
    for (const issue of await issues.all()) {
      await expect(issue).toBeVisible()
      await expect(issue.getByRole('link')).toHaveAttribute('href', 'https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025#page=2')
      await expect(issue.locator('.report-issue-header a')).toBeVisible()
      await expect(issue.locator('dt')).toHaveCount(4)
    }
    const facts = issues.first().locator('dl>div')
    const from = await facts.nth(0).boundingBox()
    const through = await facts.nth(1).boundingBox()
    const finding = await facts.nth(2).boundingBox()
    if (test.info().project.name === 'phone-sized') {
      expect(through!.x).toBeCloseTo(from!.x, 0)
      expect(through!.y).toBeGreaterThan(from!.y + from!.height)
    } else {
      expect(through!.y).toBeCloseTo(from!.y, 0)
      expect(through!.x).toBeGreaterThan(from!.x + from!.width)
      expect(finding!.x).toBeCloseTo(from!.x, 0)
      expect(finding!.y).toBeGreaterThan(from!.y + from!.height)
      await expect(issues.first().locator('.report-issue-leader')).toBeVisible()
    }
    await expect(report.locator('.report-issues>ol>li').last()).toContainText('“Current”')
    await expect(report.locator('.report-issues>ol>li').nth(2)).toContainText(language === 'en' ? 'None listed' : 'Ninguna indicada')
    expect(await toggle.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
    await expect(issues.first().locator('dd').first()).toHaveCSS('font-size', '16px')
    await expect(page.locator('.provider-system-card')).toBeVisible()
    await expect(page.locator('.provider-system-card .provider-card-heading').getByRole('link', { name: /ADH profile|Perfil de ADH/ })).toHaveAttribute('href', 'https://health.arkansas.gov/Eng/WS.aspx?ID=747')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`annual-report-${language}-expanded.png`), fullPage: true })
    if (test.info().project.name === 'phone-sized') {
      await page.setViewportSize({ width: 320, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: test.info().outputPath(`annual-report-${language}-320.png`), fullPage: true })
    }
    await expect(page.locator('.supplier-finding .status-label')).toContainText(t.activeBoil)
  })

  test(`supplier info checklist stays in app (${language})`, async ({ page }) => {
    await watchSupplier(page)
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    // Retained modal/checklist component; shipped card info now opens Sources.
    await page.goto('/tests/e2e/components.html?mode=cards')
    const trigger = page.getByRole('button', { name: t.supplierAbout, exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('.boil-guidance, .supplier-original, .source-check-history')).toHaveCount(0)
    const checkRow = dialog.locator('.supplier-popup-check .freshness-row')
    const geometry = await checkRow.evaluate(row => {
      const label = row.querySelector('.freshness-label')!.getBoundingClientRect()
      const leader = row.querySelector('.freshness-leader')!
      const value = row.querySelector('dd')!
      return { labelRight: label.right, leaderLeft: leader.getBoundingClientRect().left, leaderRight: leader.getBoundingClientRect().right, valueLeft: value.getBoundingClientRect().left, valueRight: value.getBoundingClientRect().right, rowRight: row.getBoundingClientRect().right, align: getComputedStyle(value).textAlign, leaderDisplay: getComputedStyle(leader).display }
    })
    expect(geometry.align).toBe('right')
    expect(geometry.leaderDisplay).not.toBe('none')
    expect(geometry.leaderLeft).toBeGreaterThan(geometry.labelRight)
    expect(geometry.valueLeft).toBeGreaterThan(geometry.leaderRight)
    expect(geometry.valueRight).toBeCloseTo(geometry.rowRight, 0)
    await expect(dialog.getByText(notice.reason, { exact: true })).toBeVisible()
    await expect(dialog.getByRole('checkbox')).toHaveCount(3)
    await dialog.getByRole('checkbox').first().check()
    await expect(dialog.getByRole('status')).toHaveText(language === 'en' ? '1 of 3 complete' : '1 de 3 completados')
    await dialog.getByRole('button', { name: language === 'en' ? 'View area' : 'Ver área', exact: true }).click()
    await expect(dialog.locator('.notice-area-details')).toContainText(notice.area)
    await expect(dialog.getByRole('checkbox').nth(1)).not.toBeChecked()
    await expect(dialog.getByRole('link', { name: language === 'en' ? 'View notice' : 'Ver aviso', exact: true })).toHaveAttribute('href', SOURCES.ADH)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`notice-checklist-${language}.png`) })
    await checkRow.scrollIntoViewIfNeeded()
    await page.screenshot({ path: test.info().outputPath(`notice-check-date-${language}.png`) })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test(`concise copy and native disclosures across screens (${language})`, async ({ page }) => {
    await page.addInitScript(() => { Reflect.deleteProperty(window, 'PushManager') })
    await watchSupplier(page)
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    await expect(page.getByText(t.subtitle, { exact: true })).toHaveCount(0)
    await expect(page.locator('.supplier-card .status-label')).toContainText(t.activeBoil)
    const activeLink = page.getByRole('link', { name: t.activeBoil, exact: true })
    await expect(activeLink).toHaveAttribute('href', `${SOURCES.ADH}#:~:text=${encodeURIComponent(place.name)}`)
    await expect(activeLink).toHaveAttribute('target', '_blank')
    await expect(page.locator('.supplier-finding .status-explanation')).toContainText(notice.area)
    await expect(page.locator('.supplier-finding .status-explanation')).toContainText(notice.reason)
    const contextLines = page.locator('.supplier-notice-context > span')
    await expect(contextLines.nth(0)).toContainText(notice.area)
    await expect(contextLines.nth(1)).toContainText(notice.reason)
    await activeLink.focus()
    await expect(activeLink).toBeFocused()
    const results = page.locator('.about-results')
    await expect(results.locator('details')).toHaveCount(0)
    await expect(results.getByText(t.resultsSummary)).toBeVisible()
    const nav = page.getByRole('navigation')
    await nav.getByRole('button', { name: t.history, exact: true }).click()
    await expect(page.locator('.request-history-intro')).toContainText(language === 'en' ? 'Live drafts saved on this device only' : 'Borradores reales guardados solo en este dispositivo')
    await expect(page.locator('.request-history-intro')).toContainText(language === 'en' ? 'not sample data, sent messages' : 'No son datos de ejemplo, mensajes enviados')
    await nav.getByRole('button', { name: t.browse, exact: true }).click()
    await expect(page.getByText(t.placesIntro)).toHaveCount(0)
    await nav.getByRole('button', { name: t.settings, exact: true }).click()
    await expect(page.getByText(t.settingsIntro)).toHaveCount(0)
    // Settings is links only; removal (with its confirmation) lives on Privacy and stored data.
    await expect(page.getByRole('button', { name: t.delete, exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: new RegExp(t.privacy) }).click()
    await page.getByRole('button', { name: t.delete, exact: true }).click()
    await expect(page.getByText(t.deletionText)).toBeVisible()
    await page.getByRole('button', { name: t.cancel, exact: true }).click()
    await expect(page.getByRole('button', { name: t.confirmRemoval, exact: true })).toHaveCount(0)
    await nav.getByRole('button', { name: t.settings, exact: true }).click()
    await page.getByRole('button', { name: new RegExp(t.sources) }).click()
    for (const name of [t.advisorySources, t.coverageHeading, t.cannotTell]) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await nav.getByRole('button', { name: t.settings, exact: true }).click()
    await page.getByRole('button', { name: new RegExp(t.privacy) }).click()
    for (const name of [t.storedDevice, t.storedPush, t.retentionDeletion]) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await nav.getByRole('button', { name: t.settings, exact: true }).click()
    await page.getByRole('button', { name: new RegExp(t.installation) }).click()
    await expect(page.getByText(t.iOS)).toHaveCount(0)
    await page.getByRole('button', { name: t.setupNotifications, exact: true }).click()
    await expect(page.getByText(t.pushUnsupported, { exact: true })).toBeVisible()
    await expect(page.locator('.push-controls [role="status"]')).toHaveCount(1)
    await expect(page.getByText(t.notificationFooter)).toBeVisible()
    const notification = page.getByText(t.notificationDetails, { exact: true }).locator('..')
    await expect(notification).not.toHaveAttribute('open', '')
    await notification.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(notification.getByText(t.pushEvidence)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('exact supplier → saved notice → provider contact → editable local drafts', async ({ page }) => {
  await watchSupplier(page)
  const logo = page.getByRole('img', { name: 'WellPower: WAVE' })
  await expect(logo).toBeVisible()
  await expect.poll(() => logo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Advisory history', exact: true }).click()
  await expect(page.getByRole('link', { name: /Open ADH notice list/ })).toHaveAttribute('href', SOURCES.ADH)
  await page.goto(`/?notice=${notice.id}`)
  await expect(page.getByRole('heading', { name: displayName, exact: true })).toBeVisible()
  await expect(page.getByText(notice.reason, { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /View official source/ })).toHaveAttribute('href', SOURCES.ADH)
  await expect(page.getByRole('link', { name: 'Call (479) 549-2158', exact: true })).toHaveAttribute('href', 'tel:+14795492158')
  const body = page.getByRole('textbox', { name: 'Draft body', exact: true })
  await expect(body).toHaveCount(0)
  for (const kind of ['request', 'followup']) {
    await page.getByRole('combobox', { name: 'What do you need help with?', exact: true }).selectOption(kind)
    const text = `SYNTHETIC E2E ONLY — ${kind} & reviewed costs £12`
    await body.fill(text)
    await page.getByRole('button', { name: 'Copy draft', exact: true }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(text)
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download draft', exact: true }).click()
    const download = await pending
    expect(await readFile((await download.path())!, 'utf8')).toContain(text)
    const href = await page.getByRole('link', { name: 'Open email draft', exact: true }).getAttribute('href')
    expect(href).toMatch(/^mailto:LEISUREHILLSWATERCO@GMAIL.COM\?subject=/)
    expect(new URLSearchParams(href!.split('?')[1]).get('body')).toBe(text)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await expect(body).toHaveCount(0)
  await page.goto(`/?notice=${notice.id}`)
  await page.getByRole('combobox', { name: 'What do you need help with?', exact: true }).selectOption('request')
  await expect(body).not.toHaveValue(/SYNTHETIC E2E ONLY/)
})

test('tablet header keeps language controls inside its width with a scrollbar gutter', async ({ page }) => {
  await page.goto('/')
  // Reserve the same 15px gutter seen in the browser panel, even on overlay-scrollbar hosts.
  await page.addStyleTag({ content: 'html { scrollbar-gutter: stable; }' })
  for (const width of [761, 768, 820, 900]) {
    await page.setViewportSize({ width, height: 1024 })
    const bounds = await page.locator('.header-inner').evaluate(header => ({
      headerRight: header.getBoundingClientRect().right,
      languageRight: header.querySelector('.lang-switch')!.getBoundingClientRect().right,
    }))
    expect(bounds.languageRight, `Language controls fit at ${width}px`).toBeLessThanOrEqual(bounds.headerRight)
  }
})

for (const state of ['active', 'none', 'failed', 'stale', 'unchecked'] as const) test(`reference card geometry and state-specific actions (${state})`, async ({ page }) => {
  await page.route('**/api/status', route => {
    const data = observations(state === 'failed' ? 'failed' : state === 'stale' ? 'stale' : 'fresh')
    if (state === 'none') data.sources[0].records = []
    if (state === 'unchecked') {
      data.sources = data.sources.map(source => ({ ...source, records: [], retrievedAt: null, lastSuccessAt: null, error: 'Not checked' }))
      data.archive = []
    }
    return route.fulfill({ json: data })
  })
  await watchSupplier(page)
  const card = page.locator('.supplier-card')
  await expect(card.locator('.status-label')).toHaveText(state === 'active' ? en.activeBoil : state === 'none' ? 'No active boil-water notice found' : state === 'unchecked' ? en.uncheckedStatus : en.supplierUnavailable)
  for (const width of [320, 390, 1366]) {
    await page.setViewportSize({ width, height: 1000 })
    const geometry = await card.evaluate(element => {
      const panel = element.querySelector('.supplier-finding')!
      const actions = element.querySelector('.card-check-actions')!
      const buttons = [...actions.children]
      const rect = (e: Element) => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, top: r.top, height: r.height } }
      return {
        panel: rect(panel), actions: rect(actions), buttons: buttons.map(rect),
        textAlign: getComputedStyle(element.querySelector('.finding-copy')!).textAlign,
        iconHeight: element.querySelector('.warning-icon')?.getBoundingClientRect().height ?? 0,
        primaryColor: getComputedStyle(actions.querySelector('button')!).color,
        divider: getComputedStyle(element.querySelector('.provider-contact')!).borderBottomWidth,
        panelColor: getComputedStyle(panel).backgroundColor,
      }
    })
    expect(geometry.textAlign).toBe('center')
    for (const button of geometry.buttons) expect(button.height).toBeGreaterThanOrEqual(44)
    if (width <= 420) expect(geometry.buttons[1].top).toBeGreaterThanOrEqual(geometry.buttons[0].top + geometry.buttons[0].height)
    else expect(geometry.buttons[1].left).toBeGreaterThanOrEqual(geometry.buttons[0].right)
    expect(geometry.actions.left).toBe(geometry.panel.left)
    expect(geometry.actions.right).toBe(geometry.panel.right)
    expect(geometry.divider).toBe('0px')
    expect(geometry.iconHeight).toBe(state === 'active' ? 24 : 0)
    await expect(page.locator('.home-sidebar')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(card.locator('.card-qualification')).toHaveCount(0)
    await card.screenshot({ path: test.info().outputPath(`reference-${state}-${width}.png`) })
  }
})

test('WAVE hierarchy uses navy headings, readable text and accessible contact actions at phone and laptop widths', async ({ page }) => {
  await watchSupplier(page)
  await expect(page.locator('.supplier-contact-section .provider-contact')).toBeVisible()
  for (const width of [320, 390, 1366]) {
    await page.setViewportSize({ width, height: 900 })
    const card = page.locator('.supplier-card')
    const geometry = await card.evaluate(element => {
      const rect = (selector: string) => element.querySelector(selector)!.getBoundingClientRect()
      const call = rect('.provider-contact-actions a[href^="tel:"]')
      const email = rect('.provider-contact-actions a[href^="mailto:"]')
      const caption = rect('.contact-caption')
      return {
        title: getComputedStyle(element.querySelector('h2')!).color,
        status: getComputedStyle(element.querySelector('.status-label')!).color,
        titleSize: parseFloat(getComputedStyle(element.querySelector('h2')!).fontSize),
        statusSize: parseFloat(getComputedStyle(element.querySelector('.status-label')!).fontSize),
        actionSize: parseFloat(getComputedStyle(element.querySelector('.official-list')!).fontSize),
        radius: getComputedStyle(element).borderRadius,
        callTop: call.top, emailTop: email.top, captionTop: caption.top, captionBottom: caption.bottom,
        callHeight: call.height, emailHeight: email.height, callWidth: call.width, emailWidth: email.width, cardWidth: element.getBoundingClientRect().width,
      }
    })
    expect(geometry.title).toBe('rgb(16, 46, 67)')
    expect(geometry.status).toBe(geometry.title)
    expect(geometry.titleSize).toBeGreaterThanOrEqual(24)
    expect(geometry.statusSize).toBeGreaterThanOrEqual(23)
    expect(geometry.actionSize).toBeGreaterThanOrEqual(16)
    expect(await page.locator('.home-sidebar h2').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(20)
    expect(geometry.radius).toBe('16px')
    expect(Math.abs(geometry.emailTop - geometry.callTop)).toBeLessThan(1)
    expect(Math.abs(geometry.emailWidth - geometry.callWidth)).toBeLessThan(1)
    expect(geometry.callTop).toBeGreaterThanOrEqual(geometry.captionBottom)
    await expect(card.locator('a[href^="tel:"]')).toHaveText('Call')
    await expect(card.locator('a[href^="tel:"]')).toHaveAttribute('href', 'tel:+14795492158')
    await expect(card.locator('a[href^="tel:"]')).toHaveAttribute('aria-label', /\(479\) 549-2158/)
    await expect(card.locator('a[href^="mailto:"]')).toHaveText('Email')
    await expect(card.locator('a[href^="mailto:"]')).toHaveAttribute('href', 'mailto:LEISUREHILLSWATERCO@GMAIL.COM')
    await expect(card.locator('a[href^="mailto:"]')).toHaveAttribute('aria-label', /LEISUREHILLSWATERCO@GMAIL.COM/)
    expect(geometry.callHeight).toBeGreaterThanOrEqual(44)
    expect(geometry.emailHeight).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 1366) expect(geometry.cardWidth).toBeGreaterThan(700)
    const history = card.getByRole('button', { name: 'Advisory history', exact: true })
    await expect(history).toHaveAttribute('aria-expanded', 'false')
    // Disclosure markers are Lucide plus/minus shapes drawn through a CSS mask.
    const marker = () => history.locator('.disclosure-icon').evaluate(icon => getComputedStyle(icon, '::before').getPropertyValue('--icon'))
    const closedMarker = await marker()
    expect(closedMarker).toContain('M5 12h14M12 5v14')
    await history.focus()
    await page.keyboard.press('Space')
    await expect(history).toHaveAttribute('aria-expanded', 'true')
    const openMarker = await marker()
    expect(openMarker).toContain('M5 12h14')
    expect(openMarker).not.toContain('M12 5v14')
    await page.keyboard.press('Space')
    const help = card.getByRole('button', { name: /^Provider information/ })
    const referenceIcon = await history.locator('.disclosure-icon').evaluate(icon => {
      const s = getComputedStyle(icon), r = icon.getBoundingClientRect()
      return { size: s.fontSize, weight: s.fontWeight, width: r.width, right: r.right }
    })
    const providerIcon = await help.locator('.disclosure-icon').evaluate(icon => {
      const s = getComputedStyle(icon), r = icon.getBoundingClientRect()
      return { size: s.fontSize, weight: s.fontWeight, width: r.width, right: r.right }
    })
    expect(providerIcon).toEqual(referenceIcon)
    await help.focus()
    await page.keyboard.press('Enter')
    await expect(help).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Enter')
    await expect(help).toHaveAttribute('aria-expanded', 'false')
    await page.screenshot({ path: test.info().outputPath(`wave-${width}.png`), fullPage: true })
  }
})

test('source-first cards fit phone and laptop widths, with left-aligned facts and touch targets', async ({ page }) => {
  await watchSupplier(page)
  await expect(page.locator('.supplier-contact-section .provider-contact')).toBeVisible()
  await page.getByRole('button', { name: /^Provider information/ }).click()
  for (const width of [320, 390, 1366]) {
    await page.setViewportSize({ width, height: 768 })
    const card = page.locator('.supplier-card')
    const source = card.getByRole('link', { name: /View official source/ })
    await expect(source).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const geometry = await card.evaluate(element => {
      const link = element.querySelector('.official-list')!
      const finding = element.querySelector('.supplier-finding')!
      const contact = element.querySelector('.provider-contact')!
      const row = element.querySelector('.provider-card-facts dd')!
      return { linkTop: link.getBoundingClientRect().top, findingBottom: finding.getBoundingClientRect().bottom, contactTop: contact.getBoundingClientRect().top, height: link.getBoundingClientRect().height, factAlign: getComputedStyle(row).textAlign }
    })
    expect(geometry.linkTop).toBeGreaterThanOrEqual(geometry.findingBottom)
    expect(geometry.contactTop).toBeGreaterThan(geometry.linkTop)
    expect(geometry.height).toBeGreaterThanOrEqual(44)
    // Provider facts are two-column label-over-value cells, left-aligned.
    expect(geometry.factAlign).toBe('left')
    for (const language of ['EN', 'ES']) {
      const bounds = await page.getByRole('button', { name: language, exact: true }).boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
    }
  }
})

for (const language of ['en', 'es'] as const) for (const width of [320, 390, 1366]) {
  test(`expanded history, provider facts and guide remain readable (${language}, ${width})`, async ({ page }) => {
    await page.route('**/api/status', route => {
      const data = observations()
      data.archive.push({ ...notice, id: 'older-lifted', issued: 'Agency date: October 1', lifted: '10/2/2026', firstObservedAt: '2026-10-01T12:00:00Z', lastObservedAt: '2026-10-02T12:00:00Z', area: '', reason: '' })
      return route.fulfill({ json: data })
    })
    await page.setViewportSize({ width, height: 900 })
    await watchSupplier(page)
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    const t = language === 'en' ? en : es
    const card = page.locator('.supplier-card')
    const email = card.locator('a[href^="mailto:"]')
    await expect(email).toBeVisible()
    await expect(card.locator('.supplier-help-section')).toHaveCount(0)
    const help = card.getByRole('button', { name: language === 'en' ? 'Get help with a water issue' : 'Obtener ayuda con un problema de agua', exact: true })
    await expect(help).toBeVisible()
    await expect(help).toHaveCSS('background-color', 'rgb(4, 120, 133)')
    await expect(help).toHaveCSS('color', 'rgb(255, 255, 255)')
    const official = card.getByRole('link', { name: t.officialSource })
    await expect(card.locator('.card-check-actions > button')).toHaveCSS('font-weight', '700')
    await expect(official).toHaveCSS('font-weight', '700')
    await expect(official).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(official).toHaveCSS('color', 'rgb(6, 109, 115)')
    await expect(official.locator('svg.icon')).toHaveCSS('color', 'rgb(6, 109, 115)')
    expect(await help.evaluate(el => el.previousElementSibling?.classList.contains('supplier-contact-section'))).toBe(true)
    await expect(card.locator('.supplier-contact-section .provider-contact')).toBeVisible()
    await expect(email).toHaveText(language === 'en' ? 'Email' : 'Correo')
    await expect(email).toHaveAttribute('href', 'mailto:LEISUREHILLSWATERCO@GMAIL.COM')
    await expect(email).toHaveAttribute('aria-label', /LEISUREHILLSWATERCO@GMAIL.COM/)
    const emailBounds = await email.boundingBox()
    expect(emailBounds!.width).toBeLessThan(width)
    expect(await email.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    const history = card.getByRole('button', { name: t.supplierAlertHistory, exact: true })
    await history.focus(); await page.keyboard.press('Enter')
    const panel = card.locator('.supplier-alert-history')
    await expect(panel.locator('article')).toHaveCount(2)
    await expect(panel.locator('details')).toHaveCount(0)
    await expect(panel.getByRole('link', { name: language === 'en' ? /Open ADH notice list/ : /Abrir lista de avisos de ADH/ }).first()).toHaveAttribute('href', SOURCES.ADH)
    await card.getByRole('button', { name: new RegExp(`^${t.providerHelp}`) }).click()
    await expect(card.locator('.provider-cards')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`expanded-${language}-${width}.png`), fullPage: true })
    await card.locator('.guide-entry').click()
    const billing = language === 'en' ? 'Bill or charge' : 'Factura o cargo'
    const next = language === 'en' ? 'Continue' : 'Continuar'
    await page.getByRole('button', { name: billing, exact: true }).click()
    await page.getByRole('textbox', { name: language === 'en' ? 'Anything else? (optional)' : '¿Algo más? (opcional)', exact: true }).fill('SYNTHETIC GUIDE REVIEW ONLY')
    await page.getByRole('button', { name: next, exact: true }).click()
    await expect(page.locator('.request-progress')).toContainText(language === 'en' ? 'Step 2 of 4' : 'Paso 2 de 4')
    await page.getByRole('button', { name: next, exact: true }).click()
    await page.getByRole('button', { name: language === 'en' ? 'Write my email' : 'Escribir mi correo', exact: true }).click()
    const body = page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true })
    await body.fill('SYNTHETIC GUIDE REVIEW ONLY')
    await expect(body).toHaveValue('SYNTHETIC GUIDE REVIEW ONLY')
    await expect(page.getByRole('button', { name: language === 'en' ? 'Send message' : 'Enviar mensaje', exact: true })).toHaveCount(0)
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: language === 'en' ? 'Download report' : 'Descargar reporte', exact: true }).click()
    expect(await readFile((await (await pending).path())!, 'utf8')).toContain('SYNTHETIC GUIDE REVIEW ONLY')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width < 761) {
      const previous = page.getByRole('button', { name: language === 'en' ? 'Back' : 'Atrás', exact: true })
      await previous.focus()
      await expect(previous).toBeFocused()
      expect(await previous.evaluate(el => el.getBoundingClientRect().bottom + 7 <= document.querySelector('nav')!.getBoundingClientRect().top)).toBe(true)
    }
    await page.screenshot({ path: test.info().outputPath(`guide-${language}-${width}.png`), fullPage: true })
    await page.getByRole('navigation').getByRole('button', { name: t.browse, exact: true }).click()
    await expect(card.locator('.guide-entry')).toBeVisible()
  })
}

test('sample scenarios stay fictional across detail, help choices, history and exit', async ({ page }) => {
  await page.goto('/')
  // Sample mode lives in Settings; its row keeps the fictional-data disclosure.
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Try sample mode/ })).toContainText('Fictional records. Not current agency data.')
  await page.getByRole('button', { name: /^Try sample mode/ }).click()
  await page.getByRole('button', { name: 'Use sample watch list', exact: true }).click()
  await expect(page.locator('.status-label').filter({ hasText: /^Active boil-water notice$/ })).toBeVisible()
  await expect(page.locator('.status-label').filter({ hasText: 'No active boil-water notice found' })).toBeVisible()
  await expect(page.locator('.supplier-card')).toHaveCount(2)
  // Lake/HAB detail and fictional legacy exports remain covered by the retained-component specs.
  await expect(page.getByLabel('Sample HAB source available', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Sample Cove Lake', exact: true })).toHaveCount(0)
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Sample Creek Water', exact: true }) }).getByRole('button', { name: 'Get help with a water issue', exact: true }).click()
  await page.getByRole('button', { name: 'Bill or charge', exact: true }).click()
  await page.getByRole('textbox', { name: 'Anything else? (optional)', exact: true }).fill('A fictional billing issue for this sample.')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('.request-progress')).toContainText('Step 2 of 4')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('.request-progress')).toContainText('Step 3 of 4')
  await page.getByRole('button', { name: 'Write my email', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review and send', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).not.toHaveValue('')
  await expect(page.getByText('Sample — fictional. Sending disabled.', { exact: true })).toBeVisible()
  const sendIt = page.getByRole('region', { name: 'How to send it', exact: true })
  await expect(sendIt).toBeVisible()
  await expect(sendIt.getByText('Sample — sending disabled.', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toHaveCount(0)
  await expect(sendIt.getByRole('button', { name: /Copy message & open form|Sent it another way/ })).toHaveCount(0)
  await expect(page.locator('a[href^="mailto:"],a[href^="tel:"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Sample mode', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Exit sample', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Sample mode', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /Get help with a water issue/ }).click()
  await expect(page.getByRole('heading', { name: 'Choose your water provider' })).toBeVisible()
})

test('keyboard-focused draft editor stays above mobile bottom navigation', async ({ page }) => {
  await page.goto(`/?notice=${notice.id}`)
  await page.getByRole('combobox', { name: 'What do you need help with?', exact: true }).selectOption('request')
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 900 })
    await page.getByRole('textbox', { name: 'Subject', exact: true }).focus()
    await page.keyboard.press('Tab')
    const editor = page.getByRole('textbox', { name: 'Draft body', exact: true })
    await expect(editor).toBeFocused()
    await expect.poll(() => editor.evaluate(element => {
      const bottom = element.getBoundingClientRect().bottom
      const navigationTop = document.querySelector('nav')!.getBoundingClientRect().top
      // Include the 3px outline and its 4px offset, not just the input box.
      return bottom + 7 <= navigationTop
    }), { message: `Draft editor focus outline clears navigation at ${width}px` }).toBe(true)
  }
})

for (const savedSample of [false, true]) {
  test(`entering ${savedSample ? 'saved' : 'new'} sample mode keeps Spanish without changing live choices`, async ({ page }) => {
    await watchSupplier(page)
    await page.getByRole('button', { name: 'ES', exact: true }).click()
    const liveBefore = await page.evaluate(() => localStorage.getItem('water-alert:live:v1'))
    if (savedSample) await page.evaluate(() => localStorage.setItem('water-alert:sample:v1', JSON.stringify({ watches: ['ADH:sample-ridge'], liftWatches: [], language: 'en', checkOnOpen: false })))
    await page.getByRole('button', { name: 'Ajustes', exact: true }).first().click()
    await page.getByRole('button', { name: /^Probar modo de muestra/ }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.getByRole('button', { name: 'ES', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Usar lista de muestra', exact: true })).toBeVisible()
    const samplePrefs = await page.evaluate(() => JSON.parse(localStorage.getItem('water-alert:sample:v1')!))
    expect(samplePrefs).toEqual({ watches: savedSample ? ['ADH:sample-ridge'] : [], liftWatches: [], language: 'es', checkOnOpen: !savedSample })
    // Changing language inside sample must not change live or server push choices.
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    await page.getByRole('button', { name: 'Exit sample', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    expect(await page.evaluate(() => localStorage.getItem('water-alert:live:v1'))).toBe(liveBefore)
    await page.getByRole('navigation').getByRole('button', { name: 'Lugares', exact: true }).click()
    await expect(page.getByRole('heading', { name: displayName, exact: true })).toBeVisible()
  })
}

for (const language of ['en', 'es'] as const) for (const missing of ['id', 'place'] as const) {
  test(`missing notice ${missing} explains unavailable in ${language} without substituting current records`, async ({ page }) => {
    await watchSupplier(page)
    if (language === 'es') await page.getByRole('button', { name: 'ES', exact: true }).click()
    const orphan = { ...notice, id: 'orphan-notice', placeId: 'ADH:synthetic-orphan', name: 'SYNTHETIC ORPHAN' }
    await page.route('**/api/status', route => route.fulfill({ json: { ...observations(), archive: [notice, orphan] } }))
    await page.goto(`/?notice=${missing === 'id' ? 'missing-notice' : orphan.id}`)
    const explanation = language === 'en'
      ? 'This saved notice cannot be opened from the currently available records. It has not been replaced with another notice.'
      : 'No se puede abrir este aviso guardado con los registros disponibles actualmente. No se ha sustituido por otro aviso.'
    await expect(page.getByText(explanation, { exact: true })).toBeVisible()
    await expect(page.getByText(notice.reason, { exact: true })).toHaveCount(0)
    await expect(page.getByRole('textbox', { name: language === 'en' ? 'Draft body' : 'Texto del borrador', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: language === 'en' ? 'Back to my water' : 'Volver a mi agua', exact: true }).click()
    await expect(page.getByRole('heading', { name: displayName, exact: true })).toBeVisible()
  })
}

test('saved historical link stays exact and becomes unavailable if its record disappears', async ({ page }) => {
  const old = { ...notice, id: 'old-synthetic-notice', reason: 'EXACT OLD SYNTHETIC REASON', area: 'EXACT OLD SYNTHETIC AREA', issued: '10/01/2026', lifted: '10/03/2026' }
  let archive = [notice, old]
  await page.route('**/api/status', route => route.fulfill({ json: { ...observations(), archive } }))
  await page.goto(`/?notice=${old.id}`)
  await expect(page.locator('.detail-record')).toContainText(old.reason)
  await expect(page.locator('.detail-record')).not.toContainText(notice.reason)
  archive = [notice]
  await page.clock.fastForward(30_001)
  await expect(page.getByText('This saved notice cannot be opened from the currently available records. It has not been replaced with another notice.', { exact: true })).toBeVisible()
  await expect(page.locator('.detail-record')).toHaveCount(0)
})

for (const state of ['failed', 'stale'] as const) {
  test(`${state} source keeps the supplier unavailable, not all-clear`, async ({ page }) => {
    await page.route('**/api/status', route => route.request().method() === 'GET'
      ? route.fulfill({ json: observations(state) }) : route.fallback())
    await watchSupplier(page)
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: displayName, exact: true }) })
    await expect(card.locator('.status-label')).toContainText('Current advisory status unavailable.')
    await expect(card.locator('.status-label')).toBeVisible()
    await card.getByRole('button', { name: 'Advisory history', exact: true }).click()
    await expect(card.getByText('Status: Unconfirmed', { exact: true })).toBeVisible()
    await expect(card.getByText('Active', { exact: true })).toHaveCount(0)
  })
}
