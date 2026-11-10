import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL) return route.abort()
    if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (url.pathname === '/api/status') return route.fulfill({ json: { places: [], archive: [], sources: [] } })
    if (url.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false, accountUrl: null } })
    if (url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  await page.addInitScript(() => sessionStorage.setItem('wave:logo-intro:v1', 'seen'))
})

/** Waits for Home's entrance animation (elements falling in, the strip rising) to finish. */
const settled = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations()
  .filter(animation => ['fallIn', 'waveRise'].includes((animation as CSSAnimation).animationName))
  .map(animation => animation.finished)).then(() => undefined))

test('water stays below the header, reacts without moving content, and persists on navigation', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const canvas = page.locator('.home-water canvas')
  await expect(canvas).toBeVisible()
  await settled(page)
  const water = (await page.locator('.home-water').boundingBox())!
  const header = (await page.locator('.app-header').boundingBox())!
  expect(water.y).toBeGreaterThanOrEqual(header.y + header.height)
  expect(water.x).toBeCloseTo(0, 0)
  expect(water.width).toBe(page.viewportSize()!.width)
  await expect(page.locator('.home-water')).toHaveCSS('pointer-events', 'none')
  const cards = page.locator('.wave-home-actions')
  // Document-relative position: element screenshots may scroll a taller-than-viewport Home.
  const place = () => cards.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height } })
  const before = await place()
  await page.waitForTimeout(200)
  const still = await canvas.screenshot()
  // No automatic drops: without a click the surface stays exactly as it was. (The moving strip
  // and content are hidden for this comparison so only the canvas is captured.)
  await page.addStyleTag({ content: '.wave-home { visibility: hidden !important }' })
  const quiet = await canvas.screenshot()
  await page.waitForTimeout(2500)
  expect((await canvas.screenshot()).equals(quiet)).toBe(true)
  await page.evaluate(() => document.querySelectorAll('style').forEach(style => { if (style.textContent?.includes('.wave-home { visibility')) style.remove() }))
  // Drop into the open strip band at the bottom of the hero (it lets pointer events through).
  const gap = await page.locator('.wave-hero').evaluate(el => el.getBoundingClientRect().bottom - 40)
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(water.width * .18, gap)
  else await page.mouse.click(water.width * .18, gap)
  await page.waitForTimeout(350)
  const after = await canvas.screenshot()
  expect(after.equals(still)).toBe(false)
  expect(await canvas.evaluate(canvas => (canvas as HTMLCanvasElement).getContext('webgl')!.getError())).toBe(0)
  const resolution = await canvas.evaluate(canvas => [(canvas as HTMLCanvasElement).width, (canvas as HTMLCanvasElement).height])
  expect(resolution[0]).toBeLessThanOrEqual(1280)
  expect(resolution[1]).toBeLessThanOrEqual(960)
  expect(await place()).toEqual(before)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  await page.screenshot({ path: test.info().outputPath('home-water.png'), fullPage: true })
  await page.locator('.wave-home-action').first().click()
  await expect(canvas).toBeVisible()
  expect(errors).toEqual([])
})

test('reduced motion and missing WebGL retain usable static Home', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.home-water canvas')).toBeHidden()
  await expect(page.locator('.wave-home-action').first()).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      return type.startsWith('webgl') ? null : original.call(this, type as '2d', ...args)
    } as typeof original
  })
  await page.reload()
  await expect(page.locator('.home-water canvas')).toBeHidden()
  await page.locator('.wave-home-action').first().click()
  await expect(page.locator('.home-water canvas')).toBeHidden()
})

test('lost WebGL context falls back without affecting content', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.home-water canvas')).toBeVisible()
  await page.locator('.home-water canvas').evaluate(canvas => {
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  })
  await expect(page.locator('.home-water canvas')).toBeHidden()
  await expect(page.locator('.wave-home-action').first()).toBeEnabled()
})

test('motion preferences can change without breaking or retaining animation', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.home-water canvas')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.home-water canvas')).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.home-water canvas')).toBeVisible()
})

test('a drop produces a localized circular wave and fades back to the exact clean gradient', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const modulePath = '/src/water-surface.ts'
    const { createWaterSurface } = await import(modulePath)
    const canvas = document.createElement('canvas')
    const surface = createWaterSurface(canvas)!
    surface.resize(256, 256)
    const gl = canvas.getContext('webgl')!
    const pixels = () => {
      const data = new Uint8Array(256 * 256 * 4)
      gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, data)
      return data
    }
    surface.frame(0)
    const baseline = pixels()
    surface.drop(.5, .5, .01)
    for (let now = 50; now <= 1000; now += 50) surface.frame(now)
    const ripple = pixels()
    const radialEnergy = Array.from({ length: 182 }, () => ({ sum: 0, count: 0 }))
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const bin = radialEnergy[Math.round(Math.hypot(x - 127.5, y - 127.5))]
      bin.sum += Math.abs(ripple[(y * 256 + x) * 4] - baseline[(y * 256 + x) * 4])
      bin.count++
    }
    const energy = radialEnergy.map(bin => bin.count ? bin.sum / bin.count : 0)
    const peak = energy.indexOf(Math.max(...energy))
    for (let now = 1050; now <= 6500; now += 50) surface.frame(now)
    const settled = pixels()
    const clean = settled.every((value, index) => value === baseline[index])
    surface.dispose()
    return { peak, center: energy[0], strength: energy[peak], clean }
  })
  expect(result.peak).toBeGreaterThan(92)
  expect(result.peak).toBeLessThan(104)
  expect(result.center).toBe(0)
  expect(result.strength).toBeGreaterThan(2)
  expect(result.clean).toBe(true)
})

test('Home hero spans the width under the standard header, with cards in its right column', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await settled(page)
  const header = (await page.locator('.app-header').boundingBox())!
  const hero = (await page.locator('.wave-hero').boundingBox())!
  const search = (await page.locator('.wave-hero-search').boundingBox())!
  const pill = (await page.locator('.wave-hero-pill').boundingBox())!
  const [mapCard, helpCard] = await Promise.all([0, 1].map(async index => (await page.locator('.wave-home-action').nth(index).boundingBox())!))
  // Home keeps the same header as every other tab. The hero has no fill of its own, so the shared
  // background and its droplet canvas show through, and the strip keeps its original look.
  await expect(page.locator('.app-header')).not.toHaveCSS('background-color', 'rgb(14, 42, 71)')
  await expect(page.locator('.wave-hero')).toHaveCSS('background-image', 'none')
  await expect(page.locator('.wave-hero')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.locator('.home-water canvas')).toHaveCount(1)
  await expect(page.locator('.wave-hero-water .welcome-strip svg')).toHaveCSS('opacity', '0.64')
  await expect(page.locator('.wave-hero-water .welcome-band--aqua')).toHaveAttribute('fill', /^url\(#/)
  await expect(page.locator('.wave-hero-water .welcome-floor')).toHaveCount(0)
  await expect(page.locator('.wave-hero h1')).toHaveCSS('color', 'rgb(14, 42, 71)')
  const headlineLines = await page.locator('.wave-hero h1').evaluate((h1) => Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)))
  expect(headlineLines).toBe(2)
  expect(hero.x).toBe(0)
  expect(hero.width).toBe(1280)
  expect(hero.y).toBeCloseTo(header.y + header.height, 0)
  // No "How it works" section: the hero fills the first screen and only the see-through footer
  // follows, so the strip ends at the bottom of the window with no white edge.
  await expect(page.locator('.wave-steps')).toHaveCount(0)
  const footer = (await page.locator('.wave-home-footer').boundingBox())!
  expect(footer.y).toBeCloseTo(hero.y + hero.height, 0)
  expect(footer.y + footer.height).toBeCloseTo(800, 0)
  await expect(page.locator('.wave-home-footer')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  // The label is screen-reader only; the magnifier on the right is the named submit button.
  await expect(page.locator('.wave-hero-field label')).toHaveClass(/sr-only/)
  await expect(page.locator('.wave-hero-search-icon')).toHaveCount(0)
  const submitButton = page.getByRole('button', { name: 'Search', exact: true })
  const desktopSubmit = (await submitButton.boundingBox())!
  expect(desktopSubmit.width).toBeGreaterThanOrEqual(48)
  expect(desktopSubmit.height).toBeGreaterThanOrEqual(48)
  expect(desktopSubmit.x + desktopSubmit.width).toBeGreaterThan(search.x + search.width - 16)
  await expect(submitButton.locator('svg')).toHaveCount(1)
  // Cards sit inside the hero, right of the search column, stacked 18px apart.
  expect(mapCard.x).toBeGreaterThan(search.x + search.width)
  expect(helpCard.x).toBeCloseTo(mapCard.x, 0)
  expect(helpCard.y - (mapCard.y + mapCard.height)).toBeCloseTo(18, 0)
  expect(helpCard.y + helpCard.height).toBeLessThan(hero.y + hero.height)
  // "Browse all places" clears the strip's highest possible crest (~13% down its box).
  const water = (await page.locator('.wave-hero-water').boundingBox())!
  expect(pill.y + pill.height).toBeLessThanOrEqual(water.y + water.height * .13)
  await expect(page.locator('.wave-hero-water')).toHaveCSS('pointer-events', 'none')
  await expect(page.getByRole('navigation')).toBeVisible()
  // Hover lift still works after the "backwards" entrance animation.
  await page.locator('.wave-home-action').first().hover()
  await expect(page.locator('.wave-home-action').first()).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280)
  await page.screenshot({ path: test.info().outputPath('home-hero.png'), fullPage: true })
  await page.setViewportSize({ width: 800, height: 900 })
  await page.locator('.wave-hero h1').hover()
  await expect(page.locator('.wave-home-action').first()).toHaveCSS('transform', 'none')
  const [tabletMap, tabletHelp] = await Promise.all([0, 1].map(async index => (await page.locator('.wave-home-action').nth(index).boundingBox())!))
  expect(tabletHelp.y).toBeCloseTo(tabletMap.y, 0)
  expect(tabletMap.y).toBeGreaterThan((await page.locator('.wave-hero-links').boundingBox())!.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(800)
  await page.setViewportSize({ width: 390, height: 844 })
  const phoneSearch = (await page.locator('.wave-hero-search').boundingBox())!
  const submit = (await page.locator('.wave-hero-search button').boundingBox())!
  // The magnifier stays inside the box, on the same row as the input.
  expect(submit.width).toBeGreaterThanOrEqual(44)
  expect(submit.width).toBeLessThan(60)
  expect(submit.x + submit.width).toBeLessThanOrEqual(phoneSearch.x + phoneSearch.width)
  expect(submit.y).toBeGreaterThanOrEqual(phoneSearch.y)
  expect(submit.y + submit.height).toBeLessThanOrEqual(phoneSearch.y + phoneSearch.height)
  expect(phoneSearch.height).toBeLessThan(80)
  const [phoneMap, phoneHelp] = await Promise.all([0, 1].map(async index => (await page.locator('.wave-home-action').nth(index).boundingBox())!))
  expect(phoneHelp.y).toBeGreaterThan(phoneMap.y + phoneMap.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.screenshot({ path: test.info().outputPath('home-hero-phone.png'), fullPage: true })
})

test('reduced motion turns off the Home entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  for (const selector of ['.wave-hero h1', '.wave-hero-water', '.wave-home-action']) await expect(page.locator(selector).first()).toHaveCSS('animation-name', 'none')
})

test('the shared background remains behind every main navigation page and settings details', async ({ page }) => {
  await page.goto('/')
  const original = await page.locator('.home-water canvas').elementHandle()
  for (const name of ['Places', 'Map', 'History', 'Settings', 'Home']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
    const canvas = page.locator('.home-water canvas')
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveCSS('opacity', name === 'Home' ? '1' : '0.18')
    expect(await page.evaluate(first => first === document.querySelector('.home-water canvas'), original)).toBe(true)
    const water = (await page.locator('.home-water').boundingBox())!
    const header = (await page.locator('.app-header').boundingBox())!
    expect(water.y).toBeGreaterThanOrEqual(header.y + header.height)
    expect(water.width).toBe(page.viewportSize()!.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: /Sources and coverage/ }).click()
  await expect(page.getByRole('heading', { name: 'Sources and coverage limits', exact: true })).toBeVisible()
  await expect(page.locator('.home-water canvas')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('water-sources.png'), fullPage: true })
})
