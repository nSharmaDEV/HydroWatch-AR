import { expect, test } from '@playwright/test'
import { blankRequest } from '../../src/help-requests'

test('request detail uses responsive columns without hiding actions', async ({ page, context, baseURL }, testInfo) => {
  const draft = { ...blankRequest({ id: 'ADH:sample-creek', name: 'SAMPLE CREEK WATER', county: 'Sample', kind: 'system' }), subject: 'Intermittent water service — 1915 Southwest Cypress, Bentonville, AR 72712', issue: 'service', flowStep: 'details', body: 'Hello,\n\nMy water service is intermittent.\n\nPlease investigate.\n\nThank you.\n\nSynthetic sample only.\n\nSincerely,\nA resident' }
  const record = { id: draft.id, owner: 'sample', draft, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }
  await context.addInitScript(record => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:mode', 'sample')
    localStorage.setItem('water-alert:sample:v1', JSON.stringify({ watches: ['ADH:sample-creek'], liftWatches: [], language: 'en', checkOnOpen: false }))
    localStorage.setItem('water-alert:sample-help:v1', JSON.stringify([record]))
  }, record)
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL) return route.abort()
    if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (url.pathname === '/api/status') return route.fulfill({ json: { places: [], sources: [], archive: [], coverageStart: null } })
    if (url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'History', exact: true }).click()
  const message = page.getByRole('region', { name: 'Your message', exact: true })
  const details = page.getByRole('region', { name: 'Details' })
  await expect(details).toBeVisible()
  const start = page.getByRole('button', { name: 'Start another request' })
  const resume = page.getByRole('button', { name: 'Continue draft' })
  await expect(resume).toHaveCSS('border-radius', '999px')
  await expect(resume).toHaveCSS('border-top-style', 'solid')
  await expect(resume).toHaveCSS('font-size', '20px')
  await expect(page.getByRole('region', { name: 'Finish your message' }).getByRole('button', { name: 'Start another request' })).toBeVisible()
  const a = (await message.boundingBox())!, b = (await details.boundingBox())!
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByRole('heading', { level: 1, name: draft.subject })).toHaveClass('history-request-title')
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveCount(0)
    expect(b.x).toBeGreaterThan(a.x + a.width - 2)
    expect(Math.abs(b.y - a.y)).toBeLessThan(4)
    const resumeBox = (await resume.boundingBox())!
    expect(resumeBox.y).toBeGreaterThanOrEqual(b.y + b.height)
    expect(resumeBox.y - (b.y + b.height)).toBeLessThan(25)
    expect(Math.abs(resumeBox.x - b.x)).toBeLessThan(4)
    expect(Math.abs(resumeBox.width - b.width)).toBeLessThan(4)
    expect(Math.abs(resumeBox.y + resumeBox.height - (a.y + a.height))).toBeLessThan(4)
    expect(b.y + b.height).toBeLessThanOrEqual(900)
    expect((await page.getByRole('button', { name: 'Start another request' }).boundingBox())!.y).toBeLessThan(900)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
  } else {
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Show full message' }).click()
  await expect(page.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
})
