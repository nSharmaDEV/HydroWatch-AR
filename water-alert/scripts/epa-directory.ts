// Refresh the EPA SDWIS directory snapshot. Prints a diff for human review;
// writes only with --write. Directory data never becomes advisory status.
import { readFile, writeFile } from 'node:fs/promises'
import { diffDirectory, formatDiff, normalizeDirectory, type DirectorySnapshot, type EpaGeoRow, type EpaSystemRow } from './epa-directory-lib.js'

/** One system per line keeps reviewed git diffs readable. */
const serialize = (d: DirectorySnapshot) => `{"source":${JSON.stringify(d.source)},"checkedOn":${JSON.stringify(d.checkedOn)},"filter":${JSON.stringify(d.filter)},"systems":[\n${d.systems.map(s => JSON.stringify(s)).join(',\n')}\n]}\n`
const OUT = new URL('../src/directory/epa-water-systems.json', import.meta.url)
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`https://data.epa.gov/efservice/${path}`, { headers: { 'User-Agent': 'WAVE-directory-snapshot' } })
  if (!r.ok) throw new Error(`EPA ${r.status} for ${path}`)
  const value = await r.json()
  if (!Array.isArray(value)) throw new Error(`EPA returned a non-list for ${path}`)
  return value as T
}
const rows = await get<EpaSystemRow[]>('WATER_SYSTEM/PRIMACY_AGENCY_CODE/AR/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/ROWS/0:4999/JSON')
const geo = await get<EpaGeoRow[]>('GEOGRAPHIC_AREA/PRIMACY_AGENCY_CODE/AR/PWS_TYPE_CODE/CWS/AREA_TYPE_CODE/CN/ROWS/0:9999/JSON')
if (rows.length < 400 || rows.length >= 5000) throw new Error(`Unexpected EPA row count ${rows.length}; refusing to continue`)
const now = new Date(), checkedOn = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const next = normalizeDirectory(rows, geo, checkedOn)
const previous = await readFile(OUT, 'utf8').then(t => JSON.parse(t) as DirectorySnapshot).catch(() => undefined)
const diff = diffDirectory(previous, next)
console.log(formatDiff(diff))
if (previous && diff.removed.length > previous.systems.length * 0.1) throw new Error('More than 10% of systems disappeared; review EPA before writing')
if (process.argv.includes('--write')) { await writeFile(OUT, serialize(next)); console.log(`Wrote ${next.systems.length} systems to src/directory/epa-water-systems.json`) }
else console.log('Review the diff, then rerun with --write to save it.')
