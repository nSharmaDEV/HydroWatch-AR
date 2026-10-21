// Optional authoring tool: requires local Potrace and Playwright Chromium, not runtime dependencies.
// Trace the existing artwork, never a substitute font. Run from water-alert/.
import { chromium } from '@playwright/test'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const temp = await mkdtemp(join(tmpdir(), 'wave-trace-'))
const browser = await chromium.launch()
try {
  const source = await readFile('public/wave-logo.png')
  const page = await browser.newPage()
  const masks = await page.evaluate(async data => {
    const image = new Image()
    image.src = data
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width; canvas.height = image.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data
    return ['dark', 'light', 'navy'].map(part => {
      const mask = []
      for (let i = 0; i < pixels.length; i += 4) {
        const [r, g, , a] = pixels.subarray(i, i + 4)
        const belongs = part === 'navy' ? g < 75 : part === 'light' ? r >= 25 && g >= 75 : r < 25 && g >= 75
        mask.push(a >= 128 && belongs ? 1 : 0)
      }
      return `P1\n${image.width} ${image.height}\n${mask.join(' ')}`
    })
  }, `data:image/png;base64,${source.toString('base64')}`)
  const groups = []
  for (const [index, part] of ['dark', 'light', 'navy'].entries()) {
    const input = join(temp, `${part}.pbm`), output = join(temp, `${part}.svg`)
    await writeFile(input, masks[index])
    execFileSync('potrace', [input, '-s', '-o', output, '--turdsize', '12', '--opttolerance', '0.3'])
    const svg = await readFile(output, 'utf8')
    // Potrace emits each connected component (including its counters) as one path.
    const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map(match => match[1].replace(/\s+/g, ' '))
      .sort((a, b) => Number(a.match(/^M\s*([-\d.]+)/)?.[1]) - Number(b.match(/^M\s*([-\d.]+)/)?.[1]))
    const color = { dark: '#007888', light: '#45cccd', navy: '#022759' }[part]
    const counts = { wave: 0, wellpower: 0, symbol: index * 2 }
    groups.push(...paths.map((d, i) => {
      // Potrace coordinates have y inverted; WAVE occupies the lower 230px.
      const startY = Number(d.match(/^M\s*[-\d.]+\s+([-\d.]+)/)?.[1] ?? 0)
      const section = part === 'navy' ? (startY < 2400 ? 'wave' : 'wellpower') : 'symbol'
      const order = counts[section]++
      const delay = section === 'wave' ? 800 + order * 200 : section === 'wellpower' ? 450 + order * 45 : 50 + order * 100
      return `<path data-part="${section}" data-order="${i}" data-draw-delay="${delay}" pathLength="1" fill="${color}" stroke="${color}" d="${d}"/>`
    }))
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 1846 432" aria-hidden="true" focusable="false">\n<!-- Contours traced from public/wave-logo.png; original proportions and outlined lettering. -->\n<g transform="translate(0 416) scale(.1 -.1)">\n${groups.join('\n')}\n</g>\n</svg>\n`
  await writeFile('assets/wave-logo-traced.svg', svg)
  console.log(`Traced ${groups.length} contours into assets/wave-logo-traced.svg`)
} finally {
  await browser.close()
  await rm(temp, { recursive: true, force: true })
}
