import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { ObservedHistory } from '../src/ObservedHistory'
import { NoticeDetail } from '../src/NoticeDetail'
import { StatusCard } from '../src/components'
import { en, es } from '../src/strings'
import { SOURCES, type Notice, type SourceSnapshot } from '../src/domain'

const at = '2026-10-14T12:21:00Z'
const notice: Notice = { id: 'ADEQ:unknown', placeId: 'ADEQ:lake', name: 'Test Lake *', county: 'Crittenden County', agency: 'ADEQ', kind: 'hab', area: 'Published area', issued: 'June 21, 2019', lifted: null, liftStatus: 'unknown', reason: '', url: SOURCES.ADEQ, sourceUpdatedAt: 'September 28, 2026', firstObservedAt: '2026-10-13T12:00:00Z', lastObservedAt: at }
const place = { id: notice.placeId, name: notice.name, county: notice.county, kind: 'lake' as const }
const source: SourceSnapshot = { agency: 'ADEQ', records: [notice], retrievedAt: at, lastSuccessAt: at, error: null }
const mapContext = { places: [place], sources: [source], now: Date.parse(at), onView: () => {} }

for (const [language, t] of [['en', en], ['es', es]] as const) {
  it(`explains unknown lift semantics and preserves distinct history dates in ${language}`, async () => {
    render(<NoticeDetail place={place} source={source} now={Date.parse(at)} t={t} language={language} onBack={() => {}} onShare={() => {}} onAlerts={() => {}} />)
    expect(screen.getByText(t.unknownLift)).toHaveTextContent(language === 'en' ? /current-advisories table excludes/ : /tabla de avisos actuales.*excluye/)
    expect(screen.getByText(t.unknownLift)).toHaveTextContent(language === 'en' ? /does not send new\/lifted alerts/ : /no envía avisos nuevos ni de levantamiento/)
    expect(screen.getByText(language === 'en' ? 'Not provided — record reads “N/A”' : 'No proporcionado — el registro indica “N/A”')).toBeVisible()
    expect(screen.getByText(t.issued)).toBeVisible()
    expect(screen.getByText(t.firstObserved)).not.toBeVisible()
    await userEvent.setup().click(screen.getByText(t.observationDetails, { selector: 'summary' }))
    for (const label of [t.sourceUpdated, t.firstObserved, t.lastObserved]) expect(screen.getByText(label)).toBeVisible()
    expect(screen.getByText('June 21, 2019').closest('time')).not.toHaveAttribute('datetime')
    expect(screen.getByText('September 28, 2026')).toBeVisible()
    expect(document.querySelector(`time[datetime="${at}"]`)).not.toBeNull()
    expect(screen.getByText(language === 'en' ? /An observation means the row/ : /Una observación significa que el registro/)).toBeVisible()
    expect(screen.queryByText(/47 of 47|June 13, 2026/)).not.toBeInTheDocument()
  })
  it(`bundles labeled English quotations with source and verification date in ${language}`, () => {
    render(<NoticeDetail place={place} source={source} now={Date.parse(at)} t={t} language={language} onBack={() => {}} onShare={() => {}} onAlerts={() => {}} />)
    const guidance = document.querySelector('.adeq-guidance')!
    expect(guidance).not.toBeNull()
    expect(within(guidance as HTMLElement).getByText(language === 'en' ? /Verbatim.*English/ : /Citas textuales.*inglés/)).toBeVisible()
    expect(guidance.querySelector('blockquote[lang="en"]')).toHaveTextContent('A water body with no HAB advisory is not an indication that a bloom is not present.')
    expect(within(guidance as HTMLElement).getByRole('link', { name: /ADEQ/ })).toHaveAttribute('href', 'https://adeq.state.ar.us/water/planning/hab/default.aspx')
    expect(guidance.querySelector('time')).toHaveAttribute('datetime', '2026-10-14')
    expect(guidance).toHaveTextContent('(501) 682-0744')
    expect(guidance).toHaveTextContent('(501) 280-4168')
    expect(guidance.querySelector('a[href="mailto:adh.ep.its@arkansas.gov"]')).not.toBeNull()
    expect(screen.getByText(t.unknownLift)).toBeVisible()
    expect(screen.getByText(language === 'en' ? 'Not provided — record reads “N/A”' : 'No proporcionado — el registro indica “N/A”')).toBeVisible()
    expect(screen.queryByText(t.guidanceGap)).not.toBeInTheDocument()
  })
  it(`keeps unknown home copy concise and preserves issued dates in advisory history for current HAB in ${language}`, async () => {
    const view = render(<StatusCard place={place} source={source} now={Date.parse(at)} t={t} language={language} onView={() => {}} />)
    expect(screen.getByRole('article')).toHaveClass('unavailable')
    expect(screen.queryByText(t.unknownLift)).not.toBeInTheDocument()
    expect(screen.getByText(language === 'en' ? 'Active/lifted status unconfirmed' : 'Estado activo o levantado sin confirmar')).toBeVisible()
    view.rerender(<StatusCard place={place} source={{ ...source, records: [{ ...notice, liftStatus: undefined }] }} now={Date.parse(at)} t={t} language={language} onView={() => {}} />)
    expect(screen.getByRole('article')).toHaveClass('hab')
    await userEvent.setup().click(screen.getByRole('button', { name: language === 'en' ? 'Agency record' : 'Registro de la agencia' }))
    expect(screen.getByText('June 21, 2019')).toBeVisible()
  })
}
it('does not fabricate missing history provenance or counts and keeps guidance ADEQ-only', () => {
  const view = render(<ObservedHistory {...mapContext} archive={[{ ...notice, sourceUpdatedAt: undefined, firstObservedAt: undefined, lastObservedAt: undefined }]} watches={[place.id]} coverageStart={null} t={en} language="en" />)
  for (const label of [en.sourceUpdated, en.firstObserved, en.lastObserved]) expect(screen.queryByText(label)).not.toBeInTheDocument()
  expect(document.querySelectorAll('.history-event time[datetime]')).toHaveLength(0)
  expect(screen.queryByRole('button', { name: /Test Lake/ })).toBeNull()
  expect(document.querySelector('.adeq-guidance')).toBeNull()
  view.rerender(<ObservedHistory {...mapContext} archive={[{ ...notice, agency: 'ADH', kind: 'boil', liftStatus: undefined, url: SOURCES.ADH }]} watches={[place.id]} coverageStart={null} t={en} language="en" />)
  expect(document.querySelector('.adeq-guidance')).toBeNull()
})
