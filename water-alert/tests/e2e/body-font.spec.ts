import { test, expect } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })
for (const language of ['en', 'es'] as const) test(`Noto Sans body trial preserves headings (${language})`, async ({ page, context, baseURL }) => {
  const es = language === 'es', unexpected: string[] = []
  await context.addInitScript(language => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:mode', 'sample')
    localStorage.setItem('water-alert:sample:v1', JSON.stringify({ watches: ['ADH:sample-creek'], liftWatches: [], language, checkOnOpen: false }))
  }, language)
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL) { unexpected.push(url.href); return route.abort() }
    if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (url.pathname === '/api/status') return route.fulfill({ json: { places: [], sources: [], archive: [], coverageStart: null } })
    if (url.pathname.startsWith('/api/')) { unexpected.push(url.href); return route.abort() }
    return route.continue()
  })
  const family = (selector: string) => page.locator(selector).first().evaluate(el => getComputedStyle(el).fontFamily)
  const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('/')
  await page.getByRole('button', { name: es ? 'Lugares' : 'Places', exact: true }).click()
  await expect(page.locator('.supplier-card').first()).toBeVisible()
  expect(await family('.supplier-card p')).toContain('Noto Sans')
  expect(await family('.supplier-title-row h2')).toContain('Montserrat')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('400 16px "Noto Sans"', 'Información útil: presión, acción, ¿cuándo?'))).toBe(true)
  await fits()
  if (process.env.WAVE_FONT_CAPTURE_DIR) await page.screenshot({ path: `${process.env.WAVE_FONT_CAPTURE_DIR}/places-${language}-${test.info().project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: es ? 'Obtener ayuda con un problema de agua' : 'Get help with a water issue', exact: true }).first().click()
  await expect(page.locator('.request-card h1')).toBeVisible()
  expect(await family('.request-card h1')).not.toContain('Noto Sans')
  expect(await family('.request-card button')).toContain('Noto Sans')
  await page.getByRole('textbox', { name: es ? '¿Algo más? (opcional)' : 'Anything else? (optional)', exact: true }).fill('Ejemplo ficticio: presión intermitente. No enviar.')
  for (let step = 1; step <= 4; step++) {
    await fits()
    const fields = page.locator('.request-card input:not([type=checkbox]):not([type=file]), .request-card textarea')
    for (const el of await fields.all()) if (await el.isVisible()) expect(await el.evaluate(el => getComputedStyle(el).fontFamily)).toContain('Noto Sans')
    if (process.env.WAVE_FONT_CAPTURE_DIR) await page.screenshot({ path: `${process.env.WAVE_FONT_CAPTURE_DIR}/help-${step}-${language}-${test.info().project.name}.png`, fullPage: true })
    if (step < 4) await page.getByRole('button', { name: step === 3 ? es ? 'Escribir mi correo' : 'Write my email' : es ? 'Continuar' : 'Continue', exact: true }).click()
  }
  expect(unexpected).toEqual([])
})
