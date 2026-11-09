// Isolated prototype checks. Start the repository-root static server on 8773.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../water-alert/package.json', import.meta.url))
const { chromium } = require('@playwright/test')
const origin = process.env.WAVE_PREVIEW_ORIGIN || 'http://127.0.0.1:8773'
let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser?.close() })
async function open(t, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } })
  t.after(() => context.close())
  const page = await context.newPage()
  const errors = [], unsafe = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/*', route => {
    const request = route.request()
    if (!request.url().startsWith(origin + '/') || request.method() !== 'GET' || request.url().includes('/api/')) {
      unsafe.push(request.url())
      return route.abort()
    }
    return route.continue()
  })
  t.after(() => { assert.deepEqual(errors, []); assert.deepEqual(unsafe, []) })
  page.setDefaultTimeout(2500)
  await page.goto(origin + '/docs/wireframes/wave-help-four-screen.html')
  assert.equal(await page.locator('#prototype').count(), 1, 'four-screen prototype exists')
  return page
}
async function step(page, number) { await page.locator(`[data-step="${number}"]`).click() }
test('four approved screens navigate and retain answers into an editable letter', async t => {
  const page = await open(t)
  assert.equal(await page.locator('h1:visible').innerText(), "What's wrong?")
  await page.getByLabel('Anything else?', { exact: false }).fill('The service adjustment is not explained on my bill.')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  assert.equal(await page.locator('h1:visible').innerText(), 'When, Where, + Action')
  await page.getByLabel('Which bill?').fill('November 2026')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  assert.equal(await page.locator('h1:visible').innerText(), 'Your details')
  await page.getByLabel('What have you already tried?').fill('I called on November 6 and was asked to write to billing.')
  await page.getByRole('button', { name: 'Write my email', exact: true }).click()
  assert.equal(await page.locator('h1:visible').innerText(), 'Review and send')
  const letter = await page.getByLabel('Email message').inputValue()
  assert.match(letter, /November 2026/)
  assert.match(letter, /service adjustment is not explained/)
  assert.match(letter, /called on November 6/)
  await page.getByLabel('Email message').fill('My manually edited fictional email.')
  await step(page, 1)
  await step(page, 4)
  assert.equal(await page.getByLabel('Email message').inputValue(), 'My manually edited fictional email.')
})
test('issue-specific choices and prompts adapt; report then Other remain last', async t => {
  const page = await open(t)
  const choices = page.locator('[data-issue]')
  assert.deepEqual(await choices.allTextContents(), ['Current advisory', 'Bill or charge', 'Service interruption / low pressure', 'Water-quality concern', 'Ask about a water report', 'Other issue'])
  for (const [issue, prompt] of [['service', /pressure|interruption/i], ['quality', /smell|appearance/i], ['report', /year|page/i], ['advisory', /notice|advisory/i], ['other', /happened/i]]) {
    await page.locator(`[data-issue="${issue}"]`).click()
    assert.match(await page.locator('#issue-detail').getAttribute('placeholder'), prompt)
    await step(page, 2)
    assert.equal(await page.getByLabel('Which bill?').count(), 0)
    await step(page, 1)
  }
})
test('every contact, file, download and record action is simulated without persistence', async t => {
  const page = await open(t)
  await step(page, 3)
  await page.getByRole('button', { name: 'Add photo or document', exact: true }).click()
  assert.match(await page.locator('#feedback').innerText(), /no file|not uploaded/i)
  await step(page, 4)
  for (const label of ['Open in email app', 'Copy email', 'Call', 'Record it']) {
    await page.getByRole('button', { name: label, exact: true }).click()
    assert.match(await page.locator('#feedback').innerText(), /preview|simulated/i)
  }
  await page.getByText('Downloads and tools', { exact: true }).click()
  await page.getByRole('button', { name: 'Download email', exact: true }).click()
  assert.match(await page.locator('#feedback').innerText(), /preview|simulated/i)
  assert.equal(await page.locator('a[href^="mailto:"],a[href^="tel:"],form,input[type="file"]').count(), 0)
  assert.deepEqual(await page.evaluate(() => [localStorage.length, sessionStorage.length]), [0, 0])
})
test('desktop, embedded phone preview and real phone preserve reading order without overflow', async t => {
  for (const width of [1440, 390, 320]) {
    const page = await open(t, width)
    for (let number = 1; number <= 4; number++) {
      await step(page, number)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `step ${number} fits ${width}`)
      const columns = page.locator('.screen:visible .columns > *')
      const left = await columns.nth(0).boundingBox(), right = await columns.nth(1).boundingBox()
      if (width < 768) assert.ok(right.y >= left.y + left.height, 'left column reads first on phone')
      else assert.ok(right.x > left.x + left.width, 'two columns on desktop')
    }
    if (width === 1440) {
      await page.getByRole('button', { name: 'Phone preview', exact: true }).click()
      assert.ok((await page.locator('#prototype').boundingBox()).width <= 414)
      const columns = page.locator('.screen:visible .columns > *')
      assert.ok((await columns.nth(1).boundingBox()).y > (await columns.nth(0).boundingBox()).y)
    }
  }
})
