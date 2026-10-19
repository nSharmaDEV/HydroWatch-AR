// Reproduce the supplied logo's header and wave-only icons, without network assets.
import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
const source = await readFile(new URL('../assets/wave-logo-source.png', import.meta.url))
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const assets = await page.evaluate(async dataUrl => {
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    function extract(waveOnly) {
      const canvas = document.createElement('canvas')
      canvas.width = image.width; canvas.height = image.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let left = image.width, top = image.height, right = -1, bottom = -1
      for (let i = 0; i < pixels.data.length; i += 4) {
        const [r, g, , alpha] = pixels.data.subarray(i, i + 4)
        // Drop faint export speckles; separate teal waves from navy lettering.
        if (alpha < 32 || (waveOnly && !(g > 75 && g > r * 1.25))) { pixels.data[i + 3] = 0; continue }
        const x = (i / 4) % image.width, y = Math.floor(i / 4 / image.width)
        left = Math.min(left, x); right = Math.max(right, x)
        top = Math.min(top, y); bottom = Math.max(bottom, y)
      }
      if (right < left) throw new Error('No logo pixels found')
      ctx.putImageData(pixels, 0, 0)
      const cropped = document.createElement('canvas')
      cropped.width = right - left + 1; cropped.height = bottom - top + 1
      cropped.getContext('2d').drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
      return cropped
    }
    const logo = extract(false), wave = extract(true)
    const outputs = { 'wave-logo.png': logo.toDataURL('image/png') }
    for (const [size, name] of [[32, 'icon-32.png'], [192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size)
      // Keep the artwork inside the central maskable safe zone.
      const width = size * 0.76, height = width * wave.height / wave.width
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(wave, (size - width) / 2, (size - height) / 2, width, height)
      outputs[name] = canvas.toDataURL('image/png')
    }
    return outputs
  }, `data:image/png;base64,${source.toString('base64')}`)
  for (const [name, dataUrl] of Object.entries(assets)) {
    await writeFile(new URL(`../public/${name}`, import.meta.url), Buffer.from(dataUrl.split(',')[1], 'base64'))
  }
  await page.close()
} finally { await browser.close() }
