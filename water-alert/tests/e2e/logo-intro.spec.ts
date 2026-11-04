import { test, expect } from '@playwright/test'

test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL) return route.abort()
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { sources: [], places: [], archive: [], coverageStart: null } })
    // Production disallows inline style attributes. Keep Vite's development
    // stylesheet injection working while exercising the same attribute policy.
    if (route.request().isNavigationRequest()) {
      const response = await route.fetch()
      return route.fulfill({ response, headers: { ...response.headers(), 'Content-Security-Policy': "style-src-attr 'none'" } })
    }
    return route.continue()
  })
})

test('draws contours, fills, exits, and leaves the app usable without replaying', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install()
  await page.clock.pauseAt(new Date())
  await page.goto('/')
  const overlay = page.locator('.logo-intro')
  await expect(overlay).toBeVisible()
  await expect(page.getByRole('button', { name: /Get help with a water issue/ })).toBeAttached()
  const path = overlay.locator('[data-part="wave"]').first()
  const holdDuration = await path.evaluate(el => {
    const pathStyle = getComputedStyle(el)
    const overlayStyle = getComputedStyle(el.closest('.logo-intro')!)
    const fillEnd = parseFloat(pathStyle.animationDelay.split(',')[1]) + parseFloat(pathStyle.animationDuration.split(',')[1])
    return (parseFloat(overlayStyle.animationDelay) - fillEnd) * 1000
  })
  expect(holdDuration).toBeCloseTo(700)
  // Seek the real CSS animations so a busy runner cannot miss the brief draw/hold.
  const frames = await path.evaluate(el => {
    const animations = el.getAnimations()
    const seek = (time: number) => { animations.forEach(animation => { animation.pause(); animation.currentTime = time }); return { stroke: parseFloat(getComputedStyle(el).strokeDashoffset), fill: Number(getComputedStyle(el).fillOpacity) } }
    return [seek(0), seek(1000), seek(1600)]
  })
  expect(frames[0].stroke).toBeGreaterThan(0)
  expect(frames[1].stroke).toBeLessThan(frames[0].stroke)
  expect(frames[2].fill).toBe(1)
  const art = await overlay.locator('svg').boundingBox()
  const viewport = page.viewportSize()!
  expect(Math.abs(art!.x + art!.width / 2 - viewport.width / 2)).toBeLessThan(2)
  expect(Math.abs(art!.y + art!.height / 2 - viewport.height / 2)).toBeLessThan(2)
  await page.clock.fastForward(2510)
  await expect(overlay).toHaveCount(0, { timeout: 3500 })
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Try sample mode' }).click()
  await expect(page.getByRole('button', { name: 'Use sample watch list' })).toBeVisible()
  await page.getByRole('button', { name: 'Use sample watch list' }).click()
  await expect(page.getByRole('heading', { name: 'My Water' })).toBeVisible()
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 500 })
  expect(await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); return window.scrollY })).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await expect(overlay).toHaveCount(0)
  expect(errors).toEqual([])
})

test('reduced motion uses completed paths and a short fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const overlay = page.locator('.logo-intro')
  await expect(overlay).toBeVisible()
  const style = await overlay.locator('path').first().evaluate(el => {
    const css = getComputedStyle(el)
    return { animation: css.animationName, fill: css.fillOpacity, stroke: css.stroke }
  })
  expect(style).toEqual({ animation: 'none', fill: '1', stroke: 'none' })
  await expect(overlay).toHaveCount(0, { timeout: 1500 })
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Try sample mode' }).click()
  await expect(page.getByRole('button', { name: 'Use sample watch list' })).toBeVisible()
})

test('stays centered at narrow phone, tablet and desktop widths', async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.evaluate(() => sessionStorage.removeItem('wave:logo-intro:v1'))
    await page.reload()
    const box = await page.locator('.logo-intro svg').boundingBox()
    expect(box!.width).toBeLessThan(width)
    expect(Math.abs(box!.x + box!.width / 2 - width / 2)).toBeLessThan(2)
    await expect(page.locator('.logo-intro')).toHaveCount(0, { timeout: 3500 })
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden')
  }
})
