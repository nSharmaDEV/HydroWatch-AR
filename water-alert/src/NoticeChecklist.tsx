import { useId, useState } from 'react'
import type { Language, Notice, Place } from './domain'
import { supplierArea, supplierIssued } from './supplier-display'
import type { Strings } from './strings'

export function NoticeChecklist({ notices, place, language, t, sample, onHelp }: { notices: Notice[]; place: Place; language: Language; t: Strings; sample: boolean; onHelp: () => void }) {
  const [checked, setChecked] = useState([false, false, false])
  const [showArea, setShowArea] = useState(false)
  const id = useId()
  const spanish = language === 'es'
  const labels = spanish
    ? ['Leer el aviso oficial', 'Revisar cómo le afecta el aviso', '¿Qué puede hacer?']
    : ['Read the official notice', 'Review how the notice applies to you', 'What can you do?']
  const descriptions = spanish
    ? ['Revise las instrucciones actuales de la agencia.', 'Confirme el área publicada y su proveedor.', 'Encuentre ayuda y formularios para su problema de agua.']
    : ['Review the agency’s current instructions.', 'Confirm the published area and your supplier.', 'Find help and forms for your water issue.']
  return <section className="notice-action-card">
    <p className="notice-action-status"><span aria-hidden="true">! </span><span>{t.activeBoil}</span></p>
    {notices.map(notice => <section className="notice-action-facts" key={notice.id}>
      <h3>{spanish ? 'Área afectada: ' : 'Notice applies to: '}{supplierArea(notice.area, place, language) || t.unknown}</h3>
      <dl><div><dt>{spanish ? 'Motivo publicado' : 'Published reason'}</dt><dd lang="en">{notice.reason || t.unknown}</dd></div><div><dt>{t.issued}</dt><dd>{notice.issued ? supplierIssued(notice.issued, language) : t.unknown}</dd></div></dl>
    </section>)}
    <div className="notice-checklist-heading"><h3>{spanish ? 'Su lista de pasos' : 'Your checklist'}</h3><span role="status">{checked.filter(Boolean).length}{spanish ? ' de 3 completados' : ' of 3 complete'}</span></div>
    <ul className="notice-checklist">{labels.map((label, index) => <li key={label}>
      <label><input type="checkbox" checked={checked[index]} onChange={event => { const value = event.target.checked; setChecked(previous => previous.map((done, i) => i === index ? value : done)) }} /><span><strong>{label}</strong><small>{descriptions[index]}</small></span></label>
      {index === 0 && !sample ? <a className="primary" href={notices[0].url} target="_blank" rel="noreferrer">{spanish ? 'Ver aviso' : 'View notice'}</a> : <button className="primary" aria-expanded={index === 1 || (index === 0 && sample) ? showArea : undefined} aria-controls={index === 1 || (index === 0 && sample) ? id : undefined} onClick={index === 2 ? onHelp : () => setShowArea(value => !value)}>{index === 2 ? spanish ? 'Obtener ayuda' : 'Get help' : index === 0 ? spanish ? 'Ver ejemplo' : 'View sample' : spanish ? 'Ver área' : 'View area'}</button>}
    </li>)}</ul>
    <div id={id} hidden={!showArea} className="notice-area-details">{notices.map(notice => <p key={notice.id}>{spanish ? 'Área afectada publicada: ' : 'Published affected area: '}{notice.area || t.unknown}</p>)}<p>{spanish ? 'Confirme su proveedor en su factura. No se infiere su domicilio a partir del condado.' : 'Confirm your supplier on your water bill. Your address is not inferred from the county.'}</p></div>
    <p className="quiet-note">{spanish ? 'Marque los pasos al terminarlos. Esta lista no cambia el estado del aviso. El progreso no se guarda al recargar.' : 'Check off steps as you finish. Your checklist does not change the notice status. Progress resets when you reload.'}</p>
    <p className="quiet-note">{t.guidanceGap} {spanish ? 'No hay una hora de finalización verificada; consulte al proveedor.' : 'No verified end time is available; check with the provider.'}</p>
  </section>
}
