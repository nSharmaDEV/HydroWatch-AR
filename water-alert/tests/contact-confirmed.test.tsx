import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { SendOptions } from '../src/SendOptions'
import { PROVIDER_CONTACTS as READ_ONLY, type ProviderContact } from '../src/provider-contacts'
const PROVIDER_CONTACTS = READ_ONLY as Record<string, ProviderContact>
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { blankRequest } from '../src/help-requests'

const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', kind: 'system' as const, county: 'Benton' }
const original = { ...PROVIDER_CONTACTS[LEISURE_HILLS_ID] }
afterEach(() => { cleanup(); PROVIDER_CONTACTS[LEISURE_HILLS_ID] = original })
const draft = { ...blankRequest(place), issue: 'billing' as const, subject: 'S', body: 'B' }

test('a contact shows "confirmed" only after a person recorded the confirmation', () => {
  const view = render(<SendOptions draft={draft} language="en" sample={false} blocked={false} copy={async () => true} />)
  expect(screen.queryByText(/Confirmed by WAVE/)).not.toBeInTheDocument()
  PROVIDER_CONTACTS[LEISURE_HILLS_ID] = { ...original, confirmedOn: '2026-11-12' }
  view.rerender(<SendOptions draft={{ ...draft }} language="es" sample={false} blocked={false} copy={async () => true} />)
  expect(screen.getByText(/Confirmado por WAVE el/)).toBeVisible()
})
