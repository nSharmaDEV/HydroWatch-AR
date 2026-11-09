import { test, expect } from '@playwright/test'
import { SOURCES } from '../../src/domain'
import { LEISURE_HILLS_ID } from '../../src/annual-reports'

const at = '2026-11-08T12:00:00Z'
const place = { id: 'ADH:d1bf471be8487e1b4003bb2e98916593413537252b895fe5a05f3e68f29f081d', name: 'BULL SHOALS WATER SYSTEM', county: 'MARION', kind: 'system' }
const notice = { id: 'synthetic-motion-notice', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Synthetic motion test only', issued: '11/08/2026', lifted: null, url: SOURCES.ADH, lastObservedAt: at }

// UI-only synthetic reads; no live API, agency requests or mutations.
test.beforeEach(async ({ page, context, baseURL }) => {
  await page.clock.setFixedTime(new Date(at))
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== baseURL || route.request().method() !== 'GET') return route.abort()
    if (url.pathname === '/api/status') return route.fulfill({ json: { sources: [{ agency: 'ADH', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }, { agency: 'ADEQ', records: [], retrievedAt: at, lastSuccessAt: at, error: null }], archive: [notice], places: [place], coverageStart: at } })
    if (url.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (url.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false } })
    if (url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
  await page.goto('/')
  await expect(page.locator('.logo-intro')).not.toBeVisible()
})

test('map details preserve zoom and modal focus through exit', async ({ page }, info) => {
  await page.getByRole('navigation').getByRole('button', { name: 'Map', exact: true }).click()
  const map = page.getByRole('group', { name: 'Arkansas supplier map' })
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  const zoom = await map.getAttribute('viewBox')
  const marker = map.getByRole('button', { name: /BULL SHOALS/ })
  await marker.focus()
  await page.keyboard.press('Enter')
  const phone = info.project.name === 'phone-sized'
  const detail = phone ? page.getByRole('dialog') : page.getByRole('region', { name: place.name })
  await expect(detail.getByRole('cell', { name: notice.area, exact: true }).first()).toBeVisible()
  if (phone) {
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await page.keyboard.press('Escape')
    await expect(detail).not.toBeVisible()
    await expect(marker).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  } else await detail.getByRole('button', { name: /Back to results/ }).click()
  expect(await map.getAttribute('viewBox')).toBe(zoom)
})

test('provider information expansion does not repeatedly clear the water canvas', async ({ page }) => {
  test.setTimeout(60_000) // Four GPU-backed cycles plus deterministic-frame captures.
  await page.evaluate(id => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language: 'en', checkOnOpen: false })), LEISURE_HILLS_ID)
  await page.reload()
  await expect(page.locator('.logo-intro')).not.toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Places', exact: true }).click()
  const toggle = page.getByRole('button', { name: /^Provider information/ })
  await expect(toggle).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  await page.waitForTimeout(200) // Let the initial layout observer settle.
  await expect(page.locator('.home-water canvas')).toBeVisible()
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.home-water canvas')!
    canvas.dataset.resizes = '0'
    canvas.dataset.losses = '0'
    canvas.addEventListener('webglcontextlost', () => { canvas.dataset.losses = String(Number(canvas.dataset.losses) + 1) })
    for (const key of ['width', 'height'] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, key)!
      Object.defineProperty(canvas, key, { configurable: true, get() { return descriptor.get!.call(this) }, set(value: number) { canvas.dataset.resizes = String(Number(canvas.dataset.resizes) + 1); descriptor.set!.call(this, value) } })
    }
  })
  const finding = page.locator('.carousel-slide').first().locator('.supplier-finding')
  const baseline = await finding.boundingBox()
  expect(baseline).not.toBeNull()
  const originalTop = await finding.evaluate(el => el.getBoundingClientRect().top + scrollY)
  // Inspect a deterministic frame, rather than racing a busy GPU/browser worker.
  await toggle.evaluate(el => el.addEventListener('click', () => requestAnimationFrame(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect instanceof KeyframeEffect && animation.effect.target instanceof HTMLElement && animation.effect.target.closest('.supplier-card')) {
        animation.pause(); animation.currentTime = 200
      }
    }
  })))
  let previousResizes = 0
  for (const open of [true, false, true, false]) {
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', String(open))
    await expect.poll(() => page.locator('.provider-info-content').evaluate(el => el.getAnimations().some(a => a.playState === 'paused'))).toBe(true)
    const during = await finding.boundingBox()
    expect(during!.height).toBeCloseTo(baseline!.height, 0)
    expect(await finding.evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(originalTop, 0)
    const animatedProperties = await page.locator('.provider-info-content').evaluate(el => el.getAnimations().flatMap(animation => (animation.effect as KeyframeEffect).getKeyframes().flatMap(frame => Object.keys(frame))))
    expect(animatedProperties).toContain('height')
    if (!open) {
      const frames = await page.locator('.provider-info-content').evaluate(async el => {
        const card = el.closest<HTMLElement>('.supplier-card')!
        const heading = card.querySelector<HTMLElement>('.supplier-heading')!
        const status = card.querySelector<HTMLElement>('.supplier-finding')!
        const row = card.querySelector<HTMLElement>('.provider-info-header')!
        const animations = card.getAnimations({ subtree: true }).filter(a => a.playState === 'paused')
        const samples = []
        window.scrollTo(0, 0)
        const painted = (target: HTMLElement) => {
          const rect = target.getBoundingClientRect()
          return target.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
        }
        for (const time of [0, 120, 280, 450, 566]) {
          animations.forEach(animation => { animation.currentTime = time })
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
          samples.push({
            shellClip: getComputedStyle(card).clipPath,
            shellTransform: getComputedStyle(card).transform,
            headingPainted: painted(heading), statusPainted: painted(status),
            revealEdge: el.getBoundingClientRect().top,
            rowBottom: row.getBoundingClientRect().bottom,
            cardHeight: card.getBoundingClientRect().height,
            panelHeight: el.getBoundingClientRect().height,
            followingTransform: getComputedStyle(card.querySelector('.alert-toggle')!).transform,
          })
        }
        return samples
      })
      for (const frame of frames) {
        expect(frame.shellClip).toBe('none')
        expect(frame.shellTransform).toBe('none')
        expect(frame.headingPainted).toBe(true)
        expect(frame.statusPainted).toBe(true)
        expect(frame.revealEdge).toBeCloseTo(frame.rowBottom, 0)
        expect(frame.followingTransform).toBe('none')
      }
      expect(frames[2].cardHeight).toBeLessThan(frames[0].cardHeight - 10)
      expect(frames.at(-1)!.panelHeight).toBeLessThan(1)
      for (const frame of frames) expect(frame.cardHeight - frame.panelHeight).toBeCloseTo(frames[0].cardHeight - frames[0].panelHeight, 0)
      await page.locator('.supplier-card').first().evaluate((el, height) => { el.dataset.lastClosingHeight = String(height) }, frames.at(-1)!.cardHeight)
      await page.screenshot({ path: test.info().outputPath('provider-collapse-final-frame.png') })
    }
    if (open && previousResizes === 0) await page.screenshot({ path: test.info().outputPath('provider-slide-midpoint.png') })
    await page.evaluate(() => document.getAnimations().forEach(animation => animation.play()))
    await page.waitForTimeout(750)
    const content = page.locator('.provider-info-content')
    if (open) await expect(content.getByRole('heading', { name: /^Annual report/ })).toBeVisible()
    else await expect(content).not.toBeVisible()
    if (!open) {
      const edge = await page.locator('.supplier-card').first().evaluate(el => ({ height: el.getBoundingClientRect().height, previous: Number((el as HTMLElement).dataset.lastClosingHeight) }))
      expect(Math.abs(edge.height - edge.previous)).toBeLessThan(1)
    }
    expect(await finding.evaluate(el => getComputedStyle(el.closest('.supplier-card')!).clipPath)).toBe('none')
    const resizes = Number(await page.locator('.home-water canvas').getAttribute('data-resizes'))
    expect(resizes - previousResizes).toBeLessThanOrEqual(2)
    previousResizes = resizes
  }
  expect(Number(await page.locator('.home-water canvas').getAttribute('data-resizes'))).toBeLessThanOrEqual(8)
  expect(await page.locator('.home-water canvas').getAttribute('data-losses')).toBe('0')
  await page.screenshot({ path: test.info().outputPath('provider-after-expansion.png') })
})

test('completed provider collapse never exposes its natural height again', async ({ page }) => {
  await page.evaluate(id => localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language: 'en', checkOnOpen: false })), LEISURE_HILLS_ID)
  await page.reload()
  await expect(page.locator('.logo-intro')).not.toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Places', exact: true }).click()
  const toggle = page.getByRole('button', { name: /^Provider information/ })
  await toggle.click()
  const panel = page.locator('.provider-info-content')
  await expect.poll(() => panel.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0)
  const result = await panel.evaluate(async el => {
    const panel = el as HTMLElement
    const releases: { hidden: boolean; height: number }[] = []
    const frames: number[] = []
    const original = panel.animate
    panel.animate = function (...args: Parameters<HTMLElement['animate']>) {
      const animation = original.apply(this, args)
      const cancel = animation.cancel.bind(animation)
      animation.cancel = () => { cancel(); releases.push({ hidden: panel.hidden, height: panel.getBoundingClientRect().height }) }
      return animation
    }
    try {
      panel.previousElementSibling!.querySelector<HTMLButtonElement>('button')!.click()
      const start = performance.now()
      await new Promise<void>(resolve => {
        const sample = () => {
          frames.push(panel.getBoundingClientRect().height)
          if (performance.now() - start < 1000) requestAnimationFrame(sample)
          else resolve()
        }
        requestAnimationFrame(sample)
      })
      return { releases, frames, hidden: panel.hidden }
    } finally { panel.animate = original }
  })
  expect(result.releases.length).toBeGreaterThan(0)
  for (const release of result.releases) { expect(release.hidden).toBe(true); expect(release.height).toBe(0) }
  expect(result.hidden).toBe(true)
  const collapsed = result.frames.findIndex(height => height < 1)
  expect(collapsed).toBeGreaterThanOrEqual(0)
  expect(result.frames.slice(collapsed).every(height => height < 1)).toBe(true)
})

test('unsupported snapshots still navigate without transforming live content', async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true }))
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  expect(await page.locator('main').evaluate(el => getComputedStyle(el).transform)).toBe('none')
})

test('navigation uses bounded snapshots and preserves stationary chrome', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  // Start from a tab with the shared header: Home collapses its navigation into a menu on phones.
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  const nav = page.getByRole('navigation')
  const before = await nav.boundingBox()
  await page.evaluate(() => {
    const start = document.startViewTransition.bind(document)
    document.startViewTransition = ((update: () => void) => {
      const transition = start(update)
      void transition.ready.then(() => { for (const animation of document.getAnimations()) { if (animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement) { animation.pause(); animation.currentTime = 120 } } })
      return transition
    }) as typeof document.startViewTransition
  })
  await nav.getByRole('button', { name: 'Places', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBe('tab')
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.effect instanceof KeyframeEffect && a.effect.pseudoElement?.includes('wave-content')).length)).toBeGreaterThan(0)
  const motion = await page.evaluate(() => document.getAnimations().filter(a => a.effect instanceof KeyframeEffect && a.effect.pseudoElement?.includes('wave-content')).map(a => a.effect!.getTiming().duration))
  expect(motion.length).toBeGreaterThan(0)
  expect(motion.every(duration => Number(duration) === 400)).toBe(true)
  await page.evaluate(() => { for (const animation of document.getAnimations()) { if (animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement) { animation.pause(); animation.currentTime = 120 } } })
  await page.screenshot({ path: test.info().outputPath('navigation-midpoint.png') })
  await page.evaluate(() => { for (const animation of document.getAnimations()) animation.play() })
  // Subsequent navigation should run normally, without the test's capture pause.
  await page.evaluate(() => { delete (document as unknown as { startViewTransition?: unknown }).startViewTransition })
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  expect(await nav.boundingBox()).toEqual(before)
  await nav.getByRole('button', { name: 'Settings', exact: true }).click()
  await nav.getByRole('button', { name: 'Home', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  expect(await page.locator('main').evaluate(el => el.style.viewTransitionName)).toBe('')
  expect(errors).toEqual([])
})

test('Home supplier search grows the hero wave into the search wave; tab changes do not', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  const stripGroups = () => page.evaluate(() => document.getAnimations().filter(a => a.effect instanceof KeyframeEffect && a.effect.pseudoElement === '::view-transition-group(wave-strip)').map(a => (a.effect as KeyframeEffect).getKeyframes().map(k => parseFloat(String(k.height)))))
  // Hold every snapshot animation at its start so the morph can be read before it finishes.
  await page.evaluate(() => {
    const start = document.startViewTransition.bind(document)
    document.startViewTransition = ((update: () => void) => {
      const transition = start(update)
      void transition.ready.then(() => { for (const animation of document.getAnimations()) { if (animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement) animation.pause() } })
      return transition
    }) as typeof document.startViewTransition
  })
  const hero = await page.locator('.wave-hero-water .welcome-strip svg').boundingBox()
  await page.getByRole('searchbox', { name: 'Search by supplier or county' }).fill('Bull')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveStrip)).toBe('')
  await expect.poll(async () => (await stripGroups()).length).toBe(1)
  const [heights] = await stripGroups()
  await page.evaluate(() => { for (const animation of document.getAnimations()) animation.play() })
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveStrip)).toBeUndefined()
  const search = await page.locator('.search-stage > .welcome-strip svg').boundingBox()
  expect(heights[0]).toBeCloseTo(hero!.height, 0)
  expect(heights.at(-1)).toBeCloseTo(search!.height, 0)
  expect(search!.height).toBeGreaterThan(hero!.height)
  // Leaving search (and ordinary tab changes) keeps the wave inside the page snapshot.
  await page.getByRole('navigation').getByRole('button', { name: 'Home', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBe('back')
  expect(await page.evaluate(() => document.documentElement.dataset.waveStrip)).toBeUndefined()
  expect(await stripGroups()).toEqual([])
  await page.evaluate(() => { for (const animation of document.getAnimations()) animation.play() })
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  expect(errors).toEqual([])
})

test('reduced motion skips snapshots and native disclosures stay keyboard operable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('navigation').getByRole('button', { name: 'Settings', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.dataset.waveMotion)).toBeUndefined()
  await page.getByRole('button', { name: /^Sources and coverage limits/ }).click()
  const summary = page.locator('main details summary').first()
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(summary.locator('..')).toHaveAttribute('open', '')
  await page.keyboard.press('Enter')
  await expect(summary.locator('..')).not.toHaveAttribute('open')
})
