// Local-only static prototype. No requests, submissions or persistent storage.
const draftMemory = Object.create(null)
let draftKind = 'request'
const recoveryLinks = {
  complaint: 'https://arkansasag.gov/file-a-complaint/',
  englishForm: 'https://media.ark.org/ag/Consumer-Complaint-Form.pdf',
  spanishForm: 'https://media.ark.org/ag/Spanish-Consumer-Complaint-Form-3.pdf',
  legalHelp: 'https://www.arlawhelp.org/',
  intake: 'https://aroi.legalserver.org/modules/matter/extern_intake.php?pid=38&h=757e8c&',
  court: 'https://a.arlawhelp.org/self-representation/small-claims-court/process-and-forms'
}
function draftKey() { return `${state.language}:${state.scenario}:${draftKind}` }
function noticeContext() {
  return flags().hasRecord
    ? `SYNTHETIC NOTICE REFERENCE — not proof of personal loss\nSupplier: SAMPLE CREEK WATER ASSOCIATION\nAgency-issued text: 10/14/2026 3:12:14 PM\nPublished area: Entire System\nPublished reason: power outage\nSource: ${ADH}\nPreview scenario: ${state.scenario}; not live advisory status.\nAgency dates are not proof of when my service stopped or resumed.`
    : `SYNTHETIC SUPPLIER: SAMPLE CREEK WATER ASSOCIATION\nNo incident record supplied in this preview scenario.\nSource: ${ADH}\nDo not claim an outage based on this preview.`
}
function draftTemplate() {
  const context = noticeContext()
  const templates = {
    request: `Subject: Request to review water-service credit / documented expenses\nTo: [VERIFY PROVIDER OR PARK MANAGEMENT EMAIL]\n\nHello,\n\nI am [YOUR NAME], a customer/resident at [YOUR SERVICE ADDRESS — add only in your own reviewed message].\nMy own description of the service problem: [WHAT YOU EXPERIENCED].\nMy affected dates: [START / END OR STILL UNKNOWN].\n\nPlease review a bill credit and/or reimbursement of $[ACTUAL AMOUNT] for [EXPENSES]. I can provide copies of [RECEIPTS / BILL / CORRESPONDENCE]. I am asking for review, not stating that compensation is automatically owed.\n\nPlease send the applicable policy, claim instructions, any deadline, a reference number and your decision in writing. Please also confirm whether my address is affected and any incident-specific instructions.\n\n${context}\n\nThank you,\n[YOUR NAME]\n[YOUR PREFERRED CONTACT — add outside this preview]`,
    followup: `Subject: Follow-up on water-service review request [CASE NUMBER]\nTo: [VERIFY PROVIDER OR PARK MANAGEMENT EMAIL]\n\nHello,\n\nI contacted you on [DATE / METHOD] about [YOUR SERVICE PROBLEM] and requested [RESOLUTION]. My reference number is [CASE NUMBER OR NONE PROVIDED].\nYour response so far: [EXACT RESPONSE OR NO RESPONSE AS OF DATE].\n\nPlease provide a written update, the applicable policy and a decision on my request. Documented expenses requested for review: $[ACTUAL AMOUNT]. Supporting copies available: [LIST].\n\n${context}\n\nThank you,\n[YOUR NAME]\n[YOUR PREFERRED CONTACT — add outside this preview]`,
    complaint: `DRAFT FOR THE OFFICIAL AG FORM — NOT SUBMITTED\nBusiness complained about: [VERIFY LEGAL NAME / ADDRESS / PHONE].\n\nFacts in date order:\n[YOUR OWN EXPERIENCE: what happened, when and how your service was affected].\nProvider contact attempts: [DATES / METHODS / CASE NUMBERS].\nProvider response: [EXACT RESPONSE OR NO RESPONSE AS OF DATE].\nActual documented expenses: $[AMOUNT], supported by [RECEIPTS].\nResolution requested: [BILL CREDIT / REIMBURSEMENT REVIEW / WRITTEN RESPONSE].\nDocuments I will attach separately: [COPIES — NOT ORIGINALS].\n\n${context}\n\n[YOUR NAME AND CONTACT — enter on the official form, not here].\nBefore submitting: review every statement. The AG shares complaints with the business; records may be public. Read the form's privacy and attorney/court-action mediation limitations.\nOfficial form: ${recoveryLinks.complaint}`,
    legal: `PREPARATION NOTES FOR LEGAL-HELP INTAKE — NOT A FILED LAWSUIT\n\nI would like help understanding a water-service dispute.\n[YOUR NAME / COUNTY — provide through the legal-help service].\nI rent / own / live in a mobile-home park: [YOUR SITUATION].\nWho bills me: [PROVIDER OR LANDLORD / PARK MANAGEMENT].\nWhat happened to me: [YOUR EXPERIENCE AND DATES].\nActual documented costs: $[AMOUNT].\nWhat I requested and the response: [DATES / REQUEST / RESPONSE].\nAny court papers or attorney already involved: [YES / NO / DETAILS].\n\n${context}\n\nQuestions: Is there a claim? Who is the correct party? What deadlines or immunity rules apply? Is small claims appropriate? How do court fees, service and attorney involvement affect the route?\nDo not treat an advisory as proof of liability or injury. I have not filed anything through Water Alert.\nLegal-help intake: ${recoveryLinks.intake}\nHelpline: 1-800-952-9243 (eligibility and availability apply).`
  }
  return templates[draftKind]
}
function draftText() { return draftMemory[draftKey()] ?? draftTemplate() }
function toolkitMarkup() {
  const es = state.language === 'es'
  const label = (en, spanish) => es ? spanish : en
  return `<section class="draft-toolkit" aria-labelledby="toolkit-title"><h2 id="toolkit-title">${label('Ready-to-use drafts & forms', 'Borradores y formularios listos para editar')}</h2><p>${label('Choose a template, edit it, then copy it into your own email or the official form. No AI-generated claims. Nothing is sent here.', 'Elija una plantilla, edítela y cópiela a su correo o al formulario oficial. No se generan reclamaciones con IA. No se envía nada aquí.')}</p><label for="draft-kind">${label('Prepare', 'Preparar')}</label><select id="draft-kind"><option value="request">${label('Provider credit / reimbursement request', 'Solicitud de crédito o reembolso al proveedor')}</option><option value="followup">${label('Follow-up email', 'Correo de seguimiento')}</option><option value="complaint">${label('AG complaint facts & requested resolution', 'Hechos y resolución para la queja ante AG')}</option><option value="legal">${label('Legal-help intake notes', 'Notas para solicitar ayuda legal')}</option></select><p class="muted">${label('Editable English template. Replace every bracketed field and verify all facts. Use synthetic information here; add private details only in your own email or official form.', 'Plantilla editable en inglés. Sustituya todos los campos entre corchetes y verifique los hechos. Use información ficticia aquí; añada datos privados solo en su correo o en el formulario oficial.')}</p><label for="draft-body">${label('Review and edit your draft', 'Revise y edite su borrador')}</label><textarea id="draft-body" lang="en" rows="14" spellcheck="true" aria-describedby="draft-privacy"></textarea><p id="draft-privacy" class="muted">${label('Edits stay in this tab’s memory only; reload/close loses them. Copy/download puts text on your device. No uploads or browser storage. No verified recipient exists for this synthetic supplier.', 'Los cambios quedan solo en la memoria de esta pestaña; se pierden al recargar o cerrar. Copiar o descargar guarda texto en su dispositivo. No hay cargas ni almacenamiento del navegador. No existe un destinatario verificado para este proveedor ficticio.')}</p><div class="actions"><button class="primary" data-action="copy-draft">${label('Copy draft', 'Copiar borrador')}</button><button data-action="download-draft">${label('Download draft (.txt)', 'Descargar borrador (.txt)')}</button><button data-action="download-packet">${label('Download preparation pack', 'Descargar paquete de preparación')}</button></div><p id="draft-status" role="status"></p><h3>${label('Go straight to the official service', 'Ir directamente al servicio oficial')}</h3><div class="resource-links">${link(recoveryLinks.complaint,label('AG complaint form', 'Formulario de queja de AG'))}${link(recoveryLinks.englishForm,label('AG printable form · English', 'Formulario imprimible de AG · inglés'))}${link(recoveryLinks.spanishForm,label('AG printable form · Spanish', 'Formulario imprimible de AG · español'))}${link(recoveryLinks.intake,label('Legal-aid application', 'Solicitud de asistencia legal'))}${link(recoveryLinks.court,label('Small-claims process & forms', 'Proceso y formularios de menor cuantía'))}</div><p class="muted">${label('External services have their own privacy rules. AG complaints are shared with the business and may be public; AG mediation is unavailable if a private attorney is retained or court action has started. Legal aid is subject to eligibility and availability. Court forms require you to verify venue, defendant, deadlines and procedure; opening a form does not file it.', 'Los servicios externos tienen sus propias reglas de privacidad. Las quejas de AG se comparten con la empresa y pueden ser públicas; no hay mediación si ya contrató un abogado o inició una acción judicial. La asistencia legal depende de elegibilidad y disponibilidad. Verifique tribunal, demandado, plazos y procedimiento; abrir un formulario no lo presenta.')}</p><details><summary>${label('Call script & preparation checklist', 'Guion de llamada y lista de preparación')}</summary><p lang="en">“I am calling about my water service at [address]. Am I affected? What instructions apply? How do I request a credit or reimbursement review? Which policy and deadline apply? Please give me a case number and a written response.”</p><p>${label('Pack includes an expense log, call log, checklist, reviewed draft and source references—not attachments or a filed claim.', 'El paquete incluye registro de gastos y llamadas, lista de preparación, borrador revisado y fuentes; no contiene adjuntos ni una reclamación presentada.')}</p></details></section>`
}
function preparationPacket() {
  return `WATER ALERT — SAMPLE PREPARATION PACK — NOT SUBMITTED\n\nREVIEWED DRAFT\n${draftText()}\n\nNOTICE CONTEXT\n${noticeContext()}\n\nCHECKLIST\n[ ] Verify provider / bill / service address privately\n[ ] Replace all bracketed draft fields and verify dates and claims\n[ ] Save original notice with source and observation date\n[ ] Keep copies of bills, receipts and correspondence locally\n[ ] Ask provider for policy, deadline, reference number and written decision\n[ ] Check complaint privacy, jurisdiction and attorney/court-action restrictions\n[ ] Ask legal help about the right party, deadlines, immunity and court procedure\n[ ] Submit yourself through the appropriate official service\n\nEXPENSE LOG (actual documented costs; no automatic eligibility)\nDate | Item | Amount | Receipt filename | Reason requested\n[DATE] | [ITEM] | [AMOUNT] | [FILE] | [REASON]\n\nCONTACT LOG\nDate | Organization/person | Phone/email | Case number | Response | Next step\n[DATE] | [CONTACT] | [METHOD] | [CASE] | [RESPONSE] | [NEXT]\n\nSOURCE REFERENCES\nADH: ${ADH}\nAG complaint: ${recoveryLinks.complaint}\nAG form EN: ${recoveryLinks.englishForm}\nAG form ES: ${recoveryLinks.spanishForm}\nLegal help: ${recoveryLinks.legalHelp}\nLegal-aid intake: ${recoveryLinks.intake}\nSmall-claims process/forms: ${recoveryLinks.court}\nResource links checked October 14, 2026; recheck before using.\n\nNothing has been sent, filed or attached. An advisory is not proof of personal loss, liability or entitlement to money. This is general preparation, not legal advice. Your downloaded text is your responsibility to protect.\n`
}
function mountToolkit() {
  const recovery = document.querySelector('.recovery')
  if (!recovery) return
  recovery.querySelector('.contact').insertAdjacentHTML('afterend', toolkitMarkup())
  document.getElementById('draft-kind').value = draftKind
  document.getElementById('draft-body').value = draftText()
  // Keep explanatory advice behind a disclosure; actions and links come first.
  const steps = recovery.querySelector('ol')
  const details = document.createElement('details')
  const summary = document.createElement('summary')
  summary.textContent = state.language === 'es' ? 'Cómo funcionan estas opciones y sus límites' : 'How these options work & their limits'
  details.append(summary)
  steps.before(details)
  details.append(steps)
}
function draftStatus(en, es) {
  const element = document.getElementById('draft-status')
  if (element) element.textContent = state.language === 'es' ? es : en
}
async function toolkitAction(action) {
  if (action === 'copy-draft') {
    try {
      await navigator.clipboard.writeText(draftText())
      draftStatus('Copied. Review and send yourself; nothing was submitted.', 'Copiado. Revise y envíe usted mismo; no se presentó nada.')
    } catch {
      document.getElementById('draft-body').focus()
      document.getElementById('draft-body').select()
      draftStatus('Copy unavailable. Text selected: use your device’s Copy action or download.', 'No se pudo copiar. Texto seleccionado: use Copiar en su dispositivo o descargue.')
    }
    return
  }
  const packet = action === 'download-packet'
  const blob = new Blob([packet ? preparationPacket() : draftText()], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = packet ? 'water-alert-sample-preparation.txt' : `water-alert-sample-${draftKind}.txt`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser time to consume the download URL before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  draftStatus('Download requested. No files were attached and nothing was submitted.', 'Descarga solicitada. No se adjuntaron archivos ni se presentó nada.')
}
