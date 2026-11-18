// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { DIRECTORY } from '../src/water-system-directory'

const root = fileURLToPath(new URL('../', import.meta.url))

it('stages and resumes a real offline CLI run without changing app records or invoking AI', () => {
  const data = path.join(root, 'data')
  mkdirSync(data, { recursive: true })
  const temporary = mkdtempSync(path.join(data, 'ccr-cli-test-'))
  const modulePath = path.join(root, 'src/ai-annual-reports.ts')
  const before = readFileSync(modulePath, 'utf8')
  const system = DIRECTORY.systems.find(s => s.pwsid === 'AR0000124')!
  const bootstrap = path.join(temporary, 'fetch.mjs')
  const pdfPath = path.join(root, 'docs/research/adh-ccr-2025/pdfs/068.pdf')
  const search = '<input type="hidden" name="__VIEWSTATE" value="vs">'
  const results = `${search}<table><tr><td><a href="d.aspx?P=068&amp;YEAR=2025">${system.name}</a></td><td>${system.county}</td></tr></table>`
  writeFileSync(bootstrap, `import {readFileSync} from 'node:fs';
globalThis.fetch = async (input, init) => {
  if (String(input).endsWith('CCRSearch.aspx')) return new Response(init?.method === 'POST' ? ${JSON.stringify(results)} : ${JSON.stringify(search)});
  if (String(input).includes('d.aspx?P=068')) return new Response(readFileSync(${JSON.stringify(pdfPath)}));
  throw new Error('Unexpected network or paid AI request: ' + input);
};`)
  const args = ['--import', 'tsx', '--import', bootstrap, 'scripts/ccr-sync.ts', `--only=${system.pwsid}`, `--cache=${temporary}`]
  try {
    const first = execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 30_000 })
    expect(first).toContain('autoRead')
    const coverage = JSON.parse(readFileSync(path.join(temporary, 'coverage.json'), 'utf8'))
    expect(coverage.systems).toHaveLength(658)
    expect(coverage.systems.find((s: { pwsid: string }) => s.pwsid === system.pwsid).outcome).toBe('autoRead')
    const files = readdirSync(path.join(temporary, 'pdfs'))
    expect(files).toHaveLength(1)
    expect(readFileSync(path.join(temporary, 'pdfs', files[0])).subarray(0, 5).toString()).toBe('%PDF-')
    expect(readFileSync(path.join(temporary, 'candidate-reports.ts'), 'utf8')).toContain('"state": "autoRead"')
    // A resumed run must make no network calls at all.
    writeFileSync(bootstrap, `globalThis.fetch = async () => { throw new Error('Should resume without a request'); };`)
    const second = execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 30_000 })
    expect(second).not.toContain('search failed')
    expect(readFileSync(modulePath, 'utf8')).toBe(before)
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}, 40_000)
