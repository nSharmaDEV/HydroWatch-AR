// Standalone design checks. Uses the existing server; never starts/stops app services.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../water-alert/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const origin = 'http://127.0.0.1:5189'
let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser?.close() })
async function pageFor(t, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 } })
  t.after(() => context.close())
  await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  t.after(() => assert.deepEqual(errors, [], 'no page errors'))
  page.setDefaultTimeout(5000)
  const response = await page.goto(origin + '/wave-help-remaining-review.html')
  assert.equal(response.status(), 200, 'remaining-design review should exist')
  await page.locator('#review-variants summary').click()
  return page
}
async function result(page, branch) {
  await page.selectOption('#branch', branch)
  await page.getByRole('button', { name: 'Show my next step', exact: true }).click()
}
test('remaining review opens without live actions', async t => {
  const page = await pageFor(t)
  assert.equal(await page.locator('h1:visible').textContent(), 'Understand a water advisory')
  assert.equal(await page.locator('a[href],form,input[type=file]').count(), 0)
})
test('advisory states never turn history or failure into current instructions', async t => {
  const page = await pageFor(t)
  for (const state of ['historical', 'stale', 'unavailable', 'none', 'ambiguous', 'sample']) {
    await page.selectOption('#notice-state', state)
    await page.getByRole('button', { name: 'Show my next step', exact: true }).click()
    assert.match(await page.locator('#result').innerText(), /not establish current|not prove safety|not a real advisory|cannot confirm current/i)
    assert.equal(await page.locator('[data-resource="cdc"]').count(), 0)
    await page.getByRole('button', { name: 'Change answers', exact: true }).click()
  }
  await page.selectOption('#notice-state', 'current')
  await page.selectOption('#notice-kind', 'other')
  await result(page, 'advisory')
  assert.equal(await page.locator('[data-resource="cdc"]').count(), 0)
  await page.getByRole('button', { name: 'Change answers', exact: true }).click()
  await page.selectOption('#notice-kind', 'boil')
  await page.selectOption('#advisory-question', 'precautions')
  await result(page, 'advisory')
  assert.equal(await page.locator('[data-resource="cdc"]').count(), 1)
})
test('billing routes management separately and preserves answers into follow-up', async t => {
  const page = await pageFor(t)
  await page.selectOption('#branch', 'billing')
  await page.selectOption('#biller', 'management')
  await page.selectOption('#billing-request', 'expenses')
  await page.selectOption('#prior', 'pending')
  await page.check('#record-receipts')
  await page.getByRole('button', { name: 'Show my next step', exact: true }).click()
  assert.match(await page.locator('#result').innerText(), /No verified management contact/)
  assert.equal(await page.locator('#result').getByText('LEISUREHILLSWATERCO@GMAIL.COM', { exact: true }).count(), 0)
  assert.match(await page.locator('#checklist').innerText(), /receipts/i)
  await page.getByRole('button', { name: 'Follow up on this issue', exact: true }).click()
  assert.equal(await page.locator('#underlying').inputValue(), 'billing')
  assert.equal(await page.locator('#contacted').inputValue(), 'management')
  assert.equal(await page.locator('#response').inputValue(), 'pending')
  await page.getByRole('button', { name: 'Show my next step', exact: true }).click()
  assert.match(await page.locator('#result').innerText(), /written update/)
})
test('AG forms and restrictions appear only for explicit complaint intent', async t => {
  const page = await pageFor(t)
  await page.selectOption('#branch', 'followup')
  await page.selectOption('#underlying', 'billing')
  await page.selectOption('#next-action', 'complaint')
  await page.selectOption('#legal-status', 'yes')
  await page.getByRole('button', { name: 'Show my next step', exact: true }).click()
  assert.equal(await page.locator('[data-resource="ag"]').count(), 1)
  assert.equal(await page.locator('[data-resource="pdf-en"],[data-resource="pdf-es"]').count(), 2)
  assert.match(await page.locator('#result').innerText(), /public records/)
  assert.match(await page.locator('#result').innerText(), /does not mediate/)
  await page.getByRole('button', { name: 'Change answers', exact: true }).click()
  await page.selectOption('#next-action', 'legal')
  await page.getByRole('button', { name: 'Show my next step', exact: true }).click()
  assert.equal(await page.locator('[data-resource="ag"]').count(), 0)
  assert.equal(await page.locator('[data-resource="court"]').count(), 0)
  await page.getByRole('button', { name: 'Court-process information', exact: true }).click()
  assert.equal(await page.locator('[data-resource="court"]').count(), 1)
})
test('draft edits survive back and language changes; exports stay inert', async t => {
  const page = await pageFor(t)
  await result(page, 'billing')
  await page.getByRole('button', { name: 'Prepare a draft', exact: true }).click()
  await page.fill('#draft-body', 'Synthetic edited draft')
  await page.getByRole('button', { name: 'Back to my next step', exact: true }).click()
  await page.getByRole('button', { name: 'Prepare a draft', exact: true }).click()
  assert.equal(await page.locator('#draft-body').inputValue(), 'Synthetic edited draft')
  await page.selectOption('#language', 'es')
  assert.equal(await page.locator('html').getAttribute('lang'), 'es')
  assert.equal(await page.locator('#draft-body').inputValue(), 'Synthetic edited draft')
  await page.getByRole('button', { name: 'Copiar borrador', exact: true }).click()
  assert.match(await page.locator('#status').innerText(), /no se copió|No se copió/)
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
})
test('unknown supplier and ADH destination never acquire supplier email', async t => {
  const page = await pageFor(t)
  await page.selectOption('#supplier', 'unknown')
  await result(page, 'billing')
  assert.equal(await page.locator('#result').getByText('LEISUREHILLSWATERCO@GMAIL.COM', { exact: true }).count(), 0)
  await page.selectOption('#branch', 'followup')
  await page.selectOption('#underlying', 'quality')
  await page.selectOption('#contacted', 'adh')
  await page.getByRole('button', { name: 'Show my next step', exact: true }).click()
  await page.getByRole('button', { name: 'Prepare a draft', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Open email draft', exact: true }).count(), 0)
})
test('layouts fit narrow phones and keyboard focus follows screens', async t => {
  for (const width of [320, 390, 768, 1440]) {
    const page = await pageFor(t, width)
    for (const branch of ['advisory', 'billing', 'followup']) {
      await result(page, branch)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      assert.equal(await page.locator('#result-title').evaluate(node => node === document.activeElement), true)
      await page.getByRole('button', { name: 'Change answers', exact: true }).click()
    }
  }
})
