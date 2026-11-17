import { test, expect } from '@playwright/test'

for (const language of ['en', 'es'] as const) test(`Step 5 file rows and removal (${language})`, async ({ page, context, baseURL }) => {
  const en = language === 'en'
  await context.addInitScript(language => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:mode', 'live')
    localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [], liftWatches: [], language, checkOnOpen: false }))
    const place = { id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES', kind: 'system', county: 'Benton' }
    const draft = { id: 'synthetic-step-five-files', place, issue: 'service', description: 'Synthetic report', dates: '', route: 'provider', stage: 1, flowStep: 'response', attachments: [], evidence: [], context: '', subject: 'Synthetic subject', body: 'Synthetic message' }
    localStorage.setItem('water-alert:live-help:v1', JSON.stringify([{ id: draft.id, owner: 'device', draft, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }]))
  }, language)
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
  await page.locator('.request-extras input[type=file]').setInputFiles([
    { name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('a'.repeat(1024)) },
    { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('test') },
  ])
  const row = page.locator('.request-attachment-row').filter({ hasText: 'report.pdf' })
  await expect(row).toContainText('PDF')
  await expect(row).toContainText('1 KB')
  const remove = row.getByRole('button', { name: `${en ? 'Remove attachment' : 'Eliminar archivo'}: report.pdf` })
  await expect(remove.locator('svg')).toHaveCount(1)
  await expect(remove).toHaveText('')
  await remove.focus()
  await page.keyboard.press('Enter')
  await expect(row).toHaveCount(0)
  await expect(page.locator('.request-attachment-row').filter({ hasText: 'photo.png' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: en ? 'Continue' : 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: en ? 'Review my message' : 'Revisar mi mensaje', exact: true }).click()
  await expect(page.locator('.review-file')).toHaveCount(1)
  await expect(page.locator('.review-file')).toContainText('photo.png')
})
