// Retained-component coverage, not a shipped application route. Reads are intercepted.
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { StatusCard } from '../../src/components'
import { ActiveHelpGuide } from '../../src/ActiveHelpGuide'
import { ProviderCarousel } from '../../src/ProviderCarousel'
import { en, es } from '../../src/strings'
import { samplePlaces, sampleNotices, sampleSources, SAMPLE_NOW } from '../../src/sample'
import type { Place, Notice, SourceSnapshot } from '../../src/domain'
import '../../src/styles.css'

const sample = localStorage.getItem('water-alert:mode') === 'sample'
const prefs = JSON.parse(localStorage.getItem(sample ? 'water-alert:sample:v1' : 'water-alert:live:v1') || '{}')
const language = prefs.language === 'es' ? 'es' : 'en'
document.documentElement.lang = language
const data: { places: Place[]; archive: Notice[]; sources: SourceSnapshot[] } = sample
  ? { places: samplePlaces.filter(p => prefs.watches?.includes(p.id)), archive: sampleNotices, sources: sampleSources() }
  : await fetch('/api/status').then(r => r.json())
function Fixture() {
  const [help, setHelp] = useState(false)
  const mode = new URLSearchParams(location.search).get('mode')
  const place = data.places[0]
  if (mode === 'carousel') return <main><ProviderCarousel language={language}>
    <article><label>Resident text<input defaultValue="Resident wording" /></label><label>Report year<select defaultValue="2025"><option>2025</option><option>2024</option></select></label><details><summary>Saved expansion</summary><p>Kept open</p></details><button>First card action</button></article>
    <article><button>Second card action</button></article>
  </ProviderCarousel></main>
  return <main>{help ? <ActiveHelpGuide place={place} notice={data.archive.find(n => n.placeId === place.id)} language={language} sample={sample} onBack={() => setHelp(false)} /> : <>
    {data.places.map(p => <StatusCard key={p.id} place={p} source={data.sources.find(s => s.agency === (p.kind === 'lake' ? 'ADEQ' : 'ADH'))} archive={data.archive} now={sample ? SAMPLE_NOW : Date.now()} language={language} t={language === 'es' ? es : en} sample={sample} onView={() => {}} onRefresh={() => {}} onHelp={mode === 'help' && p.kind === 'system' ? () => setHelp(true) : undefined} />)}
  </>}</main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
