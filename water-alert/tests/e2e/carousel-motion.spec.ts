import { test, expect } from '@playwright/test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) test(`utility slide stays aligned through reversal and resizing (${reducedMotion})`, async ({ page, context, baseURL }) => {
  await page.emulateMedia({ reducedMotion })
  await context.addInitScript(() => {
    localStorage.setItem('water-alert:mode', 'sample')
    localStorage.setItem('water-alert:sample:v1', JSON.stringify({ language: 'en', watches: [] }))
  })
  await context.route('**/*', route => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort())
  await page.goto('/tests/e2e/components.html?mode=carousel')
  const track = page.locator('.carousel-track')
  const slides = page.locator('.carousel-slide')
  const controls = page.locator('.carousel-controls')
  const before = await controls.boundingBox()
  await page.getByRole('button', { name: 'Next place' }).click()
  const alignment = (el: Element) => Math.abs(el.getBoundingClientRect().left - el.closest('.carousel-viewport')!.getBoundingClientRect().left)
  await expect.poll(() => slides.nth(1).evaluate(alignment)).toBeLessThan(1)
   // No competing browser scroll offsets or CSS transitions.
  expect(await track.evaluate(el => el.scrollLeft)).toBe(0)
  expect((await controls.boundingBox())!.y).toBe(before!.y)
   expect(await track.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s')
  await page.getByRole('button', { name: 'Previous place' }).click()
  await page.getByRole('button', { name: 'Next place' }).click()
  await page.setViewportSize({ width: 820, height: 900 })
  await expect.poll(() => slides.nth(1).evaluate(alignment)).toBeLessThan(1)
  await page.getByRole('button', { name: 'Previous place' }).click()
  await expect.poll(() => slides.first().evaluate(alignment)).toBeLessThan(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
