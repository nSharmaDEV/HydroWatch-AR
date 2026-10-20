import type { Language } from './domain'
import { LEISURE_HILLS_ID } from './annual-reports'

type Text = Record<Language, string>
interface ProviderProfile {
  systemId: string
  waterSource: Text
  systemType: Text
  sourceName: string
  population: string
  inspection: Text
  verifiedOn: string
  sourceUrl: string
  waterSummary: { intro: Text; name: string; url: string; label: Text }
}

const community = { en: 'Community system', es: 'Sistema comunitario' }
const purchased = { en: 'Purchased surface water', es: 'Agua superficial comprada' }
function purchasedProfile(systemId: string, population: string, inspection: Text, sourceName = 'BEAVER WATER DISTRICT'): ProviderProfile {
  const sourceUrl = `https://health.arkansas.gov/Eng/WS.aspx?ID=${systemId}`
  return { systemId, population, inspection, sourceName, waterSource: purchased, systemType: community, verifiedOn: '2026-10-19', sourceUrl,
    waterSummary: { intro: { en: 'Purchased surface water; the ADH directory lists', es: 'Agua superficial comprada; el directorio de ADH indica' }, name: 'Beaver Water District', url: sourceUrl, label: { en: 'ADH source-water listing', es: 'Fuentes de agua en el directorio de ADH' } },
  }
}

// Exact parser supplier IDs, never a name/county match. Directory facts are not
// readings or inspection findings. Preserve per-record verification dates.
export const PROVIDER_PROFILES: Readonly<Record<string, ProviderProfile>> = {
  [LEISURE_HILLS_ID]: {
    systemId: '747', waterSource: { en: 'Groundwater', es: 'Agua subterránea' }, systemType: community,
    sourceName: 'WELL #1', population: '113', inspection: { en: 'Feb 5, 2026', es: '5 de febrero de 2026' },
    verifiedOn: '2026-10-14', sourceUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=747',
    waterSummary: { intro: { en: 'Groundwater from one well in the', es: 'Agua subterránea de un pozo en el' }, name: 'Roubidoux Formation Aquifer', url: 'https://health.arkansas.gov/eng/d.aspx?P=747&YEAR=2025#page=1', label: { en: '2025 report, page 1', es: 'Informe de 2025, página 1' } },
  },
  'ADH:d0d0e4d6d963087023a220d1e53cce5144fba15898034786ef95734647f08275': purchasedProfile('569', '116398', { en: 'Nov 30, 2022', es: '30 de noviembre de 2022' }),
  'ADH:053f9d9a4da2a01c88521af3b90956c809eb8a96e3df0304ab4cfa8956163140': purchasedProfile('575', '100795', { en: 'Jan 24, 2023', es: '24 de enero de 2023' }),
  'ADH:ee7fdb65f65842e938d8b03b2ad2316ae23a827ee37db5e36728540a52bf09b7': purchasedProfile('055', '81443', { en: 'Aug 28, 2025', es: '28 de agosto de 2025' }),
  'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb': purchasedProfile('041', '51250', { en: 'Feb 29, 2024', es: '29 de febrero de 2024' }, 'HWY 102 MM; MOBERLY LANE MM; BEAVER WATER DISTRICT MM'),
}

export function providerProfile(placeId: string) { return Object.hasOwn(PROVIDER_PROFILES, placeId) ? PROVIDER_PROFILES[placeId] : undefined }
