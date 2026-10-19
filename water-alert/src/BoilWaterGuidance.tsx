import type { Language } from './domain'
import { SourceLink } from './components'

export const CDC_GUIDANCE_URL = 'https://www.cdc.gov/water-emergency/about/drinking-water-advisories-an-overview.html'
export function BoilWaterGuidance({ current, language }: { current: boolean; language: Language }) {
  const es = language === 'es'
  return <details className="boil-guidance" open={current}>
    <summary>{es ? 'Guía general de CDC para hervir agua' : 'General CDC boil-water guidance'}<span className="disclosure-icon" aria-hidden="true" /></summary>
    <p>{es ? 'Referencia general, no instrucciones específicas de ADH para este incidente. Siga a las autoridades locales. Citas originales en inglés.' : 'General reference, not incident-specific ADH instructions. Follow local officials. English original excerpts.'}</p>
    {!current ? <p className="quiet-note">{es ? 'Esta referencia no confirma que haya un aviso activo.' : 'This reference does not confirm an active advisory.'}</p> : null}
    <blockquote lang="en">If local officials issue a boil water advisory, use commercially bottled water or boil your tap water.</blockquote>
    <blockquote lang="en">To kill germs, bring water to a full rolling boil for 1 minute. At elevations above 6,500 feet, boil for 3 minutes. To avoid burns, allow boiled water to cool before you use it.</blockquote>
    <blockquote lang="en">Use commercially bottled water or boiled water for drinking and to prepare and cook food.</blockquote>
    <blockquote lang="en">Brush your teeth using boiled water or commercially bottled water. Do not use tap water that you have not boiled first.</blockquote>
    <p className="quiet-note">{es ? 'Solo para avisos de hervir agua; no para avisos químicos, de no beber o de no usar. Consulte la fuente para filtros, baño, mascotas y otros casos.' : 'Boil-water reference only; not for chemical, do-not-drink or do-not-use advisories. See the source for filters, bathing, pets and other cases.'}</p>
    <SourceLink url={CDC_GUIDANCE_URL}>{es ? 'Leer guía completa de CDC' : 'Read full CDC guidance'}</SourceLink><p className="quiet-note">CDC · 2024-03-04 · {es ? 'Citas verificadas' : 'Excerpts checked'} 2026-10-14</p>
  </details>
}
