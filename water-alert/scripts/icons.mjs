// Reproduce the committed PWA PNGs from the existing local SVG, without network assets.
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch({ headless: true })
try {
  for (const [size, name] of [[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
    await page.setContent(`<style>body{margin:0;background:#087f83}svg{width:100vw;height:100vh;display:block}</style>${svg}`)
    await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname })
    await page.close()
  }
} finally { await browser.close() }
