import { expect, test } from '@playwright/test'
import { PLACE_CATALOG } from '../../src/place-catalog'
import { en, es } from '../../src/strings'

// Isolated synthetic status reads only: never use the local API or live storage.
test.beforeEach(async ({ page, context, baseURL }) => {
  const places = PLACE_CATALOG.filter(entry => entry.place.kind === 'system').slice(0, 2).map(entry => entry.place)
  const at = new Date().toISOString()
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL) return route.abort()
    if (url.pathname.startsWith('/api/')) {
      expect(url.pathname).toBe('/api/status')
      expect(route.request().method()).toBe('GET')
      return route.fulfill({ json: { places, archive: [], coverageStart: at, sources: [
        { agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
        { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
      ] } })
    }
    return route.continue()
  })
  await page.addInitScript(watches => {
    localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches, language: 'en', liftWatches: [], checkOnOpen: true }))
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
  }, places.map(place => place.id))
})

for (const width of [1440, 390, 320]) {
  for (const language of ['EN', 'ES']) {
    test(`Home sidebar uses aligned background sections at ${width}px (${language})`, async ({ page }) => {
      await page.route('**/api/push/config', route => route.fulfill({ json: { enabled: false } }))
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await page.getByRole('button', { name: language, exact: true }).click()
      const t = language === 'EN' ? en : es
      const add = page.locator('.home-layout>.add-place')
      const updates = page.locator('.home-alert-options')
      const about = page.locator('.about-results')
      const card = page.locator('.supplier-card').first()
      await expect(add).toHaveCSS('color', 'rgb(8, 47, 73)')
      await expect(add).toHaveCSS('background-color', 'rgb(70, 205, 205)')
      const addBox = (await add.boundingBox())!
      const cardBox = (await card.boundingBox())!
      const updatesBox = (await updates.boundingBox())!
      const aboutBox = (await about.boundingBox())!
      expect(addBox.width).toBeCloseTo(updatesBox.width, 1)
      expect(addBox.x).toBeCloseTo(updatesBox.x, 1)
      expect(addBox.y).toBeCloseTo(cardBox.y, 1)
      expect(aboutBox.width).toBeCloseTo(updatesBox.width, 1)
      expect(aboutBox.x).toBeCloseTo(updatesBox.x, 1)
      for (const section of [updates, about]) {
        await expect(section).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
        await expect(section).toHaveCSS('box-shadow', 'none')
        await expect(section).toHaveCSS('border-radius', '0px')
        await expect(section).toHaveCSS('border-left-width', '0px')
        await expect(section).toHaveCSS('padding-left', '0px')
        await expect(section).toHaveCSS('padding-right', '0px')
      }
      await expect(updates).toHaveCSS('border-top-width', '0px')
      await expect(about).toHaveCSS('border-top-width', '1px')
      await expect(updates.locator('h2 svg')).toBeVisible()
      const toggle = updates.getByRole('switch', { name: t.waterUpdates })
      await expect(toggle).toHaveAttribute('aria-checked', 'false')
      const manage = updates.getByRole('button', { name: t.manageAlerts, exact: true })
      expect((await toggle.boundingBox())!.x).toBeGreaterThan((await updates.locator('h2').boundingBox())!.x)
      expect((await manage.boundingBox())!.y).toBeGreaterThan((await updates.locator('.sidebar-heading-row').boundingBox())!.y)
      const headingText = await updates.locator('h2').evaluate(el => {
        const range = document.createRange()
        range.selectNodeContents(el)
        return range.getBoundingClientRect()
      })
      expect((await manage.boundingBox())!.x).toBeCloseTo(headingText.x, 1)
      const cardActions = card.locator('.card-check-actions')
      const checkNow = cardActions.locator('button')
      const officialSource = cardActions.locator('a')
      for (const property of ['padding-top', 'padding-bottom', 'font-size', 'border-radius']) {
        await expect(add).toHaveCSS(property, await checkNow.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property))
        await expect(add).toHaveCSS(property, await officialSource.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property))
      }
      expect(addBox.height).toBe((await checkNow.boundingBox())!.height)
      expect(addBox.height).toBe((await officialSource.boundingBox())!.height)
      const before = await card.boundingBox()
      await expect(about.locator('details')).toHaveCount(0)
      await expect(about.locator('h2 svg')).toBeVisible()
      await expect(about.locator('p')).toHaveText(t.resultsSummary)
      await expect(about.getByRole('button', { name: t.sources, exact: true })).toBeVisible()
      if (width > 760) expect(await card.boundingBox()).toEqual(before)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await page.screenshot({ path: test.info().outputPath('home-sidebar.png'), fullPage: true })
      await about.getByRole('button', { name: t.sources, exact: true }).click()
      await expect(page.locator('.home-layout')).toHaveCount(0)
      await page.locator('.app-header nav button').first().click()
      await manage.click()
      await expect(page.locator('.home-layout')).toHaveCount(0)
      await page.locator('.app-header nav button').first().click()
      await add.click()
      await expect(page.locator('.home-layout')).toHaveCount(0)
    })
  }
}

for (const viewport of [{ width: 1280, height: 650 }, { width: 1440, height: 700 }, { width: 390, height: 600 }]) {
  for (const language of ['EN', 'ES']) {
    test(`service contacts are directly visible and compact at ${viewport.width}x${viewport.height} (${language})`, async ({ page }) => {
      const place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
      await page.addInitScript(id => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], language: 'en', liftWatches: [], checkOnOpen: true })), place.id)
      const at = new Date().toISOString()
      await page.route('**/api/status', route => route.fulfill({ json: { places: [place], archive: [], sources: [
        { agency: 'ADH', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
        { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
      ] } }))
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.getByRole('button', { name: language, exact: true }).click()
      const row = page.locator('.supplier-card .supplier-contact-section')
      await expect(row.locator('summary, .disclosure-icon')).toHaveCount(0)
      const phone = row.locator('a[href="tel:+14795492158"]')
      const email = row.locator('a[href="mailto:LEISUREHILLSWATERCO@GMAIL.COM"]')
      for (const link of [phone, email, row.locator('.contact-directory')]) {
        await expect(link).toBeVisible()
        const bounds = (await link.boundingBox())!
        const parent = (await row.boundingBox())!
        expect(bounds.x).toBeGreaterThanOrEqual(parent.x)
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(parent.x + parent.width + 1)
      }
      expect((await phone.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      expect((await email.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      if (viewport.width > 760) expect((await row.locator('.provider-contact').boundingBox())!.height).toBeLessThanOrEqual(50)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
      await page.screenshot({ path: test.info().outputPath('service-contact-row.png'), fullPage: true })
    })
  }
}

for (const viewport of [{ width: 1280, height: 650 }, { width: 1440, height: 700 }, { width: 390, height: 600 }]) {
  test(`header dimensions stay consistent across tabs at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.supplier-card').first()).toBeVisible()
    const dimensions = () => page.locator('.app-header').evaluate(header => {
      const box = header.getBoundingClientRect()
      const logo = header.querySelector('.brand-logo')!.getBoundingClientRect()
      const inner = header.querySelector('.header-inner')!.getBoundingClientRect()
      return { height: box.height, width: box.width, logoWidth: logo.width, logoHeight: logo.height, logoX: logo.x, logoY: logo.y, innerWidth: inner.width }
    })
    const home = await dimensions()
    for (const language of ['EN', 'ES']) {
      await page.getByRole('button', { name: language, exact: true }).click()
      for (const tab of [1, 2, 3, 0]) {
        await page.locator('.app-header nav button').nth(tab).click()
        await expect(page.locator('.app-header nav button').nth(tab)).toHaveAttribute('aria-current', 'page')
        expect(await dimensions()).toEqual(home)
      }
    }
  })
}

for (const viewport of [{ width: 1280, height: 650 }, { width: 1440, height: 700 }, { width: 1440, height: 900 }]) {
  for (const language of ['EN', 'ES']) {
    test(`collapsed Home stays accessible at ${viewport.width}x${viewport.height} at normal zoom (${language})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await expect(page.locator('.carousel-slide').first().locator('.status-label')).toHaveText('No active boil-water notice found')
      await page.getByRole('button', { name: language, exact: true }).click()
      const card = page.locator('.carousel-slide').first().locator('.supplier-card')
      await expect(card).toBeVisible()
      await expect(card.locator('.provider-info-toggle')).toHaveCSS('border-top-width', '0px')
      const divider = await card.locator('.supplier-actions>.alert-toggle').evaluate(el => {
        const s = getComputedStyle(el)
        return { width: el.getBoundingClientRect().width, border: s.borderTop, spacing: parseFloat(s.paddingBottom) }
      })
      const serviceDivider = await card.locator('.supplier-contact-section').evaluate(el => {
        const s = getComputedStyle(el)
        return { width: el.getBoundingClientRect().width, border: s.borderTop, spacing: parseFloat(s.paddingTop) }
      })
      expect(serviceDivider.border).toBe(divider.border)
      expect(serviceDivider.width).toBeCloseTo(divider.width, 1)
      expect(serviceDivider.spacing).toBe(divider.spacing)
      const controls = page.locator('.carousel-controls')
      const cardBox = (await card.boundingBox())!
      const mainBox = (await page.locator('main').boundingBox())!
      expect(mainBox.width).toBe(1160)
      expect(cardBox.x).toBeCloseTo((viewport.width - 1160) / 2 + 30, 0)
      expect(cardBox.width).toBeLessThan(740)
      await expect(card).toHaveCSS('padding-top', '24px')
      const controlsBox = (await controls.boundingBox())!
      expect(controlsBox.y - cardBox.y - cardBox.height).toBeGreaterThanOrEqual(8)
      expect(controlsBox.y - cardBox.y - cardBox.height).toBeLessThanOrEqual(12)
      const previous = controls.locator('button').first()
      const next = controls.locator('button').last()
      expect((await previous.boundingBox())!.x).toBeCloseTo(cardBox.x, 0)
      const nextBox = (await next.boundingBox())!
      expect(nextBox.x + nextBox.width).toBeCloseTo(cardBox.x + cardBox.width, 0)
      const countBox = (await controls.locator('.carousel-status').boundingBox())!
      expect(countBox.x + countBox.width / 2).toBeCloseTo(cardBox.x + cardBox.width / 2, 0)
      const checkStyle = await card.locator('.card-check-actions button').evaluate(el => {
        const s = getComputedStyle(el)
        return { background: s.backgroundColor, border: s.borderTopColor, color: s.color }
      })
      expect(checkStyle).toEqual({ background: 'rgb(255, 255, 255)', border: 'rgb(8, 127, 131)', color: 'rgb(6, 109, 115)' })
      expect((await page.locator('.app-header').boundingBox())!.height).toBeLessThanOrEqual(70)
      await expect(page.locator('.app-footer')).toHaveCount(0)
      const headerBox = (await page.locator('.app-header').boundingBox())!
      const uiBox = (await page.locator('.home-layout').boundingBox())!
      expect(headerBox.y).toBe(0)
      expect(cardBox.y - headerBox.height).toBeCloseTo(26, 0)
      const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      expect(documentHeight - controlsBox.y - controlsBox.height).toBeCloseTo(24, 0)
      expect(uiBox.y - headerBox.height).toBeCloseTo(documentHeight - uiBox.y - uiBox.height, 0)
      for (const control of [controls.locator('button').last(), card.locator('.provider-info-toggle'), card.locator('.supplier-help-action')]) {
        expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
      for (const locator of [page.locator('.app-header'), controls, card, page.locator('.add-place'), page.locator('.home-sidebar')]) {
        const box = (await locator.boundingBox())!
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      }
      // The restored contact divider includes real spacing, not a clipped overlay.
      expect(documentHeight).toBeLessThanOrEqual(viewport.height + 10)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
      expect(await card.locator('.supplier-help-action').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBe(16)
      await expect(card.locator('.supplier-help-action')).toBeInViewport({ ratio: 1 })
      await page.screenshot({ path: test.info().outputPath(`home-${language}-collapsed.png`), fullPage: true })

      // Expansion must grow the document, not a clipped or internally scrolling card.
      await card.locator('.provider-info-toggle').click()
      await expect(card.locator('.provider-water-source .profile-facts')).toBeVisible()
      await expect(card.locator('.provider-more')).toHaveCount(0)
      await expect(card.locator('.annual-report')).toHaveCSS('border-bottom-width', '0px')
      await expect(card.locator('.provider-water-source .supplier-profile')).toHaveCSS('border-bottom-width', '0px')
      const directory = PLACE_CATALOG.find(entry => entry.place.kind === 'system')!.url
      await expect(card.locator(`.provider-water-source a[href="${directory}"]`)).toHaveCount(1)
      await card.locator('.supplier-actions>.alert-toggle').click()
      await expect(card.locator('.supplier-contact-section .provider-contact')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(viewport.height)
      const help = card.locator('.supplier-help-action')
      await help.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await expect(help).toBeInViewport({ ratio: 1 })
      await expect(help).toBeEnabled()
      const helpBox = (await help.boundingBox())!
      const cardBottom = (await card.boundingBox())!
      expect(helpBox.y + helpBox.height).toBeLessThanOrEqual(cardBottom.y + cardBottom.height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
      await page.screenshot({ path: test.info().outputPath(`home-${language}-expanded.png`), fullPage: true })
      await next.scrollIntoViewIfNeeded()
      await expect(next).toBeInViewport({ ratio: 1 })
      await next.click()
      await expect(controls.locator('.carousel-status')).toHaveText(language === 'EN' ? '2 of 2 places' : '2 de 2 lugares')
      await expect(next).toBeDisabled()
      await previous.click()
      await expect(controls.locator('.carousel-status')).toHaveText(language === 'EN' ? '1 of 2 places' : '1 de 2 lugares')
      await help.scrollIntoViewIfNeeded()
      await help.click()
      await expect(page.locator('.help-guide')).toBeVisible()
    })
  }
}

for (const viewport of [{ width: 1280, height: 480 }, { width: 390, height: 600 }, { width: 320, height: 600 }]) {
  test(`smaller Home scrolls without hiding controls at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const card = page.locator('.carousel-slide').first().locator('.supplier-card')
    await expect(card).toBeVisible()
    const expectedPadding = viewport.width <= 760 ? '16px' : '30px'
    await expect(page.locator('main')).toHaveCSS('padding-left', expectedPadding)
    await expect(page.locator('main')).toHaveCSS('padding-right', expectedPadding)
    await card.locator('.provider-info-toggle').click()
    await expect(card.locator('.supplier-contact-section .provider-contact')).toBeVisible()
    const help = card.locator('.supplier-help-action')
    // Center explicitly: Chromium's nearest-edge scroll can round down a
    // fractional CSS pixel and leave a sliver outside a short viewport.
    await help.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await expect(help).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    const controls = page.locator('.carousel-controls')
    await controls.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await expect(controls).toBeInViewport({ ratio: 1 })
    await controls.locator('button').last().click()
    await expect(controls.locator('.carousel-status')).toHaveText('2 of 2 places')
    await controls.locator('button').first().click()
    await expect(controls.locator('.carousel-status')).toHaveText('1 of 2 places')
    await expect(page.locator('.app-footer')).toHaveCount(0)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const mainPadding = await page.locator('main').evaluate(el => ({ top: getComputedStyle(el).paddingTop, bottom: getComputedStyle(el).paddingBottom }))
    expect(mainPadding.top).toBe(mainPadding.bottom)
    const ui = (await page.locator('.home-layout').boundingBox())!
    const availableBottom = viewport.width <= 760 ? (await page.locator('.app-header nav').boundingBox())!.y : viewport.height
    expect(availableBottom - ui.y - ui.height).toBeCloseTo(viewport.width <= 760 ? 16 : 24, 0)
    await help.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await help.click()
    await expect(page.locator('.help-guide')).toBeVisible()
  })
}

for (const viewport of [{ width: 1280, height: 650 }, { width: 1440, height: 700 }, { width: 1440, height: 900 }]) {
  for (const language of ['EN', 'ES']) {
    test(`active and no-notice cards share formatting at ${viewport.width}x${viewport.height} (${language})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      const card = page.locator('.carousel-slide').first().locator('.supplier-card')
      await expect(card.locator('.status-label')).toHaveText('No active boil-water notice found')
      const copy = language === 'EN' ? en : es
      await page.getByRole('button', { name: language, exact: true }).click()
      await expect(card.locator('.status-label')).toHaveText(copy.noneBoil)
      await expect(card.locator(':scope > dl')).toHaveCount(0)
      const bannerStyle = await card.locator('.supplier-finding').evaluate(el => ({ padding: parseFloat(getComputedStyle(el).paddingTop), heading: parseFloat(getComputedStyle(el.querySelector('.status-label')!).fontSize), body: parseFloat(getComputedStyle(el.querySelector('.status-explanation')!).fontSize) }))
      expect(bannerStyle.padding).toBeGreaterThanOrEqual(10)
      expect(bannerStyle.heading).toBeGreaterThanOrEqual(26)
      expect(bannerStyle.body).toBeGreaterThanOrEqual(18)
      const findingHeight = (await card.locator('.supplier-finding').boundingBox())!.height
      const checkColor = await card.locator('.card-check-actions button').evaluate(el => getComputedStyle(el).backgroundColor)
      const places = PLACE_CATALOG.filter(entry => entry.place.kind === 'system').slice(0, 2).map(entry => entry.place)
      const at = new Date().toISOString()
      const notice = { id: 'synthetic-notice', placeId: places[0].id, name: places[0].name, agency: 'ADH', kind: 'boil', county: places[0].county, area: 'Entire system', reason: 'power outage', issued: at, lifted: null, url: 'https://health.arkansas.gov/boil-water-notices/' }
      await page.route('**/api/status', route => route.fulfill({ json: { places, archive: [notice], coverageStart: at, sources: [
        { agency: 'ADH', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null },
        { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
      ] } }))
      await page.reload()
      await page.getByRole('button', { name: language, exact: true }).click()
      await expect(card.locator('.status-label')).toHaveText(copy.activeBoil)
      expect(await card.locator('.card-check-actions button').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(checkColor)
      expect((await card.locator('.warning-icon').boundingBox())!.width).toBeLessThanOrEqual(24)
      expect((await card.locator('.supplier-finding').boundingBox())!.height).toBeCloseTo(findingHeight, 0)
      const service = (await card.locator('.supplier-contact-section').boundingBox())!
      const help = (await card.locator('.supplier-help-action').boundingBox())!
      const box = (await card.boundingBox())!
      expect(help.y - service.y - service.height).toBe(24)
      const cardPadding = await card.evaluate(el => {
        const style = getComputedStyle(el)
        return { left: parseFloat(style.paddingLeft), right: parseFloat(style.paddingRight), bottom: parseFloat(style.paddingBottom) }
      })
      expect(cardPadding.bottom).toBe(cardPadding.left)
      expect(cardPadding.bottom).toBe(cardPadding.right)
      expect(box.y + box.height - help.y - help.height).toBeGreaterThanOrEqual(cardPadding.bottom)
      expect(box.y + box.height - help.y - help.height).toBeLessThanOrEqual(cardPadding.bottom + 1)
      if (viewport.height <= 700) {
        expect(box.y + box.height).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.scrollHeight))
        await expect(page.locator('.app-footer')).toHaveCount(0)
      }
      await page.screenshot({ path: test.info().outputPath('active-card.png'), fullPage: true })
      await card.locator('.provider-info-toggle').click()
      await card.locator('.supplier-actions>.alert-toggle').click()
      await expect(card.locator('.supplier-contact-section .provider-contact')).toBeVisible()
      const helpAction = card.locator('.supplier-help-action')
      await helpAction.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await expect(helpAction).toBeInViewport({ ratio: 1 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
      await page.screenshot({ path: test.info().outputPath('active-card-expanded.png'), fullPage: true })
      await helpAction.click()
      await expect(page.locator('.help-guide')).toBeVisible()
    })
  }
}
for (const viewport of [{ width: 1280, height: 650 }, { width: 1440, height: 700 }, { width: 390, height: 600 }]) {
  for (const language of ['EN', 'ES']) {
    test(`provider title and matching actions at ${viewport.width}x${viewport.height} (${language})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.getByRole('button', { name: language, exact: true }).click()
      await page.evaluate(() => document.fonts.ready)
      const card = page.locator('.carousel-slide').first().locator('.supplier-card')
      const actions = card.locator('.card-check-actions')
      const button = actions.locator('button')
      const source = actions.locator('a')
      const metrics = (el: Element) => {
        const s = getComputedStyle(el)
        return { display: s.display, align: s.alignItems, justify: s.justifyContent, padding: s.padding, border: s.borderTopWidth, font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight, margin: s.margin, gap: s.gap }
      }
      expect(await button.evaluate(metrics)).toEqual(await source.evaluate(metrics))
      // Grid items blockify inline-flex to flex in computed styles.
      expect(await button.evaluate(metrics)).toMatchObject({ display: 'flex', align: 'center', justify: 'center', gap: '8px', margin: '0px' })
      const a = (await button.boundingBox())!
      const b = (await source.boundingBox())!
      const banner = (await card.locator('.supplier-finding').boundingBox())!
      expect(a.width).toBeCloseTo(b.width, 1)
      expect(a.height).toBe(b.height)
      expect(a.x).toBe(banner.x)
      expect(b.x + b.width).toBe(banner.x + banner.width)
      if (viewport.width > 420) {
        expect(b.y).toBe(a.y)
        expect(b.x - a.x - a.width).toBe(12)
      } else {
        expect(b.y - a.y - a.height).toBe(12)
      }
      const icon = (await source.locator('span').boundingBox())!
      expect(icon.y + icon.height / 2).toBeCloseTo(b.y + b.height / 2, 1)
      const providerTitle = card.locator('.supplier-title-row h2')
      expect(await providerTitle.evaluate(el => getComputedStyle(el).fontFamily)).toContain('Montserrat')
      expect(await page.evaluate(() => document.fonts.check('700 24px "Montserrat"'))).toBe(true)
      await page.screenshot({ path: test.info().outputPath('provider-actions.png'), fullPage: true })
      await providerTitle.evaluate(el => { el.textContent = 'Bentonville Regional Water Utilities and Public Services' })
      const title = (await providerTitle.boundingBox())!
      const info = card.locator('.supplier-info-button')
      const infoBox = (await info.boundingBox())!
      expect(title.x + title.width).toBeLessThanOrEqual(infoBox.x)
      expect(infoBox.width).toBeGreaterThanOrEqual(44)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
      await page.screenshot({ path: test.info().outputPath('long-provider-title.png'), fullPage: true })
      await info.click()
      await expect(card.locator('dialog')).toBeVisible()
    })
  }
  for (const language of ['EN', 'ES']) {
    for (const state of ['none', 'active', 'unavailable']) {
      test(`banner spacing stays balanced for ${state} at ${viewport.width}x${viewport.height} (${language})`, async ({ page }) => {
        const places = PLACE_CATALOG.filter(entry => entry.place.kind === 'system').slice(0, 2).map(entry => entry.place)
        const at = new Date().toISOString()
        const records = state === 'active' ? [{ id: 'synthetic-spacing', placeId: places[0].id, name: places[0].name, agency: 'ADH', kind: 'boil', county: places[0].county, area: 'Entire system', reason: 'power outage', issued: at, lifted: null, url: 'https://health.arkansas.gov/boil-water-notices/' }] : []
        await page.route('**/api/status', route => route.fulfill({ json: { places, archive: records, coverageStart: at, sources: [
          { agency: 'ADH', records, retrievedAt: at, lastSuccessAt: at, error: state === 'unavailable' ? 'Synthetic retrieval failure' : null },
          { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null },
        ] } }))
        await page.setViewportSize(viewport)
        await page.goto('/')
        await page.getByRole('button', { name: language, exact: true }).click()
        const card = page.locator('.carousel-slide').first().locator('.supplier-card')
        await expect(card).toHaveClass(new RegExp(state === 'active' ? 'boil' : state))
        const spacing = await card.evaluate(el => {
          const heading = el.querySelector('.supplier-heading')!.getBoundingClientRect()
          const banner = el.querySelector('.supplier-finding')!
          const box = banner.getBoundingClientRect()
          const title = banner.querySelector('.status-label')!.getBoundingClientRect()
          const body = banner.querySelector('.status-explanation')!.getBoundingClientRect()
          const actions = el.querySelector('.card-check-actions')!.getBoundingClientRect()
          const style = getComputedStyle(banner)
          return { above: box.top - heading.bottom, below: actions.top - box.bottom, gap: body.top - title.bottom,
            top: title.top - box.top, bottom: box.bottom - body.bottom, paddingTop: style.paddingTop, paddingBottom: style.paddingBottom,
            left: box.left - actions.left, right: box.right - actions.right, height: box.height }
        })
        expect(spacing.above).toBe(16)
        expect(spacing.below).toBe(16)
        expect(spacing.gap).toBe(8)
        expect(spacing.top).toBeCloseTo(spacing.bottom, 1)
        expect(spacing.paddingTop).toBe(spacing.paddingBottom)
        expect(spacing.left).toBe(0)
        expect(spacing.right).toBe(0)
        if (viewport.width === 390) expect(spacing.height).toBeGreaterThan(120)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
      })
    }
  }
}
