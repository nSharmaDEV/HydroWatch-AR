import { expect, test } from '@playwright/test'

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

test('water stays below the header, reacts without moving content, and persists on navigation', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const canvas = page.locator('.home-water canvas')
  await expect(canvas).toBeVisible()
  const water = (await page.locator('.home-water').boundingBox())!
  const header = (await page.locator('.app-header').boundingBox())!
  const marquee = (await page.locator('.wave-marquee').boundingBox())!
  expect(water.y).toBeGreaterThanOrEqual(header.y + header.height)
  expect(water.y).toBeGreaterThanOrEqual(marquee.y + marquee.height)
  expect(water.x).toBeCloseTo(0, 0)
  expect(water.width).toBe(page.viewportSize()!.width)
  await expect(page.locator('.home-water')).toHaveCSS('pointer-events', 'none')
  const cards = page.locator('.wave-home-actions')
  const before = await cards.boundingBox()
  await page.waitForTimeout(200)
  const still = await canvas.screenshot()
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(water.width * .18, water.y + 90)
  else await page.mouse.click(water.width * .18, water.y + 90)
  await page.waitForTimeout(350)
  const after = await canvas.screenshot()
  expect(after.equals(still)).toBe(false)
  expect(await canvas.evaluate(canvas => (canvas as HTMLCanvasElement).getContext('webgl')!.getError())).toBe(0)
  const resolution = await canvas.evaluate(canvas => [(canvas as HTMLCanvasElement).width, (canvas as HTMLCanvasElement).height])
  expect(resolution[0]).toBeLessThanOrEqual(1280)
  expect(resolution[1]).toBeLessThanOrEqual(960)
  expect(await cards.boundingBox()).toEqual(before)
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

test('Home fills the screen without a bottom strip and retains its original content position', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const marquee = (await page.locator('.wave-marquee').boundingBox())!
  const water = (await page.locator('.home-water').boundingBox())!
  const group = (await page.locator('.wave-home').boundingBox())!
  expect(water.y + water.height).toBeCloseTo(800, 0)
  expect(group.x + group.width / 2).toBeCloseTo(640, 0)
  expect(group.y).toBeCloseTo(marquee.y + marquee.height + 40 + 28, 0)
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(800)
  await page.screenshot({ path: test.info().outputPath('home-centered.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.wave-home-action').last().scrollIntoViewIfNeeded()
  const last = (await page.locator('.wave-home-action').last().boundingBox())!
  const nav = (await page.locator('nav').boundingBox())!
  expect(last.y + last.height).toBeLessThanOrEqual(nav.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
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
