import type { IssueType } from './help-requests'

/** Examples guide residents; none are inserted into their answers. */
const prompts: Partial<Record<IssueType, { description: [string, string]; action: [string, string]; tried: [string, string]; questions: [string, string] }>> = {
  billing: {
    description: ['Describe the charge as it appears on your bill, what seems wrong, and how it differs from your usual bill. Leave out full account or payment details.', 'Describe el cargo tal como aparece, qué parece incorrecto y cómo difiere de tu factura habitual. Omite datos completos de cuenta o pago.'],
    action: ['Explain which charge you want reviewed and what response would help: an itemized explanation, a correction if an error is found, or information about payment options.', 'Explica qué cargo quieres revisar y qué respuesta ayudaría: un desglose, una corrección si hay un error o información sobre opciones de pago.'],
    tried: ['If you contacted billing, include when, how, and what they told you. Mention a reference number if useful. Leave blank if you have not contacted anyone.', 'Si contactaste a facturación, indica cuándo, cómo y qué te dijeron. Incluye una referencia si ayuda. Déjalo vacío si aún no contactaste a nadie.'],
    questions: ['For example: What period does this charge cover? Can you explain the calculation in writing? What are the next steps while the charge is reviewed?', 'Por ejemplo: ¿Qué período cubre el cargo? ¿Pueden explicar el cálculo por escrito? ¿Cuáles son los próximos pasos durante la revisión?'],
  },
  service: {
    description: ['Describe where you noticed the interruption or low pressure, whether it comes and goes, and which taps are affected. Report only what you observed; do not guess the cause.', 'Describe dónde notaste la interrupción o baja presión, si es intermitente y qué grifos afecta. Indica solo lo que observaste; no adivines la causa.'],
    action: ['Describe the update you need, such as a restoration estimate, an explanation of the interruption, or instructions that apply to your address.', 'Describe la información que necesitas: una estimación de restablecimiento, una explicación de la interrupción o instrucciones para tu dirección.'],
    tried: ['Include any call or message to the supplier, when it happened, and what they said about pressure or restoration. Leave blank if you have not contacted anyone.', 'Incluye llamadas o mensajes al proveedor, cuándo ocurrieron y qué dijeron sobre la presión o el restablecimiento. Déjalo vacío si aún no contactaste a nadie.'],
    questions: ['For example: Is work affecting my address? When should I check for an update? Are there any published water-use instructions for this interruption?', 'Por ejemplo: ¿Hay trabajos que afectan mi dirección? ¿Cuándo debo consultar de nuevo? ¿Hay instrucciones publicadas para esta interrupción?'],
  },
  quality: {
    description: ['Describe the color, smell or particles, which taps are affected, and whether you noticed a change. These observations do not establish whether water is safe; do not taste water to investigate.', 'Describe el color, olor o partículas, los grifos afectados y cualquier cambio. Estas observaciones no determinan si el agua es segura; no la pruebes para investigar.'],
    action: ['Describe what you would like investigated and the information you need. Ask for applicable official instructions rather than assuming an observation proves a safety problem.', 'Describe qué quieres que investiguen y qué información necesitas. Pide instrucciones oficiales aplicables; una observación no demuestra un problema de seguridad.'],
    tried: ['Include when and how you reported the concern and any instructions you received. Mention photos or related notices without adding medical details.', 'Indica cuándo y cómo reportaste la inquietud y las instrucciones recibidas. Menciona fotos o avisos relacionados sin incluir datos médicos.'],
    questions: ['For example: Who can investigate this concern? Are there current official instructions for my address? Where can I find the related published results?', 'Por ejemplo: ¿Quién puede investigar? ¿Hay instrucciones oficiales actuales para mi dirección? ¿Dónde están los resultados publicados relacionados?'],
  },
  advisory: {
    description: ['Explain which part of the published advisory is unclear and how it affects your usual water use. Do not assume your address is covered or that a missing notice means the water is safe.', 'Explica qué parte del aviso no está clara y cómo afecta tu uso habitual. No supongas que incluye tu dirección ni que la ausencia de un aviso demuestra seguridad.'],
    action: ['Describe the clarification you need: whether the published area includes your address, which instructions apply, or where the next official update will appear.', 'Describe la aclaración que necesitas: si la zona publicada incluye tu dirección, qué instrucciones aplican o dónde aparecerá la próxima actualización oficial.'],
    tried: ['Include any official update you checked or contact you made, the date, and what you were told. Do not treat an unavailable page as an all-clear.', 'Incluye actualizaciones oficiales consultadas o contactos realizados, la fecha y lo que te dijeron. Una página no disponible no significa que todo esté bien.'],
    questions: ['For example: Does the published affected area include my address? Which instructions should I follow? Where will an explicit lift or update be published?', 'Por ejemplo: ¿La zona publicada incluye mi dirección? ¿Qué instrucciones debo seguir? ¿Dónde se publicará un levantamiento explícito o actualización?'],
  },
  report: {
    description: ['Name the report year, page or finding you want explained, and your question. Annual-report findings are historical document evidence, not a current safety assessment.', 'Indica el año, página o hallazgo y tu pregunta. Los hallazgos de informes anuales son evidencia documental histórica, no una evaluación de seguridad actual.'],
    action: ['Describe which dated finding needs clarification and any related notice or follow-up document you would like to receive. Do not assume it remains unresolved today.', 'Describe qué hallazgo fechado necesita aclaración y qué aviso o documento de seguimiento deseas recibir. No supongas que sigue sin resolverse hoy.'],
    tried: ['Mention the report or related notice you already read and any response from the supplier, with dates if known.', 'Menciona el informe o aviso que ya leíste y cualquier respuesta del proveedor, con fechas si las conoces.'],
    questions: ['For example: What follow-up was taken for this dated finding? Is there a related public notice or later report I can read?', 'Por ejemplo: ¿Qué seguimiento tuvo este hallazgo fechado? ¿Hay un aviso público relacionado o un informe posterior que pueda leer?'],
  },
}
const fallback = {
  description: ['Describe what happened, where you noticed it, and what you want the recipient to understand. Leave out anything you do not know and avoid sensitive personal details.', 'Describe qué pasó, dónde lo notaste y qué quieres que comprenda el destinatario. Omite lo que no sepas y los datos personales sensibles.'],
  action: ['Explain the response or next step you would like. Be specific about what information would help, without assuming an outcome is guaranteed.', 'Explica la respuesta o próximo paso que deseas. Indica qué información ayudaría, sin suponer que hay un resultado garantizado.'],
  tried: ['Include who you contacted, when and how, what they told you, and any useful reference number. Leave blank if you have not contacted anyone.', 'Incluye a quién contactaste, cuándo y cómo, qué te dijeron y cualquier referencia útil. Déjalo vacío si aún no contactaste a nadie.'],
  questions: ['Add any questions the recipient should answer or information you still need. Leave blank if the selected actions already cover your request.', 'Añade preguntas para el destinatario o información que aún necesitas. Déjalo vacío si las acciones seleccionadas ya cubren tu solicitud.'],
} as const
export function helpPrompt(issue: IssueType, field: keyof typeof fallback, es: boolean): string {
  return (prompts[issue] ?? fallback)[field][es ? 1 : 0]
}

const examples: Record<IssueType, { description: [string, string]; action: [string, string] }> = {
  service: { description: ['For example: Which taps are affected? Does the water stop and start?', 'Por ejemplo: ¿Qué grifos están afectados? ¿El agua va y viene?'], action: ['For example: Ask for an update or an estimated restoration time.', 'Por ejemplo: Pide una actualización o una hora estimada de restablecimiento.'] },
  quality: { description: ['For example: Which taps are affected? When did the color or smell change?', 'Por ejemplo: ¿Qué grifos están afectados? ¿Cuándo cambió el color o el olor?'], action: ['For example: Ask the provider to investigate or share relevant instructions.', 'Por ejemplo: Pide al proveedor que investigue o comparta instrucciones aplicables.'] },
  billing: { description: ['For example: Which charge looks different from your usual bill?', 'Por ejemplo: ¿Qué cargo es diferente al de tu factura habitual?'], action: ['For example: Ask for an itemized explanation or a review of the charge.', 'Por ejemplo: Pide un desglose o una revisión del cargo.'] },
  advisory: { description: ['For example: Which part of the advisory is unclear?', 'Por ejemplo: ¿Qué parte del aviso no está clara?'], action: ['For example: Ask whether the advisory applies to your address.', 'Por ejemplo: Pregunta si el aviso aplica a tu dirección.'] },
  report: { description: ['For example: Which report year or finding do you have a question about?', 'Por ejemplo: ¿Sobre qué año o hallazgo del informe tienes una pregunta?'], action: ['For example: Ask for an explanation or a related follow-up document.', 'Por ejemplo: Pide una explicación o un documento de seguimiento relacionado.'] },
  other: { description: ['For example: What happened, and where did you notice it?', 'Por ejemplo: ¿Qué pasó y dónde lo notaste?'], action: ['For example: Ask for an explanation or information about next steps.', 'Por ejemplo: Pide una explicación o información sobre los próximos pasos.'] },
  legal: { description: ['For example: What happened, and where did you notice it?', 'Por ejemplo: ¿Qué pasó y dónde lo notaste?'], action: ['For example: Ask for an explanation or information about next steps.', 'Por ejemplo: Pide una explicación o información sobre los próximos pasos.'] },
}

export function helpExample(issue: IssueType, field: 'description' | 'action', es: boolean): string {
  return examples[issue][field][es ? 1 : 0]
}

const observationExamples: Partial<Record<IssueType, Record<string, [string, string]>>> = {
  service: {
    first: ['Which taps have no water? Tap + to add a video showing the flow.', '¿Qué grifos no tienen agua? Usa + para añadir un video del flujo.'],
    second: ['Which taps have low pressure? Tap + to add a video showing the flow.', '¿Qué grifos tienen poca presión? Usa + para añadir un video del flujo.'],
    third: ['When does service stop and return? Tap + to add a video of the flow.', '¿Cuándo se interrumpe y regresa el servicio? Usa + para añadir un video del flujo.'],
  },
  quality: {
    first: ['What color did you notice? Tap + to add a photo or video showing it.', '¿Qué color notaste? Usa + para añadir una foto o video que lo muestre.'],
    second: ['What does the smell resemble, and which taps are affected?', '¿A qué se parece el olor y qué grifos están afectados?'],
    third: ['What do the particles look like? Tap + to add a photo or video.', '¿Cómo son las partículas? Usa + para añadir una foto o video.'],
  },
  billing: {
    first: ['Which charge is unfamiliar? Tap + to add a photo with private details covered.', '¿Qué cargo no reconoces? Usa + para añadir una foto sin datos privados.'],
    second: ['Which charge appears more than once? Tap + to add a photo with private details covered.', '¿Qué cargo aparece más de una vez? Usa + para añadir una foto sin datos privados.'],
    third: ['How does this amount differ from your usual bill?', '¿En qué se diferencia este importe de tu factura habitual?'],
  },
  advisory: {
    first: ['How does the advisory affect your usual water use?', '¿Cómo afecta el aviso a tu uso habitual del agua?'],
    second: ['Which part of the published area is unclear?', '¿Qué parte de la zona publicada no está clara?'],
  },
}
const actionExamples: Partial<Record<IssueType, Record<string, [string, string]>>> = {
  service: { first: ['Which service issue would you like restored?', '¿Qué problema de servicio quieres que resuelvan?'], second: ['When and how would you like an update?', '¿Cuándo y cómo quieres recibir una actualización?'], third: ['What part of the interruption would you like explained?', '¿Qué parte de la interrupción quieres que expliquen?'], fourth: ['What would you like them to check about the low pressure?', '¿Qué quieres que revisen sobre la baja presión?'] },
  quality: { first: ['What would you like investigated or followed up?', '¿Qué quieres que investiguen o revisen?'], second: ['Which water-use instructions do you need clarified?', '¿Qué instrucciones de uso del agua necesitas aclarar?'], third: ['When and how would you like an update?', '¿Cuándo y cómo quieres recibir una actualización?'] },
  billing: { first: ['Which charge should the provider review?', '¿Qué cargo debe revisar el proveedor?'], second: ['Which part of the bill needs an explanation?', '¿Qué parte de la factura necesita explicación?'], third: ['Which next steps would you like explained?', '¿Qué próximos pasos quieres que expliquen?'] },
  advisory: { first: ['Which instructions would you like clarified?', '¿Qué instrucciones quieres que aclaren?'], second: ['When and how would you like an update?', '¿Cuándo y cómo quieres recibir una actualización?'], third: ['What would you like to know about the published area?', '¿Qué quieres saber sobre la zona publicada?'] },
  report: { first: ['Which dated finding would you like them to follow up on?', '¿Sobre qué hallazgo fechado quieres seguimiento?'], second: ['Which notice would you like a copy of?', '¿De qué aviso quieres una copia?'] },
  other: { first: ['Which next step would you like explained?', '¿Qué próximo paso quieres que expliquen?'] },
  legal: { first: ['Which help options would you like explained?', '¿Qué opciones de ayuda quieres que expliquen?'] },
}

export function selectedHelpExample(issue: IssueType, field: 'description' | 'action', es: boolean, observations: Record<string, string>, actions: Record<string, string>): string {
  const selected = Object.keys(field === 'description' ? observations : actions).filter(key => key !== 'details')
  if (selected.length !== 1) return helpExample(issue, field, es)
  const key = selected[0]
  if (field === 'action' && issue === 'quality' && key === 'first' && Object.keys(observations).some(k => k === 'first' || k === 'third')) {
    return es ? '¿Qué quieres que investiguen? Usa + para añadir una foto o video de lo observado.' : 'What would you like investigated? Tap + to add a photo or video of what you noticed.'
  }
  const entry = (field === 'description' ? observationExamples : actionExamples)[issue]?.[key]
  return entry ? entry[es ? 1 : 0] : helpExample(issue, field, es)
}
