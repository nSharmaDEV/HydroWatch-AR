// @vitest-environment node
import { afterEach, expect, test } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHmac } from 'node:crypto'
import { helpRouter, helpWebhook } from '../server/help-api'
import { HelpStore } from '../server/help-store'
import { HelpAuth } from '../server/help-auth'
import { blankRequest } from '../src/help-requests'
const servers: Server[] = [], dirs: string[] = []
afterEach(async () => { await Promise.all(servers.splice(0).map(s => new Promise<void>(r => s.close(() => r())))); await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))) })
test('private API ignores caller owner, rejects unauthenticated access and returns unavailable without delivery', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wave-help-api')); dirs.push(dir)
  const store = new HelpStore(dir), app = express()
  const auth = new HelpAuth({ url: 'https://fake.supabase.co', key: 'public' }, async () => Response.json({ id: 'alice', email: 'resident@example.test', email_confirmed_at: '2026-01-01' }))
  app.use(express.json()); app.use(helpRouter({ store, auth, config: { auth: { url: 'https://fake.supabase.co', key: 'public' }, delivery: null, accountUrl: null }, secure: false }))
  const server = app.listen(0, '127.0.0.1'); servers.push(server); await new Promise<void>(r => server.once('listening', r))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  expect((await fetch(base + '/requests')).status).toBe(401)
  const draft = blankRequest({ id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'Leisure Hills', county: 'Benton', kind: 'system' })
  const headers = { Cookie: 'wave_help=token', 'Content-Type': 'application/json' }
  const r = await fetch(base + '/requests', { method: 'POST', headers, body: JSON.stringify({ draft, revision: 0, owner: 'bob' }) })
  expect(r.status).toBe(200); expect((await store.list('alice')).length).toBe(1); expect(await store.list('bob')).toEqual([])
  expect((await fetch(base + `/requests/${draft.id}/send`, { method: 'POST', headers, body: JSON.stringify({ revision: 1 }) })).status).toBe(503)
  expect((await store.list('alice'))[0].messages).toEqual([])
})
test('synthetic transport deduplicates sends, verifies raw webhooks and isolates incoming replies', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wave-help-api')); dirs.push(dir)
  const store = new HelpStore(dir), app = express(), outgoing: { key: string; body: Record<string, unknown> }[] = []
  const secret = Buffer.from('synthetic-webhook-secret').toString('base64')
  const config = { auth: { url: 'https://fake.supabase.co', key: 'public' }, delivery: { key: 'synthetic', from: 'wave@example.test', domain: 'reply.example.test', webhook: `whsec_${secret}` }, accountUrl: null }
  let incoming: Record<string, unknown> = {}
  const transport: typeof fetch = async (url, init) => {
    if (String(url).includes('/receiving/')) return Response.json(incoming)
    outgoing.push({ key: new Headers(init?.headers).get('Idempotency-Key')!, body: JSON.parse(String(init?.body)) })
    return Response.json({ id: 'synthetic-mail-1' })
  }
  const auth = new HelpAuth(config.auth, async (_url, init) => Response.json({ id: new Headers(init?.headers).get('Authorization') === 'Bearer bob' ? 'bob' : 'alice', email: 'resident@example.test', email_confirmed_at: '2026-01-01' }))
  const services = { store, auth, config, secure: false, fetcher: transport }
  app.post('/webhook', express.raw({ type: 'application/json' }), helpWebhook(services))
  app.use(express.json()); app.use(helpRouter(services))
  const server = app.listen(0, '127.0.0.1'); servers.push(server); await new Promise<void>(r => server.once('listening', r))
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  const headers = { Cookie: 'wave_help=alice', 'Content-Type': 'application/json' }
  const draft = blankRequest({ id: 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf', name: 'Leisure Hills', county: 'Benton', kind: 'system' })
  draft.description = 'Synthetic issue'; draft.subject = 'Synthetic subject'; draft.body = 'Synthetic message, not sent to a real provider.'
  draft.attachments = [{ id: crypto.randomUUID(), name: 'synthetic.txt', type: 'text/plain', data: Buffer.from('Synthetic attachment').toString('base64') }]
  await store.save('alice', draft, 0)
  const post = (path: string, body: unknown, h = headers) => fetch(base + path, { method: 'POST', headers: h, body: JSON.stringify(body) })
  expect((await post(`/requests/${draft.id}/send`, { revision: 1 }, { ...headers, Cookie: 'wave_help=bob' })).status).toBe(409)
  expect(outgoing).toHaveLength(0)
  await Promise.all([post(`/requests/${draft.id}/send`, { revision: 1 }), post(`/requests/${draft.id}/send`, { revision: 1 })])
  expect(outgoing).toHaveLength(1)
  expect(outgoing[0].body.to).toEqual(['LEISUREHILLSWATERCO@GMAIL.COM'])
  expect(outgoing[0].body.attachments).toEqual([{ filename: 'synthetic.txt', content: draft.attachments[0].data, content_type: 'text/plain' }])
  let r = (await store.list('alice'))[0]
  expect(r.messages[0].delivery).toBe('sent')
  async function webhook(type: string, emailId: string, eventId: string, invalid = false) {
    const raw = JSON.stringify({ type, data: { email_id: emailId } }), timestamp = String(Math.floor(Date.now() / 1000))
    const signature = createHmac('sha256', Buffer.from(secret, 'base64')).update(`${eventId}.${timestamp}.${raw}`).digest('base64')
    return fetch(base + '/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'svix-id': eventId, 'svix-timestamp': timestamp, 'svix-signature': `v1,${invalid ? 'invalid' : signature}` }, body: raw })
  }
  expect((await webhook('email.delivered', 'synthetic-mail-1', 'event-delivered', true)).status).toBe(401)
  expect((await webhook('email.delivered', 'not-accepted-yet', 'event-early')).status).toBe(503)
  expect((await webhook('email.delivered', 'synthetic-mail-1', 'event-delivered')).status).toBe(204)
  await webhook('email.delivered', 'synthetic-mail-1', 'event-delivered')
  r = (await store.list('alice'))[0]
  expect(r.messages[0].delivery).toBe('delivered'); expect(r.events.filter(e => e.id === 'event-delivered')).toHaveLength(1)
  await store.setStatus('alice', r.id, 'closed')
  incoming = { from: 'unrelated@example.test', to: [outgoing[0].body.reply_to], subject: 'Synthetic reply', text: 'A reply is not resolution.', authentication: { dmarc: 'pass' }, attachments: [{ filename: 'not-downloaded.pdf' }] }
  await webhook('email.received', 'reply-1', 'event-reply-1')
  expect((await store.list('alice'))[0].messages).toHaveLength(1)
  incoming.from = 'LEISUREHILLSWATERCO@GMAIL.COM'; incoming.authentication = { dmarc: 'fail' }
  await webhook('email.received', 'reply-1', 'event-reply-2')
  expect((await store.list('alice'))[0].messages).toHaveLength(1)
  incoming.authentication = { dmarc: 'pass' }
  await webhook('email.received', 'reply-1', 'event-reply-3'); await webhook('email.received', 'reply-1', 'event-reply-3')
  r = (await store.list('alice'))[0]
  expect(r.messages).toHaveLength(2); expect(r.messages[1].unsupportedAttachments).toBe(1); expect(r.messages[1].attachments).toEqual([])
  expect(r.status).toBe('closed'); expect(await store.list('bob')).toEqual([])
})
test('retry transports every immutable synthetic recipient and accepts a reply from the second recipient', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wave-help-multiple')); dirs.push(dir)
  const now = Date.now(), store = new HelpStore(dir, () => now), draft = blankRequest({ id: 'ADH:' + 'a'.repeat(64), name: 'Synthetic supplier', county: 'Test', kind: 'system' })
  const message = { id: crypto.randomUUID(), destination: 'first@example.test', destinations: ['first@example.test', 'second@example.test'], subject: 'Frozen subject', body: 'Frozen body', attachments: [], at: now - 31000, delivery: 'unknown' as const, direction: 'outgoing' as const, draftRevision: 1 }
  // Seed an immutable test snapshot, not production directory entries or real mail.
  await writeFile(join(dir, 'help-requests.json'), JSON.stringify({ requests: [{ id: draft.id, owner: 'alice', draft, revision: 1, status: 'open', updatedAt: now - 31000, messages: [message], events: [], replyToken: 'synthetic-reply-token' }] }))
  const calls: { key: string | null; body: Record<string, unknown> }[] = []
  const transport: typeof fetch = async (_url, init) => { calls.push({ key: new Headers(init?.headers).get('Idempotency-Key'), body: JSON.parse(String(init?.body)) }); return Response.json({ id: 'synthetic-accepted' }) }
  const config = { auth: { url: 'https://fake.supabase.co', key: 'public' }, delivery: { key: 'synthetic', from: 'wave@example.test', domain: 'reply.example.test', webhook: 'synthetic' }, accountUrl: null }
  const auth = new HelpAuth(config.auth, async () => Response.json({ id: 'alice', email: 'resident@example.test', email_confirmed_at: '2026-01-01' }))
  const app = express(); app.use(express.json()); app.use(helpRouter({ store, auth, config, secure: false, fetcher: transport }))
  const server = app.listen(0, '127.0.0.1'); servers.push(server); await new Promise<void>(r => server.once('listening', r))
  const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/requests/${draft.id}/send`, { method: 'POST', headers: { Cookie: 'wave_help=alice', 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: message.id }) })
  expect(response.status).toBe(200)
  expect(calls).toHaveLength(1)
  expect(calls[0].body.to).toEqual(message.destinations)
  expect(calls[0].body.text).toBe(message.body)
  expect(calls[0].key).toContain(message.id)
  await store.incoming('synthetic-reply-token', 'second@example.test', { id: 'synthetic-reply', subject: 'Reply', body: 'Not resolution' })
  expect((await store.list('alice'))[0].messages).toHaveLength(2)
  expect(await store.list('bob')).toEqual([])
})
