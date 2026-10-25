import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { RequestHistory } from '../src/RequestHistory'
import { samplePlaces } from '../src/sample'
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })
test('lake HAB context does not display tap-water boil instructions', async () => {
  const place = { id: 'sample-lake', name: 'Synthetic lake', county: 'Benton', kind: 'lake' as const }
  const notice = { id: 'hab', placeId: place.id, name: place.name, county: place.county, agency: 'ADEQ' as const, kind: 'hab' as const, area: 'Synthetic shore', issued: '2026-10-20', lifted: null, reason: 'Synthetic HAB notice', url: 'https://example.test/hab' }
  render(<RequestWorkspace place={place} notice={notice} notices={[notice]} currentAdvisory language="en" sample onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByRole('button', { name: /Add a photo or document/ })).toBeVisible()
  expect(screen.queryByRole('link', { name: /CDC boil-water/ })).not.toBeInTheDocument()
})
test('explicit send reports acceptance on final Review without navigating or sending twice', async () => {
  const { blankRequest } = await import('../src/help-requests')
  const place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' as const }
  const draft = { ...blankRequest(place), stage: 3 as const, flowStep: 'confirm' as const, description: 'Synthetic service issue', subject: 'Synthetic subject', body: 'Frozen resident edits' }
  let record = { id: draft.id, draft, revision: 1, owner: 'alice', messages: [], events: [], status: 'open', updatedAt: Date.now(), replyToken: 'synthetic' }
  const sends: string[] = [], onHistory = vi.fn()
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/session')) return Response.json({ enabled: true, user: { id: 'alice', email: 'resident@example.test' }, delivery: true, accountUrl: null })
    if (url.endsWith('/send')) { sends.push(String(init?.body)); return Response.json(record) }
    if (init?.method === 'POST') { const data = JSON.parse(String(init.body)); record = { ...record, draft: data.draft, revision: data.revision + 1 }; return Response.json(record) }
    return Response.json([record])
  })
  render(<RequestWorkspace place={place} language="en" sample={false} onBack={() => {}} onHistory={onHistory} />)
  expect(await screen.findByLabelText('Message')).toHaveValue('Frozen resident edits')
  expect(screen.getByRole('heading', { name: 'Review your complaint email' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
  expect(await screen.findByText(/Message accepted by the email processor/)).toBeVisible()
  expect(screen.getByLabelText('Message')).toHaveValue('Frozen resident edits')
  expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  expect(sends).toHaveLength(1)
  expect(onHistory).not.toHaveBeenCalled()
})
test('billing follow-ups stay scoped and complete editable message is visible in Review and Send', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} language="en" sample onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Bill or charge' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   expect(screen.queryByLabelText('Describe what happened (optional if selected above)')).not.toBeInTheDocument()
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.change(screen.getByLabelText('Billing period (optional)'), { target: { value: 'October' } })
  fireEvent.change(screen.getByLabelText('Which charge is in question? (optional)'), { target: { value: 'Second service charge' } })
   fireEvent.change(screen.getByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'Duplicate water charge' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  expect(screen.getByLabelText('What have you already tried? (optional)').tagName).toBe('TEXTAREA')
  expect(screen.getAllByLabelText('Additional wording (optional)')).toHaveLength(1)
  fireEvent.change(screen.getByLabelText('What have you already tried? (optional)'), { target: { value: 'Asked the billing desk' } })
  expect(screen.queryByLabelText('When did it begin? (optional)')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  expect((await screen.findByLabelText<HTMLTextAreaElement>('Message')).value).toContain('October')
  expect(screen.getByLabelText('Subject')).toBeVisible()
   fireEvent.click(screen.getByText(/^To:/))
   expect(screen.getByRole('group', { name: 'Recipients' })).toBeVisible()
  expect(screen.getByLabelText<HTMLTextAreaElement>('Message').value).toContain('Second service charge')
  expect(screen.getByLabelText<HTMLTextAreaElement>('Message').value).toContain('Asked the billing desk')
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Edited full message without agency facts' } })
   expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
   fireEvent.click(screen.getByRole('button', { name: 'Back' }))
   fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  expect(await screen.findByLabelText('Message')).toHaveValue('Edited full message without agency facts')
})
test('guided steps save and resume sample issue and edited message without claiming a send', async () => {
  const props = { place: samplePlaces[0], language: 'en' as const, sample: true, onBack: () => {}, onHistory: () => {} }
  const view = render(<RequestWorkspace {...props} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
   fireEvent.change(screen.getByLabelText('When did it begin? (optional)'), { target: { value: '2026-10-19' } })
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.change(await screen.findByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'No service on Monday' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
  fireEvent.change(await screen.findByLabelText('Message'), { target: { value: 'My edited message' } })
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved on this device'), { timeout: 3000 })
  view.unmount(); render(<RequestWorkspace {...props} />)
  expect(await screen.findByLabelText('Message')).toHaveValue('My edited message')
  expect(await screen.findByRole('button', { name: 'Copy email' })).toBeEnabled()
   expect(screen.getByText(/Sample — fictional/)).toBeVisible()
})
test('History separates sample drafts from live correspondence and offers resume', async () => {
  const props = { place: samplePlaces[0], language: 'en' as const, sample: true, onBack: () => {}, onHistory: () => {} }
  render(<RequestWorkspace {...props} />)
   fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.change(await screen.findByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'An issue' } })
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved on this device'), { timeout: 3000 })
  cleanup(); render(<RequestHistory language="en" sample onResume={() => {}} />)
  expect(await screen.findByRole('button', { name: 'Resume draft' })).toBeVisible()
  expect(screen.getByText(/Sample drafts/)).toBeVisible()
})
test('accountless History shows only live device drafts and does not call the requests API', async () => {
  const { blankRequest } = await import('../src/help-requests')
  const place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' as const }
  const draft = { ...blankRequest(place), body: 'A live local-only draft', issueType: 'service' as const }
  localStorage.setItem('water-alert:live-help:v1', JSON.stringify([{ id: draft.id, draft, revision: 1, status: 'open', owner: 'device', messages: [], events: [], updatedAt: Date.now(), replyToken: '' }]))
  const calls: string[] = []
  vi.stubGlobal('fetch', async (url: string) => { calls.push(url); return Response.json({ enabled: true, user: null, delivery: false, accountUrl: null }) })

  render(<RequestHistory language="en" sample={false} onResume={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Continue without an account' }))

  expect(await screen.findByRole('button', { name: /Water issue/ })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Resume draft' })).toBeVisible()
  expect(screen.getByText(/not sample data/i)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Delete all History' })).not.toBeInTheDocument()
  expect(calls).toEqual(['/api/help/session'])
})
test('leaving waits for durable save and a failed save keeps the issue recoverable', async () => {
  const onHistory = vi.fn()
  render(<RequestWorkspace place={samplePlaces[0]} language="en" sample onBack={() => {}} onHistory={onHistory} />)
   fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.change(await screen.findByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'Keep this issue' } })
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  fireEvent.click(screen.getByRole('button', { name: 'Open History' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent("Couldn't save"))
  expect(onHistory).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Describe what happened (optional if selected above)')).toHaveValue('Keep this issue')
  expect(screen.getByRole('button', { name: 'Download unsaved text' })).toBeVisible()
  write.mockRestore()
})
test('an open live draft offers same-account sign-in again without losing unsaved edits', async () => {
  const requests: import('../src/help-requests').HelpRequest[] = []
  const place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' as const }
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/session')) return Response.json(init?.method === 'POST' ? { ok: true } : { enabled: true, user: { id: 'alice', email: 'resident@example.test' }, delivery: false, accountUrl: null })
    if (init?.method === 'POST') { const { draft, revision } = JSON.parse(String(init.body)); const r = { id: draft.id, draft, revision: revision + 1, owner: 'alice', messages: [], events: [], status: 'open' as const, updatedAt: Date.now(), replyToken: 'synthetic' }; requests[0] = r; return Response.json(r) }
    return Response.json(requests)
  })
  render(<RequestWorkspace place={place} language="en" sample={false} onBack={() => {}} onHistory={() => {}} />)
   fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.change(await screen.findByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'Do not lose this edit' } })
  fireEvent.click(screen.getByText('Sign in again without leaving'))
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'synthetic-password' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!)
  await waitFor(() => expect(screen.getByText('Session renewed. Retry saving your draft.')).toBeVisible())
  expect(screen.getByLabelText('Describe what happened (optional if selected above)')).toHaveValue('Do not lose this edit')
})
test('simple choices and optional dates/files disclosure keep the first step focused', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} language="en" sample onBack={() => {}} onHistory={() => {}} />)
  expect(await screen.findByRole('heading', { name: 'What do you need help with?' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Current advisory' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Legal help' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Attachments (optional)')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   expect(screen.queryByLabelText('Attachments (optional)')).not.toBeInTheDocument()
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   expect(screen.getByRole('button', { name: /Add a photo or document/ })).toBeVisible()
  expect(screen.getAllByRole('textbox').filter(e => e.tagName === 'TEXTAREA')).toHaveLength(1)
})
test('included notice facts can be edited or removed before generation and persist without rewriting the email', async () => {
  const p = samplePlaces[0], notice = { id: 'sample-notice', placeId: p.id, name: p.name, county: p.county, agency: 'ADH' as const, kind: 'boil' as const, area: 'Fictional north area', issued: '2026-10-20', lifted: null, reason: 'Fictional pressure loss', url: 'https://example.test/notice' }
  const props = { place: p, notices: [notice], currentAdvisory: true, language: 'en' as const, sample: true, onBack: () => {}, onHistory: () => {} }
  const view = render(<RequestWorkspace {...props} />)
   fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.change(screen.getByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'I need clarification.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
     fireEvent.click(screen.getAllByText('View source details')[0])
  fireEvent.click(screen.getByText('Edit source wording'))
   fireEvent.change(screen.getByLabelText('Source wording'), { target: { value: 'The notice mentions pressure loss.' } })
   vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Update draft from answers' }))
    expect((await screen.findByLabelText<HTMLTextAreaElement>('Message')).value).toContain('The notice mentions pressure loss.')
    expect(screen.getByLabelText<HTMLTextAreaElement>('Message').value).toContain('Fictional pressure loss')
  expect(screen.getByLabelText<HTMLTextAreaElement>('Message').value).toContain('https://example.test/notice')
  expect(screen.getAllByRole('link', { name: /ADH/ })[0]).toHaveAttribute('href', notice.url)
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'My final edited email.' } })
   await waitFor(() => expect(screen.getByText('Saved on this device')).toBeVisible(), { timeout: 3000 })
  view.unmount(); render(<RequestWorkspace {...props} />)
  expect(await screen.findByLabelText('Message')).toHaveValue('My final edited email.')
     fireEvent.click(screen.getAllByText('View source details')[0])
  fireEvent.click(screen.getByText('Edit source wording'))
   expect(screen.getByLabelText('Source wording')).toHaveValue('The notice mentions pressure loss.')
    fireEvent.click(screen.getByRole('button', { name: 'Remove source record' }))
  expect(await screen.findByLabelText('Message')).toHaveValue('My final edited email.')
  expect(screen.queryByRole('link', { name: /ADH ·/ })).not.toBeInTheDocument()
})
test('saved notice details do not acquire a current-status heading when a newer advisory exists', async () => {
  const p = samplePlaces[0]
  const context = 'A saved ADH notice, not verified as current. Historical draft details.'
  const { blankRequest } = await import('../src/help-requests')
  const draft = { ...blankRequest(p, context), sources: [] }
  localStorage.setItem('water-alert:sample-help:v1', JSON.stringify([{ id: draft.id, draft, revision: 1, status: 'open', owner: 'sample', messages: [], events: [], updatedAt: Date.now(), replyToken: '' }]))
  render(<RequestWorkspace place={p} language="en" sample currentAdvisory onBack={() => {}} onHistory={() => {}} />)
   fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.change(screen.getByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'My issue' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByRole('button', { name: 'Review message' }))
   expect(screen.getByText('Not verified')).toBeVisible()
    fireEvent.click(screen.getByText('View source details'))
   expect(screen.getByText(context, { selector: '.request-fact-summary' })).toBeVisible()
  expect(screen.queryByText('WAVE found a current notice')).not.toBeInTheDocument()
})
test('Spanish billing questions capture the disputed charge and prior attempts without service questions', async () => {
  render(<RequestWorkspace place={samplePlaces[0]} language="es" sample onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Factura o cargo' }))
   fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
   fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
   expect(screen.getByLabelText('¿Qué cargo cuestionas? (opcional)')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Describe lo que pasó (opcional si seleccionaste arriba)'), { target: { value: 'Un cargo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  expect(screen.getByLabelText('¿Qué has intentado? (opcional)')).toBeVisible()
  expect(screen.queryByLabelText('¿Cuándo comenzó? (opcional)')).not.toBeInTheDocument()
})

test('live Get help can continue without an account and keeps its real draft on this device', async () => {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url)
    return Response.json({ enabled: true, user: null, delivery: false, accountUrl: null })
  })
  const place = { id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' as const }
  render(<RequestWorkspace place={place} language="en" sample={false} onBack={() => {}} onHistory={() => {}} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Continue without an account' }))
   fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
   fireEvent.click(screen.getByLabelText('Something else'))
  fireEvent.change(screen.getByLabelText('Describe what happened (optional if selected above)'), { target: { value: 'My live water-service issue' } })

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved on this device'), { timeout: 3000 })
  expect(screen.getByText(/Live · device-only draft/i)).toBeVisible()
  expect(localStorage.getItem('water-alert:live-help:v1')).toContain('My live water-service issue')
  expect(localStorage.getItem('water-alert:sample-help:v1')).toBeNull()
  expect(calls).toEqual(['/api/help/session'])
  expect(screen.getByText(/not sent|not submitted/i)).toBeVisible()
})
