import type { Language, Notice } from './domain'
import { SourceLink } from './components'
import { SUPPLIER_LOCATIONS } from './supplier-locations'
import { ARKANSAS_OUTLINE_SOURCE } from './arkansas-outline'
import { mapEn, mapEs } from './map-strings'

export function MapSources({ language, archive }: { language: Language; archive: Notice[] }) {
  const m = language === 'es' ? mapEs : mapEn
  const pointLabels = { 'historical-polygon-centroid': m.mapCentroid, 'provider-office': m.mapOffice, 'provider-site': m.mapSite, 'recreation-site': m.mapRecreation }
  const observed = new Set(archive.filter(n => n.agency === 'ADH' && n.kind === 'boil').map(n => n.placeId))
  return <details className="map-attribution"><summary>{m.mapSources}</summary><p>{m.mapLimit}</p><p>{m.mapPointMeaning}</p><p>{m.mapMissing}</p>
    <p><SourceLink url={ARKANSAS_OUTLINE_SOURCE}>{m.mapOutline}</SourceLink></p><p><SourceLink url="https://gis.arkansas.gov/product/public-water-systems-polygon/">{m.mapPoints}</SourceLink></p>
    {SUPPLIER_LOCATIONS.filter(point => observed.has(point.placeId)).map(point => <div key={point.placeId}><p><SourceLink url={point.sourceUrl}>{archive.find(n => n.placeId === point.placeId)?.name}</SourceLink> — {m.mapVerified}: {point.verifiedAt}<br /><span>{pointLabels[point.pointMeaning]}</span><br />{m.mapSourceName}: {point.sourceName}</p>{point.identitySourceUrls?.map((url, i) => <p key={url}><SourceLink url={url}>{m.mapIdentity} ({i + 1}): {point.sourceName}</SourceLink></p>)}</div>)}
  </details>
}
