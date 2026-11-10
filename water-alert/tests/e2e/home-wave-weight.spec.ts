import { expect, test } from '@playwright/test'

test('home wave bands have a modest stroke using their own gradients', async ({ page }) => {
  await page.goto('/')
  for (const band of ['aqua', 'teal']) {
    const path = page.locator(`.wave-hero-water .welcome-band--${band}`)
    await expect(path).toHaveCSS('stroke-width', '4px')
    expect(await path.getAttribute('stroke')).toBe(await path.getAttribute('fill'))
  }
})
