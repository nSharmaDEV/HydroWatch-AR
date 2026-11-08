import type { Language, Notice } from './domain'

// Deliberately NOT a Notice: historical documents cannot enter live source,
// status, polling or notification flows. Used only by SupplierAlertHistory.
export interface ImportedAdvisory {
  id: string;
  placeId: string;
  publisher: string;
  issued: string;
  lifted: string | null;
  area: string;
  reason: string;
  noticeUrl: string;
  liftUrl?: string;
  reviewedOn: string;
  identityUrl: string;
  discrepancy?: Record<Language, string>;
  // Only add IDs after reviewing evidence that the feed row is the same event.
  observedNoticeIds: readonly string[];
}

export const IMPORTED_ADVISORIES: readonly ImportedAdvisory[] = [{
  id: 'historical:rogers:2018-09-07:prairie-creek',
  placeId: 'ADH:ee7fdb65f65842e938d8b03b2ad2316ae23a827ee37db5e36728540a52bf09b7',
  publisher: 'ROGERS WATER UTILITIES',
  issued: 'September 7, 2018',
  lifted: 'September 10, 2018',
  area: 'FROM THE PRAIRIE CREEK AREA TO EAST OF THE HIGHWAY 12 BRIDGE OVER BEAVER LAKE. AREAS ALONG HIGHWAY 12 EAST OF DREAM VALLEY ROAD AND INCLUDING BEAVER SHORES AND AREAS IN AND AROUND PRAIRIE CREEK WERE ALSO AFFECTED. IF YOU EXPERIENCED A COMPLETE LOSS OF WATER FLOW YOU ARE IN THE AFFECTED AREA.',
  reason: 'THE BROKEN WATER MAIN RESULTED IN A LOSS OF SYSTEM PRESSURE IN THE AFFECTED AREA.',
  noticeUrl: 'https://www.rogersar.gov/CivicSend/ViewMessage/message/67337',
  liftUrl: 'https://www.rogersar.gov/CivicSend/ViewMessage/message/67530',
  reviewedOn: '2026-11-08',
  identityUrl: 'https://health.arkansas.gov/Eng/WS.aspx?ID=055',
  discrepancy: {
    en: 'Source discrepancy: The notice heading says September 7, 2018, but its repair paragraph says September 7, 2016. The official lift notice explicitly references the September 7, 2018 notice. Original wording is preserved.',
    es: 'Discrepancia en la fuente: El encabezado del aviso dice 7 de septiembre de 2018, pero el párrafo sobre la reparación dice 7 de septiembre de 2016. El aviso oficial de levantamiento hace referencia explícita al aviso del 7 de septiembre de 2018. Se conserva el texto original.',
  },
  observedNoticeIds: [],
}]

export interface SupplierHistoryEntry {
  record: Pick<Notice, 'id' | 'issued' | 'lifted' | 'area' | 'reason'>;
  observed?: Notice;
  imported?: ImportedAdvisory;
}

export function supplierHistory(placeId: string, observed: readonly Notice[], catalog: readonly ImportedAdvisory[] = IMPORTED_ADVISORIES): SupplierHistoryEntry[] {
  const imported = catalog.filter(n => n.placeId === placeId)
  const linkedIds = new Set(imported.flatMap(n => [...n.observedNoticeIds]))
  return [
    ...observed.filter(n => !linkedIds.has(n.id)).map(n => ({ record: n, observed: n })),
    ...imported.map(n => ({ record: n, imported: n })),
  ].sort((a, b) => (Date.parse(b.record.issued ?? '') || 0) - (Date.parse(a.record.issued ?? '') || 0))
}
