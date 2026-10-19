import type { Notice, Place } from './domain'
import { RECOVERY_RESOURCES } from './recovery-resources'

export type DraftKind = 'service' | 'request' | 'followup' | 'complaint' | 'legal'
export interface RecoveryDraft { subject: string; body: string }
export interface DraftInput { place: Place; notice?: Notice; sample: boolean }

export function noticeContext({ place, notice, sample }: DraftInput) {
  const label = sample ? 'SAMPLE — NOT A REAL CLAIM\n' : ''
  return `${label}Supplier: ${place.name}\n${notice ? `SAVED NOTICE REFERENCE — not proof of personal loss or current status\nRecord ID: ${notice.id}\nPublished area: ${notice.area}\nPublished reason: ${notice.reason || 'Not provided'}\nAgency issued: ${notice.issued || 'Not provided'}\nAgency lifted: ${notice.lifted || 'Not published in saved record'}\nSource: ${notice.url}\nFirst observed by app: ${notice.firstObservedAt || 'Not saved'}\nLast observed by app: ${notice.lastObservedAt || 'Not saved'}` : 'No incident record supplied. Do not claim an outage based on this screen.'}\nAgency dates do not establish when my service stopped or resumed.`
}

export function buildRecoveryDraft(input: DraftInput & { kind: DraftKind }): RecoveryDraft {
  const context = noticeContext(input)
  const ending = `\n\n${context}\n\n[YOUR NAME]\n[YOUR PREFERRED CONTACT]`
  switch (input.kind) {
    case 'service': return { subject: 'Question about my water service', body: `Hello,\n\nPlease confirm whether my service address is affected by the published notice.\nMy service address: [YOUR SERVICE ADDRESS].\nMy question: [WHAT YOU NEED TO KNOW].\n\nPlease provide current incident-specific instructions and a reference number for this inquiry.${ending}` }
    case 'request': return { subject: 'Request to review water-service credit / documented expenses', body: `Hello,\n\nI am a customer/resident at [YOUR SERVICE ADDRESS].\nMy own description of the service problem: [WHAT YOU EXPERIENCED].\nMy affected dates: [START / END OR STILL UNKNOWN].\n\nPlease review a bill credit and/or reimbursement of $[ACTUAL AMOUNT] for [EXPENSES]. I can provide copies of [RECEIPTS / BILL / CORRESPONDENCE]. I am asking for review, not stating that compensation is automatically owed.\n\nPlease send the applicable policy, claim instructions, any deadline, a reference number and your decision in writing. Please also confirm whether my address is affected and any incident-specific instructions.${ending}` }
    case 'followup': return { subject: 'Follow-up on water-service review request [CASE NUMBER]', body: `Hello,\n\nI contacted you on [DATE / METHOD] about [YOUR SERVICE PROBLEM] and requested [RESOLUTION]. My reference number is [CASE NUMBER OR NONE PROVIDED].\nYour response so far: [EXACT RESPONSE OR NO RESPONSE AS OF DATE].\n\nPlease provide a written update, the applicable policy and a decision on my request. Documented expenses requested for review: $[ACTUAL AMOUNT]. Supporting copies available: [LIST].${ending}` }
    case 'complaint': return { subject: 'Preparation for AG consumer complaint', body: `DRAFT FOR THE OFFICIAL AG FORM — NOT SUBMITTED\n\nBusiness complained about: [VERIFY LEGAL NAME / ADDRESS / PHONE].\nFacts in date order: [YOUR OWN EXPERIENCE AND DATES].\nProvider contact attempts: [DATES / METHODS / CASE NUMBERS].\nProvider response: [EXACT RESPONSE OR NO RESPONSE AS OF DATE].\nActual documented expenses: $[AMOUNT], supported by [RECEIPTS].\nResolution requested: [BILL CREDIT / REIMBURSEMENT REVIEW / WRITTEN RESPONSE].\nDocuments I will attach separately: [COPIES — NOT ORIGINALS].\n\nReview every statement. The AG shares complaints with the business; records may be public. Read the form's privacy and attorney/court-action mediation limitations.\nOfficial form: ${RECOVERY_RESOURCES.complaint}${ending}` }
    case 'legal': return { subject: 'Preparation for legal-help intake', body: `PREPARATION NOTES — NOT A FILED LAWSUIT\n\nI would like help understanding a water-service dispute.\nMy county and housing situation: [COUNTY / RENT / OWN / MOBILE-HOME PARK].\nWho bills me: [PROVIDER OR LANDLORD / PARK MANAGEMENT].\nWhat happened to me: [YOUR EXPERIENCE AND DATES].\nActual documented costs: $[AMOUNT].\nWhat I requested and the response: [DATES / REQUEST / RESPONSE].\nAny court papers or attorney already involved: [YES / NO / DETAILS].\n\nQuestions: Is there a claim? Who is the correct party? What deadlines or immunity rules apply? Is small claims appropriate? What court fees and service requirements apply?\nAn advisory is not proof of liability or injury.\nLegal help: ${RECOVERY_RESOURCES.legalHelp}\nHelpline: 1-800-952-9243 (eligibility and availability apply).${ending}` }
  }
}

export function draftText(draft: RecoveryDraft) { return `Subject: ${draft.subject}\n\n${draft.body}` }

export function buildPreparationPacket(input: DraftInput & { draft: RecoveryDraft }) {
  return `WATER ALERT — ${input.sample ? 'SAMPLE ' : ''}PREPARATION PACK — NOT SUBMITTED\n\nREVIEWED DRAFT\n${draftText(input.draft)}\n\nNOTICE CONTEXT\n${noticeContext(input)}\n\nCHECKLIST\n[ ] Verify provider, bill and service address privately\n[ ] Replace all bracketed fields and verify dates and statements\n[ ] Keep notice, bills, receipts and correspondence locally\n[ ] Ask provider for policy, deadline, reference number and written decision\n[ ] Check complaint privacy, jurisdiction and attorney/court-action restrictions\n[ ] Ask legal help about correct party, deadlines, immunity and court procedure\n[ ] Submit yourself through the appropriate official service\n\nEXPENSE LOG — actual documented costs, no automatic eligibility\nDate | Item | Amount | Receipt filename | Reason requested\n[DATE] | [ITEM] | [AMOUNT] | [FILE] | [REASON]\n\nCONTACT LOG\nDate | Organization/person | Method | Case number | Response | Next step\n[DATE] | [CONTACT] | [METHOD] | [CASE] | [RESPONSE] | [NEXT]\n\nREFERENCES — checked 2026-10-14; recheck before using\n${Object.entries(RECOVERY_RESOURCES).map(([name, url]) => `${name}: ${url}`).join('\n')}\n\nNothing was sent, filed or attached. An advisory is not proof of personal loss, liability or entitlement to money. General preparation, not legal advice. Protect your downloaded text.\n`
}

export function emailDraftUrl(email: string | undefined, draft: RecoveryDraft) {
  if (!email || /[\r\n]/.test(email)) return undefined
  const url = `mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
  // Conservative mail-client limit. Always retain copy/download fallbacks.
  return url.length <= 8000 ? url : undefined
}
