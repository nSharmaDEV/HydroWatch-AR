import { vi } from 'vitest'
import type { HelpRequest } from '../src/help-requests'
/** In-memory confirmed-account transport. Never calls a network or delivery provider. */
export function helpFixture() {
  const records: HelpRequest[] = []
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input === '/api/push/config') return Response.json({ enabled: false })
    if (input === '/api/help/session') return Response.json({ enabled: true, user: { id: 'synthetic-user', email: 'resident@example.test' }, delivery: false, accountUrl: null })
    if (input === '/api/help/requests' && init?.method === 'POST') {
      const { draft, revision } = JSON.parse(String(init.body))
      const record: HelpRequest = { id: draft.id, draft, revision: revision + 1, owner: 'synthetic-user', messages: [], events: [], status: 'open', updatedAt: Date.now(), replyToken: '' }
      records.splice(0, records.length, record); return Response.json(record)
    }
    if (input === '/api/help/requests') return Response.json(records)
    throw new Error(`Unexpected synthetic request: ${input}`)
  })
  return records
}
