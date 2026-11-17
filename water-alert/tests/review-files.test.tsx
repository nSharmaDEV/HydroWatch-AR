import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { GuidedHelp } from '../src/GuidedHelp'
import { blankRequest, type HelpAttachment, type HelpDraft } from '../src/help-requests'
import { PLACE_CATALOG } from '../src/place-catalog'

// Synthetic Step 5 files: base64 payloads, the same shape the Step 5 uploader writes to HelpDraft.attachments.
const files: HelpAttachment[] = [
  { id: 'a', name: 'low-pressure-faucet.jpg', type: 'image/jpeg', data: btoa('x'.repeat(3072)) },
  { id: 'b', name: 'pressure-video.mp4', type: 'video/mp4', data: btoa('y'.repeat(2048)) },
  { id: 'c', name: 'october-bill.pdf', type: 'application/pdf', data: btoa('z'.repeat(1024)) },
]
const place = PLACE_CATALOG.find(p => p.place.name === 'BENTONVILLE WATER UTILITIES')!.place
const review = (patch: Partial<HelpDraft> = {}, es = false) => {
  const draft: HelpDraft = { ...blankRequest(place), issue: 'service', description: 'Low pressure', flowStep: 'send', subject: 'Pressure', body: 'Please check my pressure.', ...patch }
  return render(<GuidedHelp draft={draft} place={place} language={es ? 'es' : 'en'} sample={false} deviceOnly delivery={false} sending={false} saveFailed={false} heading={createRef()} extras={null} onHistory={() => {}} edit={() => {}} changeFacts={() => {}} go={() => {}} send={() => {}} regenerate={() => {}} />)
}
let created = 0
const revoke = vi.fn()
beforeEach(() => {
  sessionStorage.clear()
  created = 0
  revoke.mockReset()
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:wave-${++created}`), revokeObjectURL: revoke })
})
afterEach(cleanup)

for (const es of [false, true]) test(`Review shows the step header, email column and right column in order (${es ? 'es' : 'en'})`, () => {
  review({ attachments: files }, es)
  expect(screen.getByText(es ? 'Revisión · último paso' : 'Review · last step')).toBeVisible()
  const bar = screen.getByRole('progressbar')
  expect(bar.querySelectorAll('span')).toHaveLength(6)
  expect(bar.querySelectorAll('span.is-done')).toHaveLength(6)
  const layout = document.querySelector('.request-send-layout')!
  expect(layout.children[0]).toHaveClass('request-review-card')
  const side = layout.querySelector(':scope > .review-side')!
  expect(side).not.toBeNull()
  expect([...side.children].map(c => c.className.split(' ')[0])).toEqual(['send-options', 'review-files', 'review-next'])
  // The call script and the next-office ("Another option") card are no longer on Review.
  expect(screen.queryByText(es ? 'Qué decir cuando llames' : 'What to say when you call')).toBeNull()
  expect(screen.queryByText(es ? 'Otra opción' : 'Another option')).toBeNull()
  expect(document.querySelector('.send-option-script, .send-option-next')).toBeNull()
  // Contact provenance stays reachable from the Send it yourself card.
  expect(screen.getByRole('button', { name: es ? 'Información del contacto' : 'About this contact' })).toBeVisible()
})

for (const es of [false, true]) test(`What happens next lists three steps without promising a reply (${es ? 'es' : 'en'})`, () => {
  review({}, es)
  const next = screen.getByRole('region', { name: es ? 'Qué sigue' : 'What happens next' })
  const items = within(next).getAllByRole('listitem')
  expect(items.map(i => i.textContent)).toEqual(es
    ? ['1Envía o llamaEnvía el borrador por correo o llámalos.', '2Regístralo aquíGuarda un registro de cuándo te comunicaste.', '3Da seguimiento¿Sin respuesta en unos días? Inténtalo de nuevo.']
    : ['1Send or callEmail the draft or call them.', '2Log it hereKeep a record of when you reached out.', '3Follow upNo reply in a few days? Try again.'])
})

test('Your files is not rendered when Step 5 has no files', () => {
  review()
  expect(document.querySelector('.review-files')).toBeNull()
  expect(screen.queryByText(/Your files/i)).toBeNull()
})

for (const es of [false, true]) test(`Your files toggles from one header button and remembers the choice (${es ? 'es' : 'en'})`, async () => {
  const user = userEvent.setup()
  const view = review({ attachments: files }, es)
  const toggle = screen.getByRole('button', { name: es ? /Tus archivos · 3/ : /Your files · 3/ })
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(toggle).toHaveAccessibleName(es ? 'Tus archivos · 3. Ocultar archivos' : 'Your files · 3. Hide files')
  const list = document.getElementById(toggle.getAttribute('aria-controls')!)!
  expect(list).not.toBeNull()
  expect(within(toggle).getByText(es ? 'Arrastra a tu correo' : 'Drag into your email')).toBeVisible()
  expect(toggle.querySelector('button')).toBeNull()
  expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  toggle.focus()
  await user.keyboard('{Enter}')
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  expect(toggle).toHaveAccessibleName(es ? 'Tus archivos · 3. Mostrar archivos' : 'Your files · 3. Show files')
  expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeNull()
  expect(screen.queryByText(es ? 'Arrastra a tu correo' : 'Drag into your email')).toBeNull()
  view.unmount()
  review({ attachments: files }, es)
  const again = screen.getByRole('button', { name: es ? /Tus archivos · 3/ : /Your files · 3/ })
  expect(again).toHaveAttribute('aria-expanded', 'false')
  again.focus()
  await user.keyboard(' ')
  expect(again).toHaveAttribute('aria-expanded', 'true')
})

test('file rows show type tags, sizes and a download link backed by revoked object URLs', () => {
  const view = review({ attachments: files })
  const rows = within(document.querySelector('.review-files-list') as HTMLElement).getAllByRole('listitem')
  expect(rows.map(r => r.querySelector('.review-file-tag')!.textContent)).toEqual(['JPG', 'MP4', 'PDF'])
  expect(rows[0].querySelector('.review-file-tag')).toHaveClass('is-image')
  expect(rows[1].querySelector('.review-file-tag')).toHaveClass('is-video')
  expect(rows[2].querySelector('.review-file-tag')).toHaveClass('is-pdf')
  expect(rows.map(r => r.querySelector('.review-file-size')!.textContent)).toEqual(['3 KB', '2 KB', '1 KB'])
  const download = screen.getByRole('link', { name: 'Download low-pressure-faucet.jpg' })
  expect(download).toHaveAttribute('download', 'low-pressure-faucet.jpg')
  expect(download.getAttribute('href')).toMatch(/^blob:wave-/)
  expect(created).toBe(3)
  view.unmount()
  expect(revoke).toHaveBeenCalledTimes(3)
})

test('dragging a file row offers a Chromium DownloadURL copy and shows the drag ring', () => {
  review({ attachments: files })
  const row = within(document.querySelector('.review-files-list') as HTMLElement).getAllByRole('listitem')[0]
  expect(row).toHaveAttribute('draggable', 'true')
  const dataTransfer = { setData: vi.fn(), effectAllowed: 'all' }
  fireEvent.dragStart(row, { dataTransfer })
  expect(dataTransfer.setData).toHaveBeenCalledWith('DownloadURL', expect.stringMatching(/^image\/jpeg:low-pressure-faucet\.jpg:blob:wave-\d+$/))
  expect(dataTransfer.effectAllowed).toBe('copy')
  expect(row).toHaveClass('is-dragging')
  fireEvent.dragEnd(row)
  expect(row).not.toHaveClass('is-dragging')
})

test('Spanish file download label', () => {
  review({ attachments: files }, true)
  expect(screen.getByRole('link', { name: 'Descargar october-bill.pdf' })).toBeVisible()
})
