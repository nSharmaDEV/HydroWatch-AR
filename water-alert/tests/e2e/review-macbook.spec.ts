import { test, expect } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })
test('Review footer fits a laptop viewport with one file', async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop')
  await context.addInitScript(() => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:mode', 'live')
    localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [], liftWatches: [], language: 'en', checkOnOpen: false }))
    const place = { id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES', kind: 'system', county: 'Benton' }
    const draft = { id: 'synthetic-one-file', place, issue: 'service', description: 'Synthetic layout check', dates: '', route: 'provider', stage: 2, flowStep: 'send', attachments: [{ id: 'a', name: 'document.pdf', type: 'application/pdf', data: 'eA==' }], evidence: [], context: '', subjectEdited: true, bodyEdited: true, subject: 'Intermittent water service', body: 'Hello team,\n\nI am writing about interruptions and low pressure at my home. Please investigate and let me know what happens next.\n\nThank you.' }
    localStorage.setItem('water-alert:live-help:v1', JSON.stringify([{ id: draft.id, owner: 'device', draft, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }]))
  })
  await context.route('**/*', route => {
    const u = new URL(route.request().url())
    if (u.origin !== baseURL) return route.abort()
    if (u.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false, accountUrl: null } })
    if (u.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (u.pathname === '/api/status') return route.fulfill({ json: { places: [], sources: [], archive: [], coverageStart: null } })
    if (u.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await page.getByRole('button', { name: 'Continue draft', exact: true }).click()
  await expect(page.locator('.review-file')).toHaveCount(1)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => page.locator('.request-card-action').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true)
})
for (const language of ['en', 'es']) test(`Review matches the preceding Help screens (${language})`, async ({ page, context, baseURL }, info) => {
  const unexpected: string[] = []
  const letter = language === 'es'
    ? 'Hola al equipo de Bentonville Water Utilities:\n\nSoy cliente en 100 Synthetic Street. Les escribo sobre un problema con mi servicio de agua.\n\nHe tenido interrupciones en el servicio y la presión es más baja de lo habitual.\n\n¿Podrían, por favor:\n1. Investigar el problema y explicar los próximos pasos para restablecer el servicio.\n2. Compartir una actualización.\n3. Revisar la causa de la baja presión e indicar cuándo puedo esperar una respuesta?\n\nGracias.'
    : 'Hello Bentonville Water Utilities team,\n\nI’m a customer at 100 Synthetic Street. I’m writing about a problem with my water service.\n\nI experienced interruptions in my water service. I have lower pressure than usual.\n\nCould you please:\n1. Investigate the reported service problem and advise on next steps toward restoration.\n2. Share an update.\n3. Check what’s causing the low pressure and let me know when I should expect an update.\n\nThank you.'
  await context.addInitScript(({ language, letter }) => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:mode', 'live')
    localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [], liftWatches: [], language, checkOnOpen: false }))
    const place = { id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES', kind: 'system', county: 'Benton' }
    const draft = { id: 'synthetic-layout-check', place, issue: 'service', description: 'Synthetic layout check', dates: '', route: 'provider', stage: 2, flowStep: 'send', attachments: [], evidence: [], context: '', subjectEdited: true, bodyEdited: true,
      subject: 'Intermittent water service — 100 Synthetic Street',
      body: letter }
    localStorage.setItem('water-alert:live-help:v1', JSON.stringify([{ id: draft.id, owner: 'device', draft, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }]))
  }, { language, letter })
  await context.route('**/*', route => {
    const u = new URL(route.request().url())
    if (u.origin !== baseURL) { unexpected.push(u.href); return route.abort() }
    if (u.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false, accountUrl: null } })
    if (u.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (u.pathname === '/api/status') return route.fulfill({ json: { places: [], sources: [], archive: [], coverageStart: null } })
    if (u.pathname.startsWith('/api/')) { unexpected.push(u.href); return route.abort() }
    return route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: language === 'en' ? 'History' : 'Historial', exact: true }).click()
  await page.getByRole('button', { name: language === 'en' ? 'Continue draft' : 'Continuar borrador', exact: true }).click()
  await expect(page.getByRole('button', { name: language === 'en' ? 'Log a contact attempt' : 'Registrar un intento de contacto', exact: true })).toBeVisible()
  await expect(page.locator('.request-review-intro')).toHaveCount(0)
  await expect(page.locator('.send-after-contact')).toHaveCount(0)
  if (info.project.name === 'desktop') {
    await page.setViewportSize({ width: 1280, height: 800 })
    const style = (selector: string) => page.locator(selector).evaluate(el => {
      const s = getComputedStyle(el)
      return [s.minHeight, s.height, s.paddingTop, s.paddingRight, s.fontSize, s.borderRadius]
    })
    const reviewStyles = await Promise.all(['.request-history-button', '.request-back-button', '.request-footer .primary'].map(style))
    await page.getByRole('button', { name: language === 'en' ? 'Back' : 'Atrás', exact: true }).click()
    await expect(page.locator('.request-screen-anything')).toBeVisible()
    const formStyles = await Promise.all(['.request-history-button', '.request-back-button', '.request-footer .primary'].map(style))
    expect(reviewStyles).toEqual(formStyles)
    await page.getByRole('button', { name: language === 'en' ? 'Review my message' : 'Revisar mi mensaje', exact: true }).click()
    await expect(page.locator('.request-screen-send')).toBeVisible()
  }
  const toolbar = page.locator('.request-email-toolbar')
  for (const label of language === 'en' ? ['Copy message', 'Edit message', 'Open in my email app'] : ['Copiar mensaje', 'Editar mensaje', 'Abrir en mi app de correo']) {
    const control = toolbar.getByLabel(label, { exact: true })
    await expect(control).toHaveAttribute('title', label)
    await expect(control).toHaveText('')
  }
  const editIcon = toolbar.getByLabel(language === 'en' ? 'Edit message' : 'Editar mensaje', { exact: true })
  await editIcon.focus()
  await expect(editIcon.locator('..').getByRole('tooltip')).toBeVisible()
  await editIcon.hover()
  await expect(editIcon.locator('..').getByRole('tooltip')).toBeVisible()
  // 2026-11-12: the call script and the next-office ("Another option") card left Review.
  await expect(page.getByText(language === 'en' ? 'What to say when you call' : 'Qué decir cuando llames', { exact: true })).toHaveCount(0)
  await expect(page.locator('.send-option-next, .send-option-script')).toHaveCount(0)
  await expect(page.locator('.review-files')).toHaveCount(0)
  await expect(page.getByRole('region', { name: language === 'en' ? 'What happens next' : 'Qué sigue' })).toBeVisible()
  const contactInfo = page.getByRole('button', { name: language === 'en' ? 'About this contact' : 'Información del contacto', exact: true })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await contactInfo.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toContainText(language === 'en' ? 'General utility contact' : 'Contacto general')
  await page.keyboard.press('Escape')
  await expect(contactInfo).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await page.locator('.request-progress').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const update = page.getByRole('button', { name: language === 'en' ? 'Update draft from answers' : 'Actualizar borrador desde las respuestas', exact: true })
  if (await update.isVisible()) {
    page.once('dialog', dialog => dialog.accept())
    await update.click()
    await page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true }).fill(letter)
  }
  if (info.project.name === 'desktop') for (const viewport of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await expect(page.locator('.request-progress')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect.poll(() => page.locator('.request-card-action').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true)
    await expect(page.getByRole('heading', { name: language === 'en' ? 'Your message is ready' : 'Tu mensaje está listo', exact: true })).toHaveCSS('position', 'absolute')
    // Review is centered at 1120px with a 65/35 grid; it may scroll on laptop heights.
    await expect.poll(() => page.locator('.request-card').evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(1120)
    await expect.poll(() => page.locator('.request-card').evaluate(el => {
      const rect = el.getBoundingClientRect()
      return Math.abs(rect.left - (innerWidth - rect.right)) < 2
    })).toBe(true)
    await expect.poll(() => page.locator('.request-send-layout').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').map(parseFloat)).then(([a, b]) => Math.round(a / (a + b) * 100))).toBe(65)
    await expect.poll(() => page.locator('.request-message-editor').evaluate(el => el.scrollHeight <= el.clientHeight + 2)).toBe(true)
    await page.screenshot({ path: info.outputPath(`review-${language}-${viewport.width}.png`), fullPage: true })
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (info.project.name === 'phone-sized') {
    await page.setViewportSize({ width: 320, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.request-card-action')).toHaveCSS('position', 'static')
    const recipient = await page.locator('.request-recipient-control').boundingBox()
    const citations = await page.getByRole('button', { name: language === 'en' ? 'Cited sources' : 'Fuentes citadas', exact: true }).boundingBox()
    const recipientText = await page.locator('.request-recipient-dropdown').boundingBox()
    expect(recipientText!.x + recipientText!.width).toBeLessThanOrEqual(citations!.x)
    expect(citations!.y).toBeGreaterThanOrEqual(recipient!.y)
    expect(citations!.y + citations!.height).toBeLessThanOrEqual(recipient!.y + recipient!.height)
    await page.mouse.move(0, 0)
    await page.screenshot({ path: info.outputPath(`review-${language}-mobile.png`), fullPage: true })
  }
  if (info.project.name === 'desktop') {
    await page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true }).fill('A longer resident-written message.\n'.repeat(80))
    await expect.poll(() => page.locator('.request-message-editor').evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
    await expect(page.getByRole('textbox', { name: language === 'en' ? 'Message' : 'Mensaje', exact: true })).toHaveValue('A longer resident-written message.\n'.repeat(80))
  }
  await page.getByRole('button', { name: language === 'en' ? 'Log a contact attempt' : 'Registrar un intento de contacto', exact: true }).click()
  await expect(page.getByLabel(language === 'en' ? 'Contact date' : 'Fecha de contacto', { exact: true })).toBeVisible()
  expect(unexpected).toEqual([])
})

for (const language of ['en', 'es']) test(`Review Your files toggles, downloads and stacks on phones (${language})`, async ({ page, context, baseURL }, info) => {
  const en = language === 'en'
  const b64 = (c: string, n: number) => Buffer.from(c.repeat(n)).toString('base64')
  const files = [
    { id: 'a', name: 'low-pressure-faucet.jpg', type: 'image/jpeg', data: b64('x', 4096) },
    { id: 'b', name: 'pressure-video.mp4', type: 'video/mp4', data: b64('y', 2048) },
    { id: 'c', name: 'october-bill.pdf', type: 'application/pdf', data: b64('z', 1024) },
  ]
  await context.addInitScript(({ language, files }) => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:mode', 'live')
    localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [], liftWatches: [], language, checkOnOpen: false }))
    const place = { id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES', kind: 'system', county: 'Benton' }
    const draft = { id: 'synthetic-files-check', place, issue: 'service', description: 'Synthetic files check', dates: '', route: 'provider', stage: 2, flowStep: 'send', attachments: files, evidence: [], context: '', subjectEdited: true, bodyEdited: true, subject: 'Synthetic subject', body: 'Hello team,\n\nSynthetic message.\n\nThank you.' }
    localStorage.setItem('water-alert:live-help:v1', JSON.stringify([{ id: draft.id, owner: 'device', draft, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }]))
  }, { language, files })
  await context.route('**/*', route => {
    const u = new URL(route.request().url())
    if (u.origin !== baseURL) return route.abort()
    if (u.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false, accountUrl: null } })
    if (u.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (u.pathname === '/api/status') return route.fulfill({ json: { places: [], sources: [], archive: [], coverageStart: null } })
    if (u.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: en ? 'History' : 'Historial', exact: true }).click()
  await page.getByRole('button', { name: en ? 'Continue draft' : 'Continuar borrador', exact: true }).click()
  const toggle = page.getByRole('button', { name: en ? 'Your files · 3. Hide files' : 'Tus archivos · 3. Ocultar archivos', exact: true })
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText(en ? 'Drag into your email' : 'Arrastra a tu correo', { exact: true })).toBeVisible()
  await expect(page.locator('.review-file')).toHaveCount(3)
  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: `${en ? 'Download' : 'Descargar'} october-bill.pdf`, exact: true }).click()
  expect((await download).suggestedFilename()).toBe('october-bill.pdf')
  await toggle.focus()
  await page.keyboard.press('Enter')
  const closed = page.getByRole('button', { name: en ? 'Your files · 3. Show files' : 'Tus archivos · 3. Mostrar archivos', exact: true })
  await expect(closed).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.review-file')).toHaveCount(0)
  await expect(page.getByText(en ? 'Drag into your email' : 'Arrastra a tu correo', { exact: true })).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: en ? 'Continue draft' : 'Continuar borrador', exact: true }).click().catch(() => {})
  await expect(closed).toHaveAttribute('aria-expanded', 'false')
  await closed.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  if (info.project.name === 'desktop') {
    await page.setViewportSize({ width: 1280, height: 800 })
    const side = await page.locator('.review-side').boundingBox(), email = await page.locator('.request-review-card').boundingBox()
    expect(side!.x).toBeGreaterThan(email!.x + email!.width)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  const order = await page.evaluate(() => ['.request-review-card', '.send-contact-card', '.review-files', '.review-next'].map(s => Math.round(document.querySelector(s)!.getBoundingClientRect().top)))
  expect([...order].sort((a, b) => a - b)).toEqual(order)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath(`review-files-${language}-phone.png`), fullPage: true })
})
