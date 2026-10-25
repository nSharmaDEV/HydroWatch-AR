import type { IssueType } from './help-requests.js'
export const ISSUE_LABELS: Record<IssueType, [string, string]> = {
  advisory: ['Current advisory', 'Aviso actual'],
  billing: ['Bill or charge', 'Factura o cargo'],
  service: ['Service problem', 'Problema de servicio'],
  quality: ['Water quality', 'Calidad del agua'],
  other: ['Something else', 'Otra cosa'],
  legal: ['Legal help', 'Ayuda legal'],
}
export const QUESTIONS = {
  approximate: ['Are these dates approximate? (optional)', '¿Son fechas aproximadas? (opcional)'],
  frequency: ['How often does it happen? (optional)', '¿Con qué frecuencia ocurre? (opcional)'],
  observationLocation: ['Which locations, if different from those selected? (optional)', '¿Qué lugares, si difieren de los seleccionados? (opcional)'],
  advisoryService: ['Does your concern include a service problem?', '¿Tu inquietud incluye un problema de servicio?'],
  contacted: ['Have you already contacted the provider about this?', '¿Ya contactaste al proveedor sobre esto?'],
  contactDate: ['Approximate contact date (optional)', 'Fecha aproximada del contacto (opcional)'],
  contactMethod: ['Contact method (optional)', 'Medio de contacto (opcional)'],
  contactResponse: ['What were you told or what happened? (optional)', '¿Qué te dijeron o qué pasó? (opcional)'],
  chargeKind: ['What kind of bill problem?', '¿Qué tipo de problema de factura?'],
  billingPeriod: ['Billing period (optional)', 'Período de facturación (opcional)'],
  amount: ['Amount, if known (optional)', 'Importe, si lo sabes (opcional)'],
  charge: ['Which charge is in question? (optional)', '¿Qué cargo cuestionas? (opcional)'],
  tried: ['What have you already tried? (optional)', '¿Qué has intentado? (opcional)'],
  response: ['What would you like the provider to do? (optional)', '¿Qué te gustaría que hiciera el proveedor? (opcional)'],
  began: ['When did it begin? (optional)', '¿Cuándo comenzó? (opcional)'],
  ended: ['When did it end? (optional)', '¿Cuándo terminó? (opcional)'],
  ongoing: ['Is it ongoing? (optional)', '¿Continúa? (opcional)'],
  area: ['Affected area you know about (optional)', 'Zona afectada que conoces (opcional)'],
  noticed: ['When did you notice it? (optional)', '¿Cuándo lo notaste? (opcional)'],
} as const
export type AnswerKey = keyof typeof QUESTIONS
export function questionKeys(issue: IssueType): AnswerKey[] {
   return issue === 'billing' ? ['chargeKind', 'billingPeriod', 'amount', 'charge', 'tried', 'response']
    : issue === 'service' ? ['began', 'ongoing', 'ended', 'area', 'response']
    : issue === 'quality' ? ['noticed', 'ongoing', 'ended', 'response'] : issue === 'advisory' ? ['noticed', 'ongoing', 'ended', 'response'] : ['began', 'ongoing', 'ended', 'response']
}
