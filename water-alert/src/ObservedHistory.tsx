import type { Language, Notice, Place, SourceSnapshot } from './domain'
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
    <div className="advisory-map-heading"><h1>{m.heading}</h1><button className="map-info" aria-label={t.sources} onClick={onSources}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10v7M12 6v2" /></svg></button></div>
    <ObservedSupplierMap archive={archive} watches={watches} places={places} sources={sources} now={now} t={t} language={language} coverageStart={coverageStart} active={active} />
  </>
}
