import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
test.use({ reducedMotion: 'reduce' })
for (const language of ['en', 'es'] as const) for (const outputs of [false, true]) test(`${outputs ? 'sample outputs and language' : 'saved guided help, Map and History'} (${language})`, async ({ page, context, baseURL }, testInfo) => {
  const unexpected: string[] = [], errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await context.addInitScript(language => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { sessionStorage.setItem('test:copied', text) } } })
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
    if (outputs) return
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.request-card')).toHaveCount(1)
    if (await page.locator('.request-review-email').count()) {
      expect(await page.locator('.request-message-editor').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
    }
    // The approved full email scrolls with the document, not inside a clipped editor.
    if (await page.locator('.request-message-editor').count()) expect(await page.locator('.request-message-editor').evaluate(el => el.scrollHeight <= el.clientHeight + 2)).toBe(true)
  }
  await page.goto('/')
  await page.getByRole('button', { name: language === 'en' ? 'Places' : 'Lugares', exact: true }).click()
  await page.getByRole('button', { name: language === 'en' ? 'Get help with a water issue' : 'Obtener ayuda con un problema de agua', exact: true }).first().click()
  await expect(page.locator('.request-progress')).toContainText(language === 'en' ? 'Step 1 of 4' : 'Paso 1 de 4')
  await fits()
  const describe = language === 'en' ? 'Anything else? (optional)' : '¿Algo más? (opcional)'
  await page.getByLabel(describe, { exact: true }).fill('Synthetic resident issue — no service on Monday')
  const other = language === 'en' ? 'es' : 'en'
  if (outputs) {
    await page.getByRole('button', { name: other.toUpperCase(), exact: true }).click()
    await expect(page.getByRole('textbox', { name: other === 'en' ? 'Anything else? (optional)' : '¿Algo más? (opcional)', exact: true })).toHaveValue('Synthetic resident issue — no service on Monday')
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
  }
  await fits()
  for (const n of [2, 3]) {
    await page.getByRole('button', { name: language === 'en' ? 'Continue' : 'Continuar', exact: true }).click()
    await expect(page.locator('.request-progress')).toContainText(language === 'en' ? `Step ${n} of 4` : `Paso ${n} de 4`)
    await fits()
  }
  await page.getByRole('button', { name: language === 'en' ? 'Write my email' : 'Escribir mi correo', exact: true }).click()
  await expect(page.locator('.request-progress')).toContainText(language === 'en' ? 'Step 4 of 4' : 'Paso 4 de 4')
  await fits()
  const message = page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true })
  await expect(message).toHaveValue(new RegExp(language === 'en' ? 'What happened\n' : 'Qué pasó\n'))
  await expect(message).toHaveValue(new RegExp(language === 'en' ? 'What I’m requesting\n' : 'Lo que solicito\n'))
  await expect(message).not.toHaveValue(/5 business days|5 días hábiles/)
  if (!outputs) {
    const phone = testInfo.project.name === 'phone-sized'
    await page.setViewportSize({ width: phone ? 390 : 1280, height: 900 })
    await fits()
    await page.locator('.request-review-email').scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`structured-email-${language}.png`), fullPage: true })
  }
  if (outputs) {
    await page.getByRole('button', { name: other.toUpperCase(), exact: true }).click()
    await expect(page.getByRole('textbox', { name: other === 'en' ? 'Message' : 'Mensaje', exact: true })).toHaveValue(new RegExp(other === 'en' ? 'I’m writing' : 'Le escribo'))
    await page.getByRole('textbox', { name: other === 'en' ? 'Message' : 'Mensaje', exact: true }).fill('SYNTHETIC EDIT RETAINED')
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    await expect(page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true })).toHaveValue('SYNTHETIC EDIT RETAINED')
  } else await page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true }).fill('SYNTHETIC EDIT RETAINED')
  await expect(page.locator('.request-topline [role=status]')).toHaveText(language === 'en' ? 'Saved on this device' : 'Guardado en este dispositivo')
  await page.getByRole('button', { name: language === 'en' ? 'Open History' : 'Abrir Historial', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: language === 'en' ? 'Continue draft' : 'Continuar borrador', exact: true }).click()
  // Continuing opens the screen the resident stopped at.
  await expect(page.locator('.request-progress')).toContainText(language === 'en' ? 'Step 4 of 4' : 'Paso 4 de 4')
  await expect(page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true })).toHaveValue('SYNTHETIC EDIT RETAINED')
  const subject = page.getByRole('textbox', { name: language === 'en' ? 'Subject' : 'Asunto', exact: true })
  await subject.fill('SYNTHETIC MANUAL SUBJECT')
  await page.locator('.help-downloads-disclosure > summary').click()
  const regenerate = page.getByRole('button', { name: language === 'en' ? 'Update draft from answers' : 'Actualizar borrador desde las respuestas', exact: true })
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm')
    expect(dialog.message()).toContain(language === 'en' ? 'manual edits' : 'cambios manuales')
    await dialog.dismiss()
  })
  await regenerate.click()
  await expect(subject).toHaveValue('SYNTHETIC MANUAL SUBJECT')
  await expect(message).toHaveValue('SYNTHETIC EDIT RETAINED')
  page.once('dialog', dialog => dialog.accept())
  await regenerate.click()
  await expect(subject).not.toHaveValue('SYNTHETIC MANUAL SUBJECT')
  await expect(message).toHaveValue(/Synthetic resident issue — no service on Monday/)
  await expect(message).toHaveValue(new RegExp(language === 'en' ? 'What happened\n' : 'Qué pasó\n'))
  await message.fill('SYNTHETIC EDIT RETAINED')
  if (outputs) {
    const marker = language === 'en' ? 'SAMPLE — FICTIONAL' : 'EJEMPLO — FICTICIO'
    for (const [label, filename] of [[language === 'en' ? 'Download email' : 'Descargar correo', 'sample-water-email.txt'], [language === 'en' ? 'Download report' : 'Descargar reporte', 'sample-water-report.txt']]) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: label, exact: true }).click()])
      expect(download.suggestedFilename()).toBe(filename)
      const content = await readFile((await download.path())!, 'utf8')
      expect(content).toContain(marker)
      if (filename.includes('email')) expect(content).toContain('SYNTHETIC EDIT RETAINED')
    }
  }
  // Sample mode: the ways to send it are shown but disabled.
  await expect(page.locator('.send-options')).toContainText(language === 'en' ? 'Sample — sending disabled.' : 'Ejemplo — envío desactivado.')
  await expect(page.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: language === 'en' ? 'Send message' : 'Enviar mensaje', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: language === 'en' ? 'Copy email' : 'Copiar correo', exact: true })).toBeEnabled()
  if (outputs) {
    await page.getByRole('button', { name: language === 'en' ? 'Copy email' : 'Copiar correo', exact: true }).click()
    expect(await page.evaluate(() => sessionStorage.getItem('test:copied'))).toContain(language === 'en' ? 'SAMPLE — FICTIONAL' : 'EJEMPLO — FICTICIO')
  }
  if (!outputs) {
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
  }
  expect(unexpected).toEqual([]); expect(errors).toEqual([])
})
