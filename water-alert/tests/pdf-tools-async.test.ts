import { expect, test } from 'vitest'
import { runPdfTool } from '../server/pdf-tools'

test('a stalled PDF child times out without blocking other requests', async () => {
  let heartbeat = false
  const pending = runPdfTool(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], Buffer.from('%PDF-'), 100)
  await new Promise(resolve => setTimeout(() => { heartbeat = true; resolve(null) }, 10))
  expect(heartbeat).toBe(true)
  await expect(pending).rejects.toThrow()
})

test('PDF tools receive all input and close stdin', async () => {
  const output = await runPdfTool(process.execPath, ['-e', "let s=''; process.stdin.on('data', b => s+=b); process.stdin.on('end', () => process.stdout.write(s))"], Buffer.from('saved document'))
  expect(output).toBe('saved document')
})
