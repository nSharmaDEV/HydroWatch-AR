import { test, expect } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })
for (const language of ['en', 'es'] as const) test(`real-world contact preparation (${language})`, async ({ page, context, baseURL }, info) => {
  const es = language === 'es', errors: string[] = [], unexpected: string[] = []
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
  const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const next = async () => { await fits(); await page.getByRole('button', { name: es ? 'Continuar' : 'Continue', exact: true }).click() }
  await page.goto('/')
  await page.getByRole('button', { name: es ? 'Lugares' : 'Places', exact: true }).click()
  await page.getByRole('button', { name: es ? 'Obtener ayuda con un problema de agua' : 'Get help with a water issue', exact: true }).first().click()
  await expect(page.locator('.request-progress')).toContainText(es ? 'Paso 1 de 6' : 'Step 1 of 6')
  if (info.project.name === 'desktop') {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await expect(page.locator('.request-issue-choice[aria-checked="false"]').first()).toHaveCSS('background-image', 'none')
    await expect(page.locator('.request-issue-choice[aria-checked="false"]').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  }
  const centered = async () => {
    if (info.project.name !== 'desktop') return
    const delta = await page.locator('.request-card').evaluate(el => {
      const card = el.getBoundingClientRect(), main = el.closest('main')!.getBoundingClientRect()
      return { x: Math.abs((card.left + card.right - main.left - main.right) / 2), y: Math.abs((card.top + card.bottom - main.top - main.bottom) / 2) }
    })
    expect(delta.x).toBeLessThan(3)
    expect(delta.y).toBeLessThan(3)
  }
  await centered()
  await page.getByRole('radio', { name: es ? /Interrupción del servicio/ : /Service/ }).click()
  await next()
  await page.getByRole('textbox', { name: es ? '¿Algo más? (opcional)' : 'Anything else? (optional)', exact: true }).fill('Synthetic resident: pressure drops each evening.')
  await centered()
  await next()
  await page.getByRole('button', { name: es ? '¿No la encuentras? Escríbela manualmente' : 'Can’t find it? Enter it manually', exact: true }).click()
  await page.getByLabel(es ? 'Dirección donde pasó (obligatorio)' : 'Address where this happened (required)', { exact: true }).fill('100 Synthetic Street')
  await next()
  if (info.project.name === 'desktop') {
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect.poll(() => page.locator('.request-action-media textarea').evaluate(el => el.getBoundingClientRect().height)).toBeLessThanOrEqual(110)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  }
  await next()
  if (info.project.name === 'desktop') await page.setViewportSize({ width: 1440, height: 1000 })
  await centered()
  await next()
  await centered()
  await expect(page.locator('.request-progress')).toContainText(es ? 'Paso 6 de 6' : 'Step 6 of 6')
  await expect(page.getByText(es ? 'Contacto previo con el proveedor (opcional)' : 'Prior provider contact (optional)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: es ? 'Revisar mi mensaje' : 'Review my message', exact: true }).click()
  const message = page.getByRole('textbox', { name: es ? 'Mensaje' : 'Message', exact: true })
  await expect(message).toHaveValue(/Synthetic resident: pressure drops each evening/)
  await expect(message).not.toHaveValue(/What happened\n|Qué pasó\n|it has not been resolved|no se ha resuelto/)
  await fits()
  await page.getByRole('button', { name: es ? 'Editar mensaje' : 'Edit message', exact: true }).click()
  await expect(message).toBeFocused()
  if (info.project.name === 'desktop') {
    // Representative letter, not a truncated draft: test the smaller MacBook workspace too.
    await message.fill('Hello Sample Creek Water team,\n\nI’m a customer at 100 Synthetic Street. I’m writing about a problem with my water service.\n\nI experienced interruptions in my water service. I have lower pressure than usual.\n\nCould you please:\n1. Investigate the reported service problem and advise on next steps toward restoration.\n2. Share an update.\n3. Check what’s causing the low pressure and let me know when I should expect an update.\n\nThank you.')
    for (const viewport of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      await expect(page.locator('.request-progress')).toBeVisible()
      await expect.poll(() => page.locator('.request-card').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(1120)
      await expect.poll(() => message.evaluate(el => el.scrollHeight <= el.clientHeight + 2)).toBe(true)
    }
  }
  await page.screenshot({ path: info.outputPath(`contact-review-${language}.png`), fullPage: true })
  await message.fill('SYNTHETIC MANUAL EDIT')
  await page.getByRole('button', { name: es ? 'Abrir Historial' : 'Open History', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: es ? 'Continuar borrador' : 'Continue draft', exact: true }).click()
  await expect(message).toHaveValue('SYNTHETIC MANUAL EDIT')
  expect(errors).toEqual([])
  expect(unexpected).toEqual([])
})
