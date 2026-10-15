// Exact supplier IDs from the ADH parser. Never match by town, county or fuzzy name.
// Directory phone/email fields checked against the named system on 2026-10-14.
interface ProviderContact { phone: string; dial: string; email?: string; sourceUrl: string; verifiedOn: string }
export const PROVIDER_CONTACTS: Readonly<Record<string, ProviderContact>> = {
  'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf': { phone: '(479) 549-2158', dial: '+14795492158', email: 'LEISUREHILLSWATERCO@GMAIL.COM', sourceUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=747', verifiedOn: '2026-10-14' },
  'ADH:d0d0e4d6d963087023a220d1e53cce5144fba15898034786ef95734647f08275': { phone: '(479) 575-8386', dial: '+14795758386', sourceUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=569', verifiedOn: '2026-10-14' },
  'ADH:053f9d9a4da2a01c88521af3b90956c809eb8a96e3df0304ab4cfa8956163140': { phone: '(479) 751-5751', dial: '+14797515751', sourceUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=575', verifiedOn: '2026-10-14' },
  'ADH:ee7fdb65f65842e938d8b03b2ad2316ae23a827ee37db5e36728540a52bf09b7': { phone: '(479) 621-1142', dial: '+14796211142', email: 'WATER@RWU.ORG', sourceUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=055', verifiedOn: '2026-10-14' },
  'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb': { phone: '(479) 271-3140', dial: '+14792713140', sourceUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=041', verifiedOn: '2026-10-14' },
}
