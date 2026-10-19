import { useId, useRef, useState } from 'react'
import type { Language, Notice, Place } from './domain'
import { SourceLink } from './components'
import { PROVIDER_CONTACTS } from './provider-contacts'
import { buildPreparationPacket, buildRecoveryDraft, draftText, emailDraftUrl, type DraftKind, type RecoveryDraft } from './recovery-drafts'
import { RECOVERY_RESOURCES as links } from './recovery-resources'
import { recoveryStrings } from './recovery-strings'
import { helpGuideStrings } from './help-guide-strings'

// Parent keys this component by mode/place/exact notice IDs/language. No persistence.
export function RecoveryActions({ place, notice, language, sample, initialKind = '', guided = false }: { place: Place; notice?: Notice; language: Language; sample: boolean; initialKind?: DraftKind | ''; guided?: boolean }) {
  const id = useId()
  const [kind, setKind] = useState<DraftKind | ''>(initialKind)
  const [edits, setEdits] = useState<Partial<Record<DraftKind, RecoveryDraft>>>({})
  const [message, setMessage] = useState('')
  const editor = useRef<HTMLTextAreaElement>(null)
  const t = recoveryStrings[language]
  if (place.kind !== 'system') return null
  const input = { place, notice, sample }
  const draft = kind ? edits[kind] ?? buildRecoveryDraft({ ...input, kind }) : { subject: '', body: '' }
  const contact = !sample && Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  const mailto = kind === 'service' || kind === 'request' || kind === 'followup' ? emailDraftUrl(contact?.email, draft) : undefined
  function edit(field: keyof RecoveryDraft, value: string) { setEdits(previous => ({ ...previous, [kind]: { ...draft, [field]: value } })); setMessage('') }
  async function copy() {
    try { await navigator.clipboard.writeText(draftText(draft)); setMessage(t.copied) }
    catch { editor.current?.focus(); editor.current?.select(); setMessage(t.failed) }
  }
  function download(packet: boolean) {
    const blob = new Blob([packet ? buildPreparationPacket({ ...input, draft }) : draftText(draft)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `water-alert-${sample ? 'sample-' : ''}${packet ? 'preparation' : kind}.txt`
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage(t.downloaded)
  }
  return <section className="recovery-tools" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{t.title}</h2>
      <label htmlFor={`${id}-kind`}>{t.prepare}</label><select id={`${id}-kind`} value={kind} onChange={e => { setKind(e.target.value as DraftKind | ''); setMessage('') }}><option value="">{t.choose}</option>{(['service', 'request', 'complaint', 'legal', 'followup'] as const).map(k => <option key={k} value={k}>{t[k]}</option>)}</select>
    {kind ? <><p>{t.intro}</p><div className="recovery-layout"><div>
      <p className="quiet-note">{t.english}</p>
      <label htmlFor={`${id}-subject`}>{t.subject}</label><input id={`${id}-subject`} lang="en" value={draft.subject} onChange={e => edit('subject', e.target.value)} />
      <label htmlFor={`${id}-body`}>{t.body}</label><textarea ref={editor} id={`${id}-body`} lang="en" rows={12} value={draft.body} aria-describedby={`${id}-privacy`} onChange={e => edit('body', e.target.value)} />
       <p id={`${id}-privacy`} className="quiet-note">{t.privacy}</p>
       <p className="quiet-note">{helpGuideStrings[language].loss}</p>
      <div className="actions"><button className="primary" onClick={() => void copy()}>{t.copy}</button><button className="secondary" onClick={() => download(false)}>{t.download}</button><button className="secondary" onClick={() => download(true)}>{t.packet}</button>{mailto ? <a className="secondary" href={mailto}>{t.email}</a> : null}</div>
      <p className="quiet-note">{mailto ? t.emailHelp : t.noEmail}</p><p role="status">{message}</p>
    </div>{!guided ? <aside className="recovery-resources"><details key={kind} open={kind === 'complaint' || kind === 'legal'}><summary>{t.forms}<span className="disclosure-icon" aria-hidden="true" /></summary>
      <SourceLink url={links.complaint}>{t.ag}</SourceLink><SourceLink url={links.englishForm}>{t.formEn}</SourceLink><SourceLink url={links.spanishForm}>{t.formEs}</SourceLink><SourceLink url={links.legalHelp}>{t.help}</SourceLink><SourceLink url={links.intake}>{t.intake}</SourceLink><SourceLink url={links.court}>{t.court}</SourceLink>
      <p className="quiet-note">{t.checked}</p><details><summary>{t.limits}<span className="disclosure-icon" aria-hidden="true" /></summary><p>{t.limitsText}</p></details>
    </details></aside> : null}</div></> : null}
  </section>
}
