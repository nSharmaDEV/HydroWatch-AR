/** Offline refresh: --cache /absolute/path [--download] [--write]. Raw files stay outside git.
 * Without --download, regenerates strictly from pinned cached inputs; never calls live APIs.
 * --write is explicit; default prints the reconciliation and candidate audit only.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { buildZipIndex } from './zip-index-lib.js'
import type { Feature, Polygon, MultiPolygon } from 'geojson'

const args = process.argv.slice(2), cacheArg = args[args.indexOf('--cache') + 1]
if (!args.includes('--cache') || !cacheArg || cacheArg.startsWith('--')) throw new Error('Supply --cache /absolute/path outside the repository')
const cache = resolve(cacheArg), root = resolve(import.meta.dirname, '..')
if (cache === root || cache.startsWith(`${root}/`)) throw new Error('Raw source cache must be outside water-alert/')
await mkdir(cache, { recursive: true })
const EPA = 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/Water_System_Boundaries/FeatureServer/0'
const CENSUS = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1'
const INVENTORY = 'https://data.epa.gov/efservice/WATER_SYSTEM/PRIMACY_AGENCY_CODE/AR/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/ROWS/0:4999/JSON'
type Shape = Feature<Polygon | MultiPolygon>
async function json(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(180_000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`)
  const value = await r.json()
  if (value.error) throw new Error(JSON.stringify(value.error))
  return value
}
async function queryAll(url: string, filter: Record<string, string>, field: string): Promise<Shape[]> {
  const features: Shape[] = []
  const count = await json(`${url}/query?${new URLSearchParams({ ...filter, returnCountOnly: 'true', f: 'json' })}`)
  for (let offset = 0; ; offset += 100) {
    const parameters = new URLSearchParams({ ...filter, outFields: '*', returnGeometry: 'true', outSR: '4326', f: 'geojson', orderByFields: field, resultOffset: String(offset), resultRecordCount: '100' })
    const page = await json(`${url}/query?${parameters}`)
    if (!Array.isArray(page.features)) throw new Error('Source did not return features')
    features.push(...page.features)
    if (page.features.length < 100) break
    if (offset > 5000) throw new Error('Unexpected source count')
  }
  if (features.length !== count.count) throw new Error(`Incomplete ${url}: expected ${count.count}, received ${features.length}`)
  return features
}
if (args.includes('--download')) {
  // State primacy, not city/county boundaries. ZCTA envelope includes the complete Arkansas
  // boundary extent and adjacent ZIP areas. Entire intersecting ZCTA polygons are fetched.
  const boundaries = await queryAll(EPA, { where: "Primacy_Agency='AR'" }, 'OBJECTID')
  const zctas = await queryAll(CENSUS, { where: '1=1', geometry: '-94.7,32.9,-89.5,36.6', geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects' }, 'OBJECTID')
  const inventory = await json(INVENTORY)
  const epaMetadata = await json(`${EPA}?f=pjson`), censusMetadata = await json(`${CENSUS}?f=pjson`)
  const terms = await json('https://epa.maps.arcgis.com/sharing/rest/content/items/80c6912ef14f46e480f5afd807767b4b?f=json')
  if (boundaries.length < 600 || zctas.length < 500 || !Array.isArray(inventory) || inventory.length < 600) throw new Error('Unexpected source counts; refusing partial download')
  for (const [name, value] of Object.entries({ boundaries, zctas, inventory, metadata: { checkedOn: new Date().toISOString().slice(0, 10), epaMetadata, censusMetadata, licenseInfo: terms.licenseInfo, itemModified: terms.modified } })) {
    await writeFile(resolve(cache, `${name}.json`), JSON.stringify(value))
  }
}
const load = async (name: string) => JSON.parse(await readFile(resolve(cache, `${name}.json`), 'utf8'))
const [boundaries, zctas, inventory, metadata] = await Promise.all(['boundaries', 'zctas', 'inventory', 'metadata'].map(load))
const directory = JSON.parse(await readFile(new URL('../src/directory/epa-water-systems.json', import.meta.url), 'utf8'))
const current = new Set(inventory.map((s: { pwsid: string }) => s.pwsid))
const staleDirectory = directory.systems.filter((s: { pwsid: string }) => !current.has(s.pwsid))
const directoryIds = new Set(directory.systems.map((s: { pwsid: string }) => s.pwsid))
const newIds = [...current].filter(id => !directoryIds.has(id))
if (current.size !== inventory.length || staleDirectory.length || newIds.length) throw new Error(`Refresh/review the base directory first: ${JSON.stringify({ staleDirectory, newIds, inventoryRows: inventory.length, uniqueIds: current.size })}`)
function checkEnvelope(coordinates: number[] | unknown[]) {
  if (typeof coordinates[0] === 'number') {
    const [x, y] = coordinates as number[]
    if (x < -94.7 || x > -89.5 || y < 32.9 || y > 36.6) throw new Error('EPA geometry exceeds the ZCTA query envelope; expand and redownload ZCTAs')
  } else for (const child of coordinates) checkEnvelope(child as unknown[])
}
for (const f of boundaries) checkEnvelope(f.geometry.coordinates)
const generated = buildZipIndex(boundaries, zctas, directory.systems, inventory.filter((s: { is_wholesaler_ind: string }) => s.is_wholesaler_ind === 'Y').map((s: { pwsid: string }) => s.pwsid))
const hashes = Object.fromEntries(await Promise.all(['boundaries', 'zctas', 'inventory', 'metadata'].map(async name => [name, createHash('sha256').update(await readFile(resolve(cache, `${name}.json`))).digest('hex')])))
const { audit, ...index } = generated
const provenance = { checkedOn: metadata.checkedOn, directoryCheckedOn: directory.checkedOn, epa: EPA, census: CENSUS, inventory: INVENTORY, epaDataLastEdit: metadata.epaMetadata.editingInfo?.dataLastEditDate, censusGeography: metadata.censusMetadata.description, hashes, directoryHash: createHash('sha256').update(await readFile(new URL('../src/directory/epa-water-systems.json', import.meta.url))).digest('hex'), limitations: 'Polygon overlap, not household service confirmation. No claim of complete coverage. SDWIS reported ZIPs not included: same-quarter Arkansas ZIP-served completeness not established. Wholesaler flag does not imply wholesale-only.' }
const snapshot = { ...index, provenance }
console.log(JSON.stringify({ boundaryFeatures: boundaries.length, zctaFeatures: zctas.length, matchedSystems: Object.keys(generated.systems).length, populatedZips: Object.values(generated.zips).filter(v => v.length).length, ...generated.audit }, null, 2))
if (args.includes('--write')) {
  await writeFile(new URL('../src/directory/zip-suppliers.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`)
  const unmatchedBoundaries = boundaries.filter((f: Shape) => audit.unmatchedBoundaryIds.includes(f.properties!.PWSID)).map((f: Shape) => f.properties)
  await writeFile(new URL('../src/directory/zip-supplier-audit.json', import.meta.url), `${JSON.stringify({ provenance, boundaryFeatures: boundaries.length, zctaFeatures: zctas.length, ...audit, unmatchedBoundaries }, null, 2)}\n`)
}
