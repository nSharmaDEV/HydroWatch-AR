import { expect, test } from 'vitest'
import { blankRequest } from '../src/help-requests'
import { reminderIcs } from '../src/help-outcomes'
import { samplePlaces } from '../src/sample'

test('the follow-up reminder is an all-day calendar event on the follow-up date', () => {
  const d = { ...blankRequest(samplePlaces[0]), id: 'abc', issue: 'billing' as const, followUpOn: '2026-11-16', outcomes: [{ id: 'o1', kind: 'emailed' as const, route: 'provider' as const, name: 'Leisure Hills, Mobile Home Park', on: '2026-11-09' }] }
  const ics = reminderIcs(d, 'en')!
  expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
  expect(ics).toContain('DTSTART;VALUE=DATE:20261116\r\n')
  expect(ics).toContain('DTEND;VALUE=DATE:20261117\r\n')
  expect(ics).toContain('UID:wave-followup-abc@wave')
  // Commas and semicolons are escaped so calendar apps keep the full name.
  expect(ics).toContain('SUMMARY:Follow up with Leisure Hills\\, Mobile Home Park')
  expect(ics).toContain('Did they reply? Record it in WAVE History.')
  expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  expect(reminderIcs({ ...d, followUpOn: undefined }, 'en')).toBeUndefined()
  expect(reminderIcs(d, 'es')).toContain('SUMMARY:Dar seguimiento a Leisure Hills\\, Mobile Home Park')
})
