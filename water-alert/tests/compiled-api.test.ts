// @vitest-environment node
import { expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

it('loads the emitted API with native Node ESM and fails closed in Preview without touching the database', async () => {
  const directory = await mkdtemp(join(process.cwd(), '.compiled-api-'))
  try {
    await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }))
    const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', 'api/index.ts', '--outDir', directory, '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'Bundler', '--esModuleInterop', '--skipLibCheck', '--types', 'node'], { encoding: 'utf8' })
    expect(compile.status, compile.stdout + compile.stderr).toBe(0)
    const entry = pathToFileURL(join(directory, 'api/index.js')).href
    const code = `const { default: handler } = await import(${JSON.stringify(entry)}); let status; handler({}, { writeHead(value) { status = value }, end(body) { console.log(JSON.stringify({ status, body: JSON.parse(body) })) } });`
    const runtime = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: { PATH: process.env.PATH, VERCEL_ENV: 'preview' } })
    expect(runtime.status, runtime.stderr).toBe(0)
    expect(JSON.parse(runtime.stdout)).toEqual({ status: 503, body: { error: 'Cloud service is not configured' } })
  } finally { await rm(directory, { recursive: true, force: true }) }
}, 30_000)
