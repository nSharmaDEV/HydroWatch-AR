// Manually verified against the official HAB page on 2026-10-14.
// General agency guidance, not a reason for any particular feed record.
// English source quotations stay verbatim in both interface languages.
export const ADEQ_GUIDANCE = {
  url: 'https://adeq.state.ar.us/water/planning/hab/default.aspx',
  verifiedAt: '2026-10-14',
  absence: 'A water body with no HAB advisory is not an indication that a bloom is not present. Blooms are unpredictable. They can develop rapidly and may move across a water body due to wind or water current. If you suspect that a water body is experiencing a harmful algal bloom, it is best to avoid.',
  suspected: 'If you suspect a harmful algae bloom is present in this water body, keep children and pets away, avoid contact, and report it.',
  contact: 'Avoid direct contact with water, and wash with clean water after any contact',
  medical: 'Contact a medical professional if the person or animal exposed begins to experience:',
  symptoms: ['Abdominal pain', 'Nausea', 'Vomiting', 'Rashes', 'Diarrhea', 'Respiratory issues', 'Numbness', 'Muscle twitching/loss of control', 'Salivation', 'Incoherent speech'],
  bloom: { phone: '(501) 682-0744', form: 'https://adeq.state.ar.us/complaints/' },
  illness: { phone: '(501) 280-4168', email: 'adh.ep.its@arkansas.gov' },
} as const

export const adeqEn = {
  unknownLiftShort: '“N/A” is excluded from ADEQ’s current table. Status is unconfirmed; no new/lifted alerts for this record.',
  unknownLiftDate: 'Not provided — record reads “N/A”',
  observationMeaning: 'An observation means the row was in the retrieved feed, not that the agency reconfirmed the advisory.',
  guidanceVerbatim: 'Verbatim quotations from ADEQ’s HAB page in English, not advice written by this app. General guidance, not a per-advisory reason.',
  guidanceMore: 'Contact, symptoms and reporting',
  guidanceSource: 'ADEQ HAB guidance', guidanceVerified: 'Verified against the official page',
  bloomContact: 'Report a new bloom — DEQ', bloomForm: 'HAB Bloom Report Form', illnessContact: 'Possible algae bloom illness — ADH',
}
export const adeqEs = {
  unknownLiftShort: 'ADEQ excluye los registros con “N/A” de su tabla actual. Estado sin confirmar; sin avisos nuevos ni de levantamiento para este registro.',
  unknownLiftDate: 'No proporcionado — el registro indica “N/A”',
  observationMeaning: 'Una observación significa que el registro estaba en la fuente recuperada, no que la agencia haya reconfirmado el aviso.',
  guidanceVerbatim: 'Citas textuales de la página de ADEQ sobre algas nocivas en inglés, no consejos escritos por esta app. Instrucciones generales, no un motivo específico del aviso.',
  guidanceMore: 'Contacto, síntomas y reportes',
  guidanceSource: 'Instrucciones de ADEQ sobre algas nocivas', guidanceVerified: 'Verificado en la página oficial',
  bloomContact: 'Reportar una nueva proliferación — DEQ', bloomForm: 'Formulario de reporte de algas nocivas', illnessContact: 'Posible enfermedad por algas — ADH',
}
