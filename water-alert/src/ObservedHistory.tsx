import type { Language, Notice, Place, SourceSnapshot } from './domain'
import { Icon } from './icons'
import type { Strings } from './strings'
import { ObservedSupplierMap } from './ObservedSupplierMap'
import { mapEn, mapEs } from './map-strings'

export function ObservedHistory({ archive, watches, coverageStart, t, language, places, sources, now, onSources, active = true }: {
  archive: Notice[]; watches: string[]; coverageStart: string | null; t: Strings; language: Language; places: Place[]; sources: SourceSnapshot[]; now: number; onSources?: () => void; active?: boolean;
  // Retained for callers of the previous history entry point; selection now stays in the workspace.
  onView?: (place: Place) => void; initialAll?: boolean
}) {
  const m = language === 'es' ? mapEs : mapEn
  return <>
    <div className="advisory-map-heading"><h1>{m.heading}</h1><button className="map-info" aria-label={t.sources} onClick={onSources}><Icon name="info" size={24} /></button></div>
    <ObservedSupplierMap archive={archive} watches={watches} places={places} sources={sources} now={now} t={t} language={language} coverageStart={coverageStart} active={active} />
  </>
}
