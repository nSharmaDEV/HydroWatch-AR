import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addInitScript(() => {
    localStorage.setItem('water-alert:mode', 'sample')
    localStorage.setItem('water-alert:sample:v1', JSON.stringify({ language: 'en', watches: [] }))
  })
  await context.route('**/*', route => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort())
  await page.goto('/tests/e2e/components.html?mode=carousel')
})

const offset = (el: Element) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41
const aligned = (el: Element) => Math.abs(el.getBoundingClientRect().left - el.closest('.carousel-viewport')!.getBoundingClientRect().left)

test('drag follows the pointer, a held short drag returns, and a fast flick advances', async ({ page }) => {
  const track = page.locator('.carousel-track')
  const box = (await page.getByText('First utility', { exact: true }).boundingBox())!
  const x = box.x + box.width * .65, y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 32, y, { steps: 4 })
  expect(await track.evaluate(offset)).toBeCloseTo(-32, 0)
  await expect(page.getByText('1 of 2 places')).toBeVisible()
  await page.waitForTimeout(150) // A held drag has no release momentum.
  await page.mouse.up()
  await expect.poll(() => track.evaluate(offset)).toBeGreaterThan(-.5)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 80, y, { steps: 3 })
  await page.mouse.up()
  await expect(page.getByText('2 of 2 places')).toBeVisible()
  await expect.poll(() => page.locator('.carousel-slide').nth(1).evaluate(aligned)).toBeLessThan(1)
})

test('vertical gestures, form controls and cancelled drags do not change the utility', async ({ page }) => {
  const track = page.locator('.carousel-track')
  const heading = (await page.getByText('First utility', { exact: true }).boundingBox())!
  const x = heading.x + heading.width / 2, y = heading.y + heading.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 10, y + 65, { steps: 4 })
  await page.mouse.up()
  expect(await track.evaluate(offset)).toBe(0)
  const input = (await page.getByLabel('Resident text').boundingBox())!
  await page.mouse.move(input.x + input.width * .8, input.y + input.height / 2)
  await page.mouse.down()
  await page.mouse.move(input.x + 10, input.y + input.height / 2)
  await page.mouse.up()
  expect(await track.evaluate(offset)).toBe(0)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 100, y)
  await track.dispatchEvent('pointercancel', { pointerId: 1 })
  await expect.poll(() => track.evaluate(offset)).toBeGreaterThan(-.5)
  await expect(page.getByText('1 of 2 places')).toBeVisible()
  // A cancellation must not leave a stale click guard blocking keyboard users.
  const action = page.getByRole('button', { name: 'First card action' })
  await action.evaluate(el => el.addEventListener('click', () => el.setAttribute('data-activated', 'yes')))
  await action.focus()
  await page.keyboard.press('Enter')
  await expect(action).toHaveAttribute('data-activated', 'yes')
  await page.mouse.up()
})

test('real touch follows the finger and settles on the next card', async ({ page, context }) => {
  const box = (await page.getByText('First utility', { exact: true }).boundingBox())!
  const x = box.x + box.width * .8, y = box.y + box.height / 2
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - box.width * .4, y }] })
  expect(await page.locator('.carousel-track').evaluate(offset)).toBeLessThan(-box.width * .3)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByText('2 of 2 places')).toBeVisible()
  await expect.poll(() => page.locator('.carousel-slide').nth(1).evaluate(aligned)).toBeLessThan(1)
})

test('outer edges stay rigid without rubber-banding', async ({ page }) => {
  const track = page.locator('.carousel-track')
  const box = (await page.getByText('First utility', { exact: true }).boundingBox())!
  const x = box.x + 12, y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 100, y, { steps: 4 })
  const pulled = await track.evaluate(offset)
  expect(pulled).toBe(0)
  await page.mouse.up()
  await expect.poll(() => track.evaluate(offset)).toBeLessThan(.1)
  await expect(page.getByText('1 of 2 places')).toBeVisible()
})

test('vertical touch still scrolls the page without moving cards', async ({ page, context }) => {
  await page.evaluate(() => { document.body.style.minHeight = '3000px'; document.querySelector('main')!.style.paddingTop = '300px' })
  const box = (await page.getByText('First utility', { exact: true }).boundingBox())!
  const x = box.x + box.width * .7, y = box.y + box.height / 2
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 24 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50)
  expect(await page.locator('.carousel-track').evaluate(offset)).toBe(0)
  await expect(page.getByText('1 of 2 places')).toBeVisible()
})

test('button reversal retargets the moving panel without a position jump', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Next place' }).click()
  const positions = await page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    const track = document.querySelector<HTMLElement>('.carousel-track')!
    const before = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41
    document.querySelector<HTMLButtonElement>('[aria-label="Previous place"]')!.click()
    const after = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41
    return { before, after }
  })
  expect(positions.before).toBeLessThan(0)
  expect(positions.after).toBe(positions.before)
  await expect.poll(() => page.locator('.carousel-slide').first().evaluate(aligned)).toBeLessThan(.1)
})

test('utility panels stay adjoining without a moving gutter', async ({ page }) => {
  const separation = await page.locator('.carousel-track').evaluate(el => {
    const slides = el.querySelectorAll('.carousel-slide')
    return slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().right
  })
  expect(separation).toBe(0)
})

test('the next utility does not peek into the viewport at rest', async ({ page }) => {
  const overlap = await page.locator('.carousel-viewport').evaluate(el =>
    el.getBoundingClientRect().right - el.querySelectorAll('.carousel-slide')[1].getBoundingClientRect().left)
  expect(overlap).toBeLessThanOrEqual(0)
})

test('button transition follows the measured Spaces gesture and reaches a defined stop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.clock.install({ time: new Date('2026-11-07T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-11-07T00:00:01Z'))
  const step = await page.locator('.carousel-track').evaluate(el => {
    const slides = el.querySelectorAll('.carousel-slide')
    return slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().left
  })
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('[aria-label="Next place"]')!.click())
  // Video text-patch measurements at ~100/167/267/367/467ms.
  // Allow one browser frame plus the filmed reference's measurement uncertainty.
  let elapsed = 0
  for (const [ms, progress] of [[100, .296], [167, .582], [267, .833], [367, .953], [467, .991]]) {
    await page.clock.runFor(ms - elapsed)
    elapsed = ms
    const actual = (await page.locator('.carousel-track').evaluate(offset)) / -step
    expect(Math.abs(actual - progress)).toBeLessThan(.07)
  }
  await page.clock.runFor(133)
  expect(await page.locator('.carousel-track').evaluate(offset)).toBe(-step)
  await page.clock.runFor(500)
  expect(await page.locator('.carousel-track').evaluate(offset)).toBe(-step)
})

test('reduced motion snaps immediately when a button is pressed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const difference = await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[aria-label="Next place"]')!.click()
    const slide = document.querySelectorAll('.carousel-slide')[1]
    return Math.abs(slide.getBoundingClientRect().left - document.querySelector('.carousel-viewport')!.getBoundingClientRect().left)
  })
  expect(difference).toBeLessThan(.1)
})
