// Exact supplier IDs from the ADH parser. Never match by town, county or fuzzy name.
// Directory phone fields checked against the named system on 2026-10-14.
// Email fields record their own source. EPA SDWIS federal water-system records
// are directory data only (never an advisory feed); PWS IDs match the ADH page
// IDs (ADH ID=569 is EPA AR0000569). Addresses are copied exactly as listed and
// never corrected or guessed. Named-staff addresses are allowed and labelled.
export type ContactSource = 'ADH' | 'EPA'
export interface EmailListing { email: string; source: ContactSource; url: string; checkedOn: string }
export interface ProviderContact {
  phone: string; dial: string; email?: string; sourceUrl: string; verifiedOn: string
  /** Provenance of `email`, when it differs from the phone directory check. */
  emailSource?: EmailListing
  /** `staff` = a named person's address listed by the directory; `general` = a shared inbox. */
  emailKind?: 'general' | 'staff'
  /** Other addresses published by a source that disagrees; shown, never used as a send target. */
  otherListings?: EmailListing[]
}
const adh = (id: string) => `https://health.arkansas.gov/Eng/WS.aspx?ID=${id}`
const epa = (pwsid: string) => `https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/${pwsid}/JSON`
export const PROVIDER_CONTACTS: Readonly<Record<string, ProviderContact>> = {
  // ADH page listed SUPERCLAIO@YAHOO.COM on 2026-11-08; EPA SDWIS lists the address below.
  'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf': { phone: '(479) 549-2158', dial: '+14795492158', email: 'LEISUREHILLSWATERCO@GMAIL.COM', sourceUrl: adh('747'), verifiedOn: '2026-10-14',
    emailSource: { email: 'LEISUREHILLSWATERCO@GMAIL.COM', source: 'EPA', url: epa('AR0000747'), checkedOn: '2026-11-08' }, emailKind: 'general',
    otherListings: [{ email: 'SUPERCLAIO@YAHOO.COM', source: 'ADH', url: adh('747'), checkedOn: '2026-11-08' }] },
  // ADH page lists TNYANDER@FAYETTEVILL-AR.GOV (missing "E"); EPA SDWIS lists the city domain spelling below.
  'ADH:d0d0e4d6d963087023a220d1e53cce5144fba15898034786ef95734647f08275': { phone: '(479) 575-8386', dial: '+14795758386', email: 'tnyander@fayetteville-ar.gov', sourceUrl: adh('569'), verifiedOn: '2026-10-14',
    emailSource: { email: 'tnyander@fayetteville-ar.gov', source: 'EPA', url: epa('AR0000569'), checkedOn: '2026-11-08' }, emailKind: 'staff' },
  // No email in either the ADH page or EPA SDWIS on 2026-11-08.
  'ADH:053f9d9a4da2a01c88521af3b90956c809eb8a96e3df0304ab4cfa8956163140': { phone: '(479) 751-5751', dial: '+14797515751', sourceUrl: adh('575'), verifiedOn: '2026-10-14' },
  'ADH:ee7fdb65f65842e938d8b03b2ad2316ae23a827ee37db5e36728540a52bf09b7': { phone: '(479) 621-1142', dial: '+14796211142', email: 'WATER@RWU.ORG', sourceUrl: adh('055'), verifiedOn: '2026-10-14',
    emailSource: { email: 'WATER@RWU.ORG', source: 'ADH', url: adh('055'), checkedOn: '2026-11-08' }, emailKind: 'general' },
  // ADH page and EPA SDWIS agree on 2026-11-08.
  'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb': { phone: '(479) 271-3140', dial: '+14792713140', email: 'pnewbill@bentonvillear.com', sourceUrl: adh('041'), verifiedOn: '2026-10-14',
    emailSource: { email: 'pnewbill@bentonvillear.com', source: 'ADH', url: adh('041'), checkedOn: '2026-11-08' }, emailKind: 'staff' },
}
