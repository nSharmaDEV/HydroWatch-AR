import { test, expect } from '@playwright/test'
for (const language of ['en', 'es'] as const) test(`saved guided help, Map and History (${language})`, async ({ page, context, baseURL }) => {
  const unexpected: string[] = [], errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await context.addInitScript(language => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:mode', 'sample')
    if (!localStorage.getItem('water-alert:sample:v1')) localStorage.setItem('water-alert:sample:v1', JSON.stringify({ watches: ['ADH:sample-creek'], liftWatches: [], language, checkOnOpen: false }))
  }, language)
  await context.route('**/*', route => {
    const u = new URL(route.request().url())
    if (u.origin !== baseURL) { unexpected.push(u.href); return route.abort() }
    if (u.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (u.pathname === '/api/status') return route.fulfill({ json: { places: [], sources: [], archive: [], coverageStart: null } })
    if (u.pathname.startsWith('/api/')) { unexpected.push(u.href); return route.abort() }
    return route.continue()
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  const fits = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (await page.locator('.request-review-grid').count()) {
      const left = (await page.locator('.request-review-information').boundingBox())!, right = (await page.locator('.request-review-email').boundingBox())!
      expect(left.width / (left.width + right.width)).toBeCloseTo(0.35, 1)
      expect(await page.locator('.request-message-editor').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
    } else expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(801)
  }
  await page.goto('/')
  await page.getByRole('button', { name: language === 'en' ? 'Places' : 'Lugares', exact: true }).click()
  await page.getByRole('button', { name: language === 'en' ? 'Get help with a water issue' : 'Obtener ayuda con un problema de agua', exact: true }).first().click()
   await expect(page.locator('.request-progress')).toContainText(language === 'en' ? 'Step 1 of 5' : 'Paso 1 de 5')
   await fits()
    await page.getByRole('button', { name: language === 'en' ? 'Continue' : 'Continuar', exact: true }).click()
    await fits()
    await page.getByRole('button', { name: language === 'en' ? 'Continue' : 'Continuar', exact: true }).click()
  await page.getByLabel(language === 'en' ? 'Describe what happened (optional if selected above)' : 'Describe lo que pasó (opcional si seleccionaste arriba)', { exact: true }).fill('Synthetic resident issue — no service on Monday')
   await fits()
   await page.getByRole('button', { name: language === 'en' ? 'Continue' : 'Continuar', exact: true }).click()
   await fits()
   await page.getByRole('button', { name: language === 'en' ? 'Review message' : 'Revisar mensaje', exact: true }).click()
   await fits()
  await page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true }).fill('SYNTHETIC EDIT RETAINED')
  await expect(page.locator('.request-topline [role=status]')).toHaveText(language === 'en' ? 'Saved on this device' : 'Guardado en este dispositivo')
  await page.getByRole('button', { name: language === 'en' ? 'Open History' : 'Abrir Historial', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: language === 'en' ? 'Resume draft' : 'Reanudar borrador', exact: true }).click()
  await expect(page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true })).toHaveValue('SYNTHETIC EDIT RETAINED')
  await expect(page.getByRole('button', { name: language === 'en' ? 'Send message' : 'Enviar mensaje', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: language === 'en' ? 'Copy email' : 'Copiar correo', exact: true })).toBeEnabled()
  await fits()
  for (const width of [390, 320, 1280]) {
    await page.setViewportSize({ width, height: 700 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: language === 'en' ? 'Copy email' : 'Copiar correo', exact: true }).scrollIntoViewIfNeeded()
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: language === 'en' ? 'Map' : 'Mapa', exact: true }).click()
  await expect(page.locator('.advisory-map-page')).toBeVisible()
  await page.getByRole('button', { name: language === 'en' ? 'History' : 'Historial', exact: true }).click()
  await expect(page.locator('.advisory-map-page')).toBeHidden()
  expect(unexpected).toEqual([]); expect(errors).toEqual([])
})
