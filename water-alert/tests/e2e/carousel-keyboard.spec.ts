import { test, expect } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })
for (const language of ['en', 'es'] as const) test(`carousel native keys, Tab isolation and retained state (${language})`, async ({ page, context, baseURL }) => {
  const unexpected: string[] = []
  await context.addInitScript(language => {
    localStorage.setItem('water-alert:mode', 'sample')
    localStorage.setItem('water-alert:sample:v1', JSON.stringify({ language, watches: [] }))
  }, language)
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL || url.pathname.startsWith('/api/')) { unexpected.push(url.href); return route.abort() }
    return route.continue()
  })
  await page.goto('/tests/e2e/components.html?mode=carousel')
  const region = page.getByRole('region', { name: language === 'en' ? 'Watched places' : 'Lugares seguidos' })
  const status = page.locator('.carousel-status')
  const input = page.getByRole('textbox', { name: 'Resident text' })
  await input.fill('My retained wording')
  await input.press('Home')
  expect(await input.evaluate(el => (el as HTMLInputElement).selectionStart)).toBe(0)
  await input.press('End')
  expect(await input.evaluate(el => (el as HTMLInputElement).selectionStart)).toBe('My retained wording'.length)
  const year = page.getByRole('combobox', { name: 'Report year' })
  await year.evaluate(el => el.addEventListener('keydown', event => { queueMicrotask(() => { (el as HTMLElement).dataset.prevented = String(event.defaultPrevented) }) }))
  await year.focus(); await year.press('ArrowDown')
  await expect(year).toHaveAttribute('data-prevented', 'false')
  // macOS headless Chromium does not commit its OS-native picker via keys,
  // including for a standalone select. Check uncancelled keys above and the
  // actual selection/state change through Playwright's native select API.
  await year.press('Escape'); await year.selectOption('2024')
  await expect(year).toHaveValue('2024')
  await expect(status).toHaveText(language === 'en' ? '1 of 2 places' : '1 de 2 lugares')
  await page.getByText('Saved expansion', { exact: true }).click()
  await page.getByRole('button', { name: 'First card action' }).focus()
  await page.keyboard.press('Tab')
  const next = page.getByRole('button', { name: language === 'en' ? 'Next place' : 'Lugar siguiente' })
  await expect(next).toBeFocused()
  await next.click()
  await expect(page.getByRole('button', { name: 'First card action' })).toHaveCount(0)
  await region.focus(); await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Second card action' })).toBeFocused()
  await page.getByRole('button', { name: language === 'en' ? 'Previous place' : 'Lugar anterior' }).click()
  await expect(input).toHaveValue('My retained wording')
  await expect(year).toHaveValue('2024')
  await expect(page.getByText('Kept open', { exact: true })).toBeVisible()
  await region.focus(); await region.press('End')
  await expect(status).toHaveText(language === 'en' ? '2 of 2 places' : '2 de 2 lugares')
  await region.press('Home')
  await expect(status).toHaveText(language === 'en' ? '1 of 2 places' : '1 de 2 lugares')
  expect(unexpected).toEqual([])
})
