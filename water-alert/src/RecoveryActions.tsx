import { useId, useRef, useState, type ReactNode } from 'react'
import type { Language, Notice, Place } from './domain'
import { SourceLink } from './components'
import { PROVIDER_CONTACTS } from './provider-contacts'
import { buildPreparationPacket, buildRecoveryDraft, draftText, emailDraftUrl, type DraftKind, type RecoveryDraft } from './recovery-drafts'
import { RECOVERY_RESOURCES as links } from './recovery-resources'
import { recoveryStrings } from './recovery-strings'
import { helpGuideStrings } from './help-guide-strings'
import { workspaceStrings } from './HelpWorkspace'

// Parent keys this component by mode/place/exact notice IDs/language. No persistence.
export function RecoveryActions({ place, notice, language, sample, initialKind = '', guided = false, selectedKind, onKindChange, appendix = '', onEdit, allowEmail = true, children }: { place: Place; notice?: Notice; language: Language; sample: boolean; initialKind?: DraftKind | ''; guided?: boolean; selectedKind?: DraftKind; onKindChange?: (kind: DraftKind) => void; appendix?: string; onEdit?: () => void; allowEmail?: boolean; children?: ReactNode }) {
  const id = useId()
  const [kind, setKind] = useState<DraftKind | ''>(initialKind)
  const [edits, setEdits] = useState<Partial<Record<DraftKind, RecoveryDraft>>>({})
  const [message, setMessage] = useState('')
  const editor = useRef<HTMLTextAreaElement>(null)
  const t = recoveryStrings[language]
  const w = workspaceStrings[language]
  if (place.kind !== 'system') return null
  const input = { place, notice, sample }
  const activeKind = selectedKind ?? kind
  const draft = activeKind ? edits[activeKind] ?? buildRecoveryDraft({ ...input, kind: activeKind }) : { subject: '', body: '' }
  const outgoing = { ...draft, body: draft.body + appendix }
  const remaining = (draft.subject + draft.body).match(/\[[^\]]+\]/g)?.length ?? 0
  const contact = !sample && Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  const mailto = allowEmail && (activeKind === 'service' || activeKind === 'request' || activeKind === 'followup' || activeKind === 'response') ? emailDraftUrl(contact?.email, outgoing) : undefined
  function edit(field: keyof RecoveryDraft, value: string) { setEdits(previous => ({ ...previous, [activeKind]: { ...draft, [field]: value } })); setMessage(''); onEdit?.() }
  async function copy() {
    try { await navigator.clipboard.writeText(draftText(outgoing)); setMessage(t.copied) }
    catch { editor.current?.focus(); editor.current?.select(); setMessage(t.failed) }
  }
  function download(packet: boolean) {
    const blob = new Blob([packet ? buildPreparationPacket({ ...input, draft: outgoing }) : draftText(outgoing)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `water-alert-${sample ? 'sample-' : ''}${packet ? 'preparation' : activeKind}.txt`
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage(t.downloaded)
  }
  return <section className={`recovery-tools${guided ? ' guided-recovery' : ''}`} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className={guided ? 'sr-only' : undefined}>{t.title}</h2>
    <div className={guided ? 'draft-heading-fields' : undefined}>
      <div><label htmlFor={`${id}-kind`}>{t.prepare}</label><select id={`${id}-kind`} value={activeKind} onChange={e => { const value = e.target.value as DraftKind | ''; setKind(value); if (value) onKindChange?.(value); setMessage('') }}>{!selectedKind ? <option value="">{t.choose}</option> : null}{(['service', 'request', 'complaint', 'legal', 'followup'] as const).map(k => <option key={k} value={k}>{t[k]}</option>)}{selectedKind ? <option value="response">{t.response}</option> : null}</select></div>
      {activeKind && guided ? <div><label htmlFor={`${id}-subject`}>{t.subject}</label><input id={`${id}-subject`} lang="en" value={draft.subject} onChange={e => edit('subject', e.target.value)} /></div> : null}
    </div>
    {activeKind ? <>{!guided ? <p>{t.intro}</p> : null}<div className="recovery-layout"><div>
      <p className="quiet-note draft-requirements">{guided ? w.requirements : t.english}</p>
      {!guided ? <><label htmlFor={`${id}-subject`}>{t.subject}</label><input id={`${id}-subject`} lang="en" value={draft.subject} onChange={e => edit('subject', e.target.value)} /></> : null}
      <label className={guided ? 'sr-only' : undefined} htmlFor={`${id}-body`}>{t.body}</label><textarea ref={editor} id={`${id}-body`} lang="en" rows={guided ? 3 : 12} value={draft.body} aria-describedby={`${id}-privacy ${id}-requirements`} onChange={e => edit('body', e.target.value)} />
      <p id={`${id}-requirements`} className="quiet-note draft-remaining" role="status">{remaining ? w.remaining(remaining) : w.reviewed}</p>
        <p id={`${id}-privacy`} className={guided ? 'sr-only' : 'quiet-note'}>{t.privacy}</p>
       {appendix ? <details className="draft-appendix"><summary>{language === 'es' ? 'Fuentes históricas incluidas' : 'Historical sources included'}</summary><label htmlFor={`${id}-appendix`}>{language === 'es' ? 'Apéndice de fuentes incluido con su mensaje' : 'Source appendix included with your message'}</label><textarea id={`${id}-appendix`} lang="en" rows={7} readOnly value={appendix.trim()} /><p className="quiet-note">{language === 'es' ? 'Se agrega al copiar, descargar o abrir el borrador de correo. No se adjunta ningún PDF.' : 'Appended when copying, downloading or opening an email draft. No PDF is attached.'}</p></details> : null}
       {!guided ? <p className="quiet-note">{helpGuideStrings[language].loss}</p> : null}
       <div className="actions"><button className="primary" onClick={() => void copy()}>{t.copy}</button><button className="secondary" onClick={() => download(false)}>{t.download}</button>{!guided ? <><button className="secondary" onClick={() => download(true)}>{t.packet}</button>{mailto ? <a className="secondary" href={mailto}>{t.email}</a> : null}</> : null}</div>
      {!guided ? <p className="quiet-note">{mailto ? t.emailHelp : t.noEmail}</p> : <div className="draft-supplements"><details className="draft-options"><summary>{language === 'en' ? 'More draft options and privacy' : 'Más opciones y privacidad'}</summary><div className="actions"><button className="secondary" onClick={() => download(true)}>{t.packet}</button>{mailto ? <a className="secondary" href={mailto}>{t.email}</a> : null}</div><p>{t.english}</p><p>{t.privacy}</p><p>{mailto ? t.emailHelp : t.noEmail}</p></details>{children}</div>}<p role="status">{message}</p>
    </div>{!guided ? <aside className="recovery-resources"><details key={activeKind} open={activeKind === 'complaint' || activeKind === 'legal'}><summary>{t.forms}<span className="disclosure-icon" aria-hidden="true" /></summary>
      <SourceLink url={links.complaint}>{t.ag}</SourceLink><SourceLink url={links.englishForm}>{t.formEn}</SourceLink><SourceLink url={links.spanishForm}>{t.formEs}</SourceLink><SourceLink url={links.legalHelp}>{t.help}</SourceLink><SourceLink url={links.intake}>{t.intake}</SourceLink><SourceLink url={links.court}>{t.court}</SourceLink>
      <p className="quiet-note">{t.checked}</p><details><summary>{t.limits}<span className="disclosure-icon" aria-hidden="true" /></summary><p>{t.limitsText}</p></details>
    </details></aside> : null}</div></> : null}
  </section>
}
