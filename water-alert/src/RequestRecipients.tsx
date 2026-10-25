import { recommendedRoute, recipientRoutes, routeFor, selectedRecipients, type HelpDraft, type HelpRoute } from './help-requests'
export function RequestRecipients({ draft, es, edit }: { draft: HelpDraft; es: boolean; edit: (patch: Partial<HelpDraft>) => void }) {
  const primary = recommendedRoute(draft.issue), selected = recipientRoutes(draft)
  const extra: HelpRoute[] = draft.issue === 'billing' ? ['ag'] : ['quality', 'advisory', 'service'].includes(draft.issue) ? ['provider', 'adh'] : draft.issue === 'legal' ? ['legal'] : []
  const options = [...new Set([primary, ...extra, ...selected])]
  return <div className="request-recipient-control">
    <details className="request-recipient-dropdown"><summary>{es ? 'Para' : 'To'}: {selectedRecipients(draft).map(r => r.name).join(', ') || (es ? 'Elegir' : 'Choose')}</summary>
      <fieldset className="request-recipients"><legend className="sr-only">{es ? 'Destinatarios' : 'Recipients'}</legend>{options.map(route => {
        const r = routeFor({ ...draft, route })
        return <label key={route} className="checkbox-row"><input type="checkbox" checked={selected.includes(route)} onChange={e => { const recipientRoutes = e.target.checked ? [...selected, route] : selected.filter(v => v !== route); edit({ recipientRoutes, route: recipientRoutes[0] ?? primary }) }} />{r.name}{route === primary ? ` ★ ${es ? 'WAVE recomienda' : 'WAVE recommends'}` : ''}</label>
      })}</fieldset>
      <div className="request-recipient-contacts">{selectedRecipients(draft).map(r => <p key={r.route}>{r.name}: {r.email ?? (es ? 'solo canal externo; WAVE no envía correo.' : 'external channel only; WAVE cannot email this recipient.')} {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{es ? 'Contacto oficial' : 'Official contact'}</a> : null}</p>)}
      {selected.includes('adh') ? <p>{es ? 'ADH: consulta a Ingeniería para orientación sobre sistemas públicos de agua. Este borrador no se ha presentado a ADH.' : 'ADH: contact Engineering for guidance on public water systems. This draft has not been submitted to ADH.'} <a href="https://healthy.arkansas.gov/programs-services/licensing-military-member-licensure-permits-plan-reviews/drinking-water-plan-review" target="_blank" rel="noreferrer">{es ? 'Contacto de Ingeniería de ADH' : 'ADH Engineering contact'}</a></p> : null}</div>
    </details>
  </div>
}
