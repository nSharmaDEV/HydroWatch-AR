import { test, expect, type Locator } from '@playwright/test'
import { LEISURE_HILLS_ID } from '../../src/annual-reports'
import type { HelpRequest } from '../../src/help-requests'

const at = '2026-11-08T12:00:00Z'
const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' as const }
const record: HelpRequest = {
  id: 'synthetic-glass-draft', owner: 'device', revision: 1, status: 'open', updatedAt: Date.parse(at), messages: [], events: [], replyToken: '',
  draft: { id: 'synthetic-glass-draft', place, issue: 'quality', description: 'Synthetic observation, not a water-safety finding.', dates: '', route: 'provider', subject: 'Synthetic saved draft', body: '', stage: 1, flowStep: 'experience', attachments: [], evidence: [], context: '' },
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await page.clock.setFixedTime(new Date(at))
  // Isolated browser storage, synthetic reads only. No live data or sends.
  await page.addInitScript(({ id, record }) => {
    if (!localStorage.getItem('water-alert:live:v1')) localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language: 'en', checkOnOpen: false }))
    if (!localStorage.getItem('water-alert:live-help:v1')) localStorage.setItem('water-alert:live-help:v1', JSON.stringify([record]))
  }, { id: place.id, record })
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL || route.request().method() !== 'GET') return route.abort()
    if (url.pathname === '/api/status') return route.fulfill({ json: { sources: ['ADH', 'ADEQ'].map(agency => ({ agency, records: [], retrievedAt: at, lastSuccessAt: at, error: null })), places: [place], archive: [], coverageStart: at } })
    if (url.pathname === '/api/push/config' || url.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false } })
    if (url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  await page.goto('/')
  await expect(page.locator('.logo-intro')).not.toBeVisible()
})

async function material(el: Locator) {
  return el.evaluate(el => { const s = getComputedStyle(el); return { background: s.backgroundImage, blur: s.backdropFilter, border: s.borderTopColor } })
}

for (const language of ['en', 'es'] as const) test(`outer glass preserves controls and saved observations (${language})`, async ({ page }) => {
  await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
  const nav = page.getByRole('navigation')
  await nav.getByRole('button', { name: language === 'en' ? 'Settings' : 'Ajustes', exact: true }).click()
  const reference = await material(page.locator('.settings-glass'))
  await nav.getByRole('button', { name: language === 'en' ? 'Places' : 'Lugares', exact: true }).click()
  const supplier = page.locator('.supplier-card').first()
  await expect(supplier).toBeVisible()
  await expect(supplier).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(supplier).toHaveCSS('background-image', 'none')
  await expect(supplier).toHaveCSS('backdrop-filter', 'none')
  await expect(supplier.locator('.supplier-finding')).toHaveCSS('backdrop-filter', 'none')
  await expect(supplier.locator('.supplier-finding')).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(supplier).toHaveCSS('clip-path', 'none')
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  await page.screenshot({ path: test.info().outputPath(`places-glass-${language}.png`), fullPage: true })
  await nav.getByRole('button', { name: language === 'en' ? 'History' : 'Historial', exact: true }).click()
  expect(await material(page.locator('.request-list-row'))).toEqual(reference)
  await expect(page.locator('.request-resume')).toHaveCSS('backdrop-filter', 'none')
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  await page.screenshot({ path: test.info().outputPath(`history-glass-${language}.png`), fullPage: true })
  await page.locator('.request-resume').click()
  await expect(page.locator('main > .welcome-strip--still')).toBeVisible()
  await expect(page.locator('main > .welcome-strip--still')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('.home-water canvas')).toHaveCount(1)
   const card = page.locator('.request-card')
   await expect(card).toHaveCount(1)
   await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)')
   // The saved `experience` step now opens on What's wrong?, which holds the description.
   const description = page.locator('.request-description textarea')
  await expect(description).toHaveValue(record.draft.description)
  await expect(description).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(description).toHaveCSS('backdrop-filter', 'none')
  await description.focus()
  await expect(description).toBeFocused()
  expect(await description.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  await page.screenshot({ path: test.info().outputPath(`help-glass-${language}.png`), fullPage: true })
  await description.fill('Synthetic edited observation')
  await nav.getByRole('button', { name: language === 'en' ? 'History' : 'Historial', exact: true }).click()
  await page.locator('.request-resume').click()
   await expect(page.locator('.request-description textarea')).toHaveValue('Synthetic edited observation')
})

test('issue choices share glass while the selected category stays distinct', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click()
  const reference = await material(page.locator('.settings-glass'))
  await page.evaluate(record => localStorage.setItem('water-alert:live-help:v1', JSON.stringify([{ ...record, draft: { ...record.draft, flowStep: 'choose' } }])), record)
  await page.reload()
  await expect(page.locator('.logo-intro')).not.toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'History', exact: true }).click()
  await page.locator('.request-resume').click()
  const choices = page.locator('.request-issue-choice')
  // Leisure Hills has hand-checked report findings, so "Ask about a water report" is the sixth choice.
  await expect(choices).toHaveCount(6)
  for (const choice of await choices.all()) {
    if (await choice.getAttribute('aria-pressed') === 'false') expect(await material(choice)).toEqual(reference)
  }
  const selected = page.locator('.request-issue-choice[aria-pressed="true"]')
  await expect(selected).toHaveCSS('border-top-width', '2px')
  await choices.filter({ hasText: 'Bill or charge' }).click()
  await expect(choices.filter({ hasText: 'Bill or charge' })).toHaveAttribute('aria-pressed', 'true')
  await expect(choices.filter({ hasText: 'Water-quality concern' })).toHaveAttribute('aria-pressed', 'false')
})

test('reduced motion and forced colors retain a still, readable help surface', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
  await page.getByRole('navigation').getByRole('button', { name: 'History', exact: true }).click()
  await page.locator('.request-resume').click()
  await expect(page.locator('main > .welcome-strip--still')).toBeVisible()
  const path = page.locator('main > .welcome-strip--still .welcome-band--teal')
  const geometry = await path.getAttribute('d')
  await page.waitForTimeout(150)
  await expect(path).toHaveAttribute('d', geometry!)
  await expect(page.locator('.home-water canvas')).not.toBeVisible()
   const panel = page.locator('.request-card')
  await expect(panel).toHaveCSS('backdrop-filter', 'none')
  await expect(panel).toHaveCSS('background-image', 'none')
  await expect(panel).toHaveCSS('box-shadow', 'none')
})
