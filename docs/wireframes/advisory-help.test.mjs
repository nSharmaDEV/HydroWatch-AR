// Static preview only. Serve the repository root on port 8771 before running.
// Run: node docs/wireframes/advisory-help.test.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../water-alert/package.json', import.meta.url))
const { chromium } = require('playwright')
const browser = await chromium.launch()
try {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.WIREFRAME_URL || 'http://127.0.0.1:8771/docs/wireframes/advisory-help.html')
  assert.equal(await page.locator('#draft-body').count(), 1, 'Missing editable draft toolkit')
  for (const kind of ['request', 'followup', 'complaint', 'legal']) {
    await page.selectOption('#draft-kind', kind)
    const text = await page.inputValue('#draft-body')
    assert.ok(text.includes('SAMPLE CREEK'), 'Draft must identify synthetic notice')
    assert.ok(text.includes('[YOUR'), 'User facts must remain editable placeholders')
    assert.ok(!text.includes('you owe me'), 'No presumed liability')
  }
  await page.locator('#draft-body').fill('My reviewed draft: $25, not an admission.\nRésumé & receipts.')
  await page.click('[data-action="copy-draft"]')
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'My reviewed draft: $25, not an admission.\nRésumé & receipts.')
  assert.ok((await page.locator('#draft-status').innerText()).includes('Copied'))
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => { throw new Error('Permission denied') }
  })
  await page.click('[data-action="copy-draft"]')
  assert.ok((await page.locator('#draft-status').innerText()).includes('Copy unavailable'))
  assert.equal(await page.evaluate(() => document.activeElement.id), 'draft-body')
  assert.equal(await page.evaluate(() => {
    const editor = document.getElementById('draft-body')
    return editor.selectionEnd - editor.selectionStart
  }), (await page.inputValue('#draft-body')).length)
  await page.selectOption('#draft-kind', 'request')
  await page.selectOption('#draft-kind', 'legal')
  assert.ok((await page.inputValue('#draft-body')).startsWith('My reviewed draft'), 'Edits must survive template switching')
  const downloadReady = page.waitForEvent('download')
  await page.click('[data-action="download-packet"]')
  const download = await downloadReady
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const packet = Buffer.concat(chunks).toString('utf8')
  assert.ok(packet.includes('My reviewed draft'))
  assert.ok(packet.includes('https://arkansasag.gov/file-a-complaint/'))
  assert.ok(packet.includes('CHECKLIST'))
  assert.ok(packet.includes('not proof of personal loss'))
  assert.ok(!packet.includes('LEISUREHILLSWATERCO'), 'No real provider destination in synthetic preview')
  const draftDownloadReady = page.waitForEvent('download')
  await page.click('[data-action="download-draft"]')
  const draftDownload = await draftDownloadReady
  const draftStream = await draftDownload.createReadStream()
  const draftChunks = []
  for await (const chunk of draftStream) draftChunks.push(chunk)
  assert.equal(Buffer.concat(draftChunks).toString('utf8'), 'My reviewed draft: $25, not an admission.\nRésumé & receipts.')
  await page.selectOption('#scenario', 'never')
  const uncheckedDraft = await page.inputValue('#draft-body')
  assert.ok(uncheckedDraft.includes('No incident record'))
  assert.ok(!uncheckedDraft.includes('3:12:14'), 'Unchecked source must not invent an incident')
  await page.locator('#draft-body').fill('<img src=x onerror="alert(1)">')
  await page.selectOption('#scenario', 'active')
  await page.selectOption('#scenario', 'never')
  assert.equal(await page.inputValue('#draft-body'), '<img src=x onerror="alert(1)">')
  assert.equal(await page.locator('.draft-toolkit img').count(), 0, 'Reviewed text must not become HTML')
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const language of ['en', 'es']) {
      await page.selectOption('#language', language)
      for (const scenario of ['active', 'failed', 'stale', 'never', 'none', 'lifted', 'historical', 'sample', 'hab']) {
        await page.selectOption('#scenario', scenario)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${width}/${language}/${scenario}`)
        if (scenario === 'hab') assert.equal(await page.locator('#draft-body,.recovery,.guidance').count(), 0)
        assert.equal(await page.locator('a[href^="mailto:"],a[href^="tel:"],input[type="file"]').count(), 0)
      }
    }
  }
  assert.deepEqual(errors, [])
  console.log('PASS: editable templates, preserved edits, real clipboard copy, packet download, privacy/sample/HAB gates and responsive EN/ES preview.')
} finally {
  await browser.close()
}
