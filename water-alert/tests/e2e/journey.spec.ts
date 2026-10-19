import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { SOURCES, type Notice, type Place, type SourceSnapshot } from '../../src/domain'
import { en, es } from '../../src/strings'

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

async function watchSupplier(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /My public water supplier/ }).click()
  await page.getByRole('searchbox').fill('Leisure')
  await page.getByRole('button', { name: `Select ${place.name}`, exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Confirm your public water supplier' })).toBeVisible()
  await expect(page.getByText('Does this match your water bill?')).toBeVisible()
  await page.getByRole('button', { name: 'Yes — watch this place', exact: true }).click()
}

for (const [language, t] of [['en', en], ['es', es]] as const) {
  test(`concise copy and native disclosures across screens (${language})`, async ({ page }) => {
    await page.addInitScript(() => { Reflect.deleteProperty(window, 'PushManager') })
    await watchSupplier(page)
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    await expect(page.locator('.page-heading')).not.toContainText(t.subtitle)
    await expect(page.locator('.supplier-card .status-label')).toContainText(t.activeBoil)
    const activeLink = page.getByRole('link', { name: t.activeBoil, exact: true })
    await expect(activeLink).toHaveAttribute('href', `${SOURCES.ADH}#:~:text=${encodeURIComponent(place.name)}`)
    await expect(activeLink).toHaveAttribute('target', '_blank')
    await expect(page.locator('.supplier-finding .status-explanation')).toContainText(notice.area)
    await expect(page.locator('.supplier-finding .status-explanation')).toContainText(notice.reason)
    const contextLines = page.locator('.supplier-notice-context > span')
    const areaBounds = await contextLines.nth(0).boundingBox()
    const reasonBounds = await contextLines.nth(1).boundingBox()
    expect(reasonBounds!.y).toBeGreaterThanOrEqual(areaBounds!.y + areaBounds!.height)
    await activeLink.focus()
    await expect(activeLink).toBeFocused()
    const results = page.locator('.about-results details')
    await expect(results).not.toHaveAttribute('open', '')
    await results.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(results).toHaveAttribute('open', '')
    await expect(results.getByText(t.resultsSummary)).toBeVisible()
    const nav = page.getByRole('navigation')
    await nav.getByRole('button', { name: t.history, exact: true }).click()
    await expect(page.getByText(t.historyText)).toBeVisible()
    const observation = page.locator('.history-record details').first()
    await expect(observation).not.toHaveAttribute('open', '')
    await expect(page.getByText(t.historyPrevious)).toBeVisible()
    await observation.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(observation.getByText(t.firstObserved, { exact: true })).toBeVisible()
    await nav.getByRole('button', { name: t.browse, exact: true }).click()
    await expect(page.getByText(t.placesIntro)).toHaveCount(0)
    await nav.getByRole('button', { name: t.settings, exact: true }).click()
    await expect(page.getByText(t.settingsIntro)).toHaveCount(0)
    await page.getByRole('button', { name: t.delete, exact: true }).click()
    await expect(page.getByText(t.deletionText)).toBeVisible()
    await page.getByRole('button', { name: t.cancel, exact: true }).click()
    await expect(page.getByRole('button', { name: t.confirmRemoval, exact: true })).toHaveCount(0)
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
  await page.getByRole('button', { name: 'Provider information', exact: true }).click()
  await page.getByRole('button', { name: 'Supplier details & tools', exact: true }).click()
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
  await page.getByRole('button', { name: 'Provider information', exact: true }).click()
  await page.getByRole('button', { name: 'Supplier details & tools', exact: true }).click()
  await expect(body).toHaveCount(0)
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
      const row = element.querySelector(':scope > dl .date-row')!
      const leader = row.querySelector('.freshness-leader')
      return {
        panel: rect(panel), actions: rect(actions), buttons: buttons.map(rect),
        textAlign: getComputedStyle(element.querySelector('.finding-copy')!).textAlign,
        timestampAlign: getComputedStyle(row.querySelector('dd')!).textAlign,
        leader: leader ? rect(leader) : null, label: rect(row.querySelector('.freshness-label')!),
        iconHeight: element.querySelector('.warning-icon')?.getBoundingClientRect().height ?? 0,
        primaryColor: getComputedStyle(actions.querySelector('.primary')!).color,
        divider: getComputedStyle(element.querySelector('.provider-contact')!).borderBottomWidth,
        panelColor: getComputedStyle(panel).backgroundColor,
      }
    })
    expect(geometry.textAlign).toBe('center')
    expect(geometry.timestampAlign).toBe('left')
    expect(geometry.primaryColor).toBe('rgb(255, 255, 255)')
    expect(Math.abs(geometry.buttons[0].width - geometry.buttons[1].width)).toBeLessThan(1)
    expect(geometry.buttons[1].left - geometry.buttons[0].right).toBeCloseTo(12, 0)
    expect(geometry.actions.left).toBe(geometry.panel.left)
    expect(geometry.actions.right).toBe(geometry.panel.right)
    expect(geometry.divider).toBe('0px')
    expect(geometry.iconHeight).toBe(state === 'active' ? 56 : 0)
    if (width === 1366) {
      expect(geometry.leader).not.toBeNull()
      expect(geometry.leader!.top + geometry.leader!.height / 2 - (geometry.label.top + geometry.label.height / 2)).toBeCloseTo(2, 0)
      expect(geometry.leader!.left - geometry.label.right).toBeCloseTo(12, 0)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(card.locator('.card-qualification')).toHaveCount(0)
    await card.screenshot({ path: test.info().outputPath(`reference-${state}-${width}.png`) })
  }
})

test('WAVE hierarchy uses navy headings, readable text and full contact values at phone and laptop widths', async ({ page }) => {
  await watchSupplier(page)
  await page.locator('.supplier-contact-section>summary').click()
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
        callHeight: call.height, emailHeight: email.height, cardWidth: element.getBoundingClientRect().width,
      }
    })
    expect(geometry.title).toBe('rgb(16, 46, 67)')
    expect(geometry.status).toBe(geometry.title)
    expect(geometry.titleSize).toBeGreaterThanOrEqual(24)
    expect(geometry.statusSize).toBeGreaterThanOrEqual(23)
    expect(geometry.actionSize).toBeGreaterThanOrEqual(16)
    expect(await page.locator('.home-sidebar .delivery-status').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16)
    expect(geometry.radius).toBe('16px')
    if (width < 761) expect(geometry.emailTop).toBeGreaterThanOrEqual(geometry.callTop + geometry.callHeight)
    if (width < 761) expect(geometry.callTop).toBeGreaterThanOrEqual(geometry.captionBottom)
    else expect(Math.abs(geometry.callTop + geometry.callHeight / 2 - (geometry.captionTop + geometry.captionBottom) / 2)).toBeLessThan(1)
    await expect(card.locator('a[href^="tel:"]')).toContainText('(479) 549-2158')
    await expect(card.locator('a[href^="mailto:"]')).toContainText('LEISUREHILLSWATERCO@GMAIL.COM')
    expect(geometry.callHeight).toBeGreaterThanOrEqual(44)
    expect(geometry.emailHeight).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width === 1366) expect(geometry.cardWidth).toBeGreaterThan(700)
    const history = card.getByRole('button', { name: 'Advisory history', exact: true })
    await expect(history).toHaveAttribute('aria-expanded', 'false')
    expect(await history.locator('.disclosure-icon').evaluate(icon => getComputedStyle(icon, '::before').content)).toBe('"+"')
    await history.focus()
    await page.keyboard.press('Space')
    await expect(history).toHaveAttribute('aria-expanded', 'true')
    expect(await history.locator('.disclosure-icon').evaluate(icon => getComputedStyle(icon, '::before').content)).toBe('"−"')
    await page.keyboard.press('Space')
    const help = card.getByRole('button', { name: 'Provider information', exact: true })
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
  await page.locator('.supplier-contact-section>summary').click()
  for (const width of [320, 390, 1366]) {
    await page.setViewportSize({ width, height: 768 })
    const card = page.locator('.supplier-card')
    const source = card.getByRole('link', { name: /View official source/ })
    await expect(source).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const geometry = await card.evaluate(element => {
      const link = element.querySelector('.official-list')!
      const time = element.querySelector('time')!
      const contact = element.querySelector('.provider-contact')!
      const row = element.querySelector('.profile-facts dd')!
      return { linkTop: link.getBoundingClientRect().top, timeTop: time.getBoundingClientRect().top, contactTop: contact.getBoundingClientRect().top, height: link.getBoundingClientRect().height, factAlign: getComputedStyle(row).textAlign }
    })
    expect(geometry.linkTop).toBeGreaterThan(geometry.timeTop)
    expect(geometry.contactTop).toBeGreaterThan(geometry.linkTop)
    expect(geometry.height).toBeGreaterThanOrEqual(44)
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
    await expect(email).not.toBeVisible()
    await expect(card.locator('.supplier-help-section .guide-entry')).not.toBeVisible()
    await card.locator('.supplier-contact-section>summary').click()
    await expect(email).toHaveText('LEISUREHILLSWATERCO@GMAIL.COM')
    const emailBounds = await email.boundingBox()
    expect(emailBounds!.width).toBeLessThan(width)
    expect(await email.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    const history = card.getByRole('button', { name: t.supplierAlertHistory, exact: true })
    await history.focus(); await page.keyboard.press('Enter')
    const panel = card.locator('.supplier-alert-history')
    await expect(panel.locator('article')).toHaveCount(2)
    await expect(panel.locator('details')).toHaveCount(0)
    await expect(panel.getByRole('link', { name: language === 'en' ? /Open ADH notice list/ : /Abrir lista de avisos de ADH/ }).first()).toHaveAttribute('href', SOURCES.ADH)
    await card.getByRole('button', { name: t.providerHelp, exact: true }).click()
    await expect(card.locator('.profile-facts')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`expanded-${language}-${width}.png`), fullPage: true })
    await card.locator('.supplier-help-section>summary').click()
    await card.locator('.guide-entry').click()
    const billing = language === 'en' ? 'Billing or consumer dispute' : 'Facturación o disputa de consumo'
    const next = language === 'en' ? 'Next' : 'Siguiente'
    await page.getByRole('button', { name: billing, exact: true }).click()
    await page.getByRole('button', { name: next, exact: true }).click()
    await page.getByRole('button', { name: next, exact: true }).click()
    const body = page.getByRole('textbox', { name: language === 'en' ? 'Draft body' : 'Texto del borrador', exact: true })
    await body.fill('SYNTHETIC GUIDE REVIEW ONLY')
    await page.getByRole('button', { name: next, exact: true }).click()
    await expect(body).toHaveValue('SYNTHETIC GUIDE REVIEW ONLY')
    await expect(page.locator('.help-guide h1')).toBeFocused()
    await expect(page.getByRole('link', { name: language === 'en' ? 'Open official complaint form' : 'Abrir formulario oficial de queja', exact: true })).toHaveAttribute('href', 'https://arkansasag.gov/file-a-complaint/')
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: language === 'en' ? 'Download preparation pack' : 'Descargar paquete de preparación', exact: true }).click()
    expect(await readFile((await (await pending).path())!, 'utf8')).toContain('SYNTHETIC GUIDE REVIEW ONLY')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width < 761) {
      const previous = page.getByRole('button', { name: language === 'en' ? 'Previous step' : 'Paso anterior', exact: true })
      await previous.focus()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: next, exact: true })).toBeFocused()
      expect(await page.getByRole('button', { name: next, exact: true }).evaluate(el => el.getBoundingClientRect().bottom + 7 <= document.querySelector('nav')!.getBoundingClientRect().top)).toBe(true)
    }
    await page.screenshot({ path: test.info().outputPath(`guide-${language}-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: next, exact: true }).click()
    await page.getByRole('button', { name: language === 'en' ? 'Done' : 'Terminar', exact: true }).click()
    await expect(card.locator('.guide-entry')).toBeFocused()
  })
}

test('sample scenarios stay fictional across detail, help choices, history and exit', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Published notices are not a water safety test.', { exact: true })).toBeVisible()
  await expect(page.getByText('About WAVE', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Try sample mode', exact: true }).click()
  await page.getByRole('button', { name: 'Use sample watch list', exact: true }).click()
  await expect(page.locator('.status-label').filter({ hasText: /^Active boil-water notice$/ })).toBeVisible()
  await expect(page.locator('.status-label').filter({ hasText: 'No active boil-water notice found' })).toBeVisible()
  await expect(page.locator('.status-label').filter({ hasText: 'Data unavailable' })).toBeVisible()
  await page.getByLabel('Sample HAB source available', { exact: true }).check()
  await expect(page.locator('.status-label').filter({ hasText: 'Active harmful-algal-bloom advisory' })).toBeVisible()
  await page.locator('.supplier-card .provider-info-toggle').first().click()
  await page.getByRole('button', { name: 'Supplier details & tools', exact: true }).first().click()
  await expect(page.getByRole('textbox')).toHaveCount(0)
  const chooser = page.getByRole('combobox', { name: 'What do you need help with?', exact: true })
  for (const kind of ['service', 'request', 'complaint', 'legal']) {
    await chooser.selectOption(kind)
    await expect(page.getByRole('textbox', { name: 'Draft body', exact: true })).toHaveValue(/SAMPLE — NOT A REAL CLAIM/)
  }
  await expect(page.locator('a[href^="mailto:"],a[href^="tel:"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Sample mode', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Exit sample', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Sample mode', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /My public water supplier/ })).toBeVisible()
})

test('keyboard-focused draft editor stays above mobile bottom navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Try sample mode', exact: true }).click()
  await page.getByRole('button', { name: 'Use sample watch list', exact: true }).click()
  await page.locator('.supplier-card .provider-info-toggle').first().click()
  await page.getByRole('button', { name: 'Supplier details & tools', exact: true }).first().click()
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
    await page.getByRole('button', { name: 'Probar modo de muestra', exact: true }).click()
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
  await page.clock.runFor(30_001)
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
    await card.locator('.provider-info-toggle').click()
    await expect(card.getByText('Previously observed notice · current status unverified', { exact: true })).toBeVisible()
    await expect(card.getByText('Active', { exact: true })).toHaveCount(0)
  })
}
