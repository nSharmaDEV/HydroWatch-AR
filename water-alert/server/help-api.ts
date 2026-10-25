import express, { Router, type RequestHandler } from 'express'
import { HelpAuth, type HelpConfig, verifyWebhook } from './help-auth.js'
import { HelpStore } from './help-store.js'
import type { HelpMessage, HelpRequest } from '../src/help-requests.js'
export interface HelpServices { store: HelpStore; auth: HelpAuth | null; config: HelpConfig; secure: boolean; fetcher?: typeof fetch }
export function helpRouter({ store, auth, config, secure, fetcher = fetch }: HelpServices) {
  const router = Router()
  router.get('/session', async (req, res) => { res.json({ enabled: !!auth, user: auth ? await auth.identity(req.get('Cookie')) : null, delivery: !!config.delivery, accountUrl: config.accountUrl }) })
  router.post('/session', async (req, res) => {
    if (!auth) { res.status(503).json({ error: 'Accounts unavailable' }); return }
    try { const session = await auth.signIn(req.body?.email, req.body?.password); res.setHeader('Set-Cookie', `wave_help=${session.token}; HttpOnly; SameSite=Strict; Path=/api/help; Max-Age=${session.seconds}${secure ? '; Secure' : ''}`); res.json({ ok: true }) }
    catch { res.status(401).json({ error: 'Sign-in failed. Use an existing confirmed account.' }) }
  })
  router.delete('/session', (_req, res) => { res.setHeader('Set-Cookie', `wave_help=; HttpOnly; SameSite=Strict; Path=/api/help; Max-Age=0${secure ? '; Secure' : ''}`); res.sendStatus(204) })
  router.use(async (req, res, next) => { const user = auth ? await auth.identity(req.get('Cookie')) : null; if (!user) { res.status(401).json({ error: 'Sign in to access private requests' }); return }; res.locals.user = user; next() })
  router.get('/requests', async (_req, res) => { res.json(await store.list(res.locals.user.id)) })
  router.post('/requests', async (req, res) => {
    try { res.json(await store.save(res.locals.user.id, req.body?.draft, req.body?.revision)) }
    catch (e) { res.status(String(e).includes('conflict') ? 409 : 400).json({ error: 'Could not save. Check limits or reload to resolve a conflicting edit.' }) }
  })
  async function dispatch(owner: string, prepared: { request: HelpRequest; message: HelpMessage; send: boolean }) {
    if (!prepared.send) return prepared.request
    const d = config.delivery!, m = prepared.message
    try {
      const response = await fetcher('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${d.key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `wave-${m.id}` }, body: JSON.stringify({ from: d.from, to: m.destinations ?? [m.destination], subject: m.subject, text: m.body, reply_to: `wave-${prepared.request.replyToken}@${d.domain}`, attachments: m.attachments.map(a => ({ filename: a.name, content: a.data, content_type: a.type })) }), signal: AbortSignal.timeout(15000) })
      // Even error responses can be ambiguous after a proxy failure. Preserve the same immutable key.
      if (!response.ok) throw new Error('Provider did not confirm acceptance')
      const sent = await response.json(); if (typeof sent.id !== 'string' || sent.id.length > 200) throw new Error('Missing provider receipt')
      return await store.accept(owner, prepared.request.id, m.id, sent.id)
    } catch { return await store.uncertain(owner, prepared.request.id, m.id) }
  }
  router.post('/requests/:id/send', async (req, res) => {
    if (!config.delivery) { res.status(503).json({ error: 'Email delivery unavailable. Nothing sent.' }); return }
    try { const p = req.body?.messageId ? await store.retry(res.locals.user.id, String(req.params.id), req.body.messageId) : await store.prepare(res.locals.user.id, String(req.params.id), req.body?.revision); res.json(await dispatch(res.locals.user.id, p)) }
    catch { res.status(409).json({ error: 'Send blocked. Reload to check the draft, destination and previous send outcome.' }) }
  })
  router.post('/requests/:id/status', async (req, res) => { try { res.json(await store.setStatus(res.locals.user.id, String(req.params.id), req.body?.status)) } catch { res.status(404).json({ error: 'Request unavailable' }) } })
  router.delete('/requests', async (_req, res) => { await store.remove(res.locals.user.id); res.sendStatus(204) })
  router.delete('/requests/:id', async (req, res) => { await store.remove(res.locals.user.id, String(req.params.id)); res.sendStatus(204) })
  return router
}
/** Mounted before JSON and browser-origin middleware: this is provider-to-server, authenticated by signature. */
export function helpWebhook({ store, config, fetcher = fetch }: HelpServices): RequestHandler {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    const d = config.delivery
    const id = req.get('svix-id')
    if (!d || !Buffer.isBuffer(req.body) || !verifyWebhook(req.body, { id, timestamp: req.get('svix-timestamp'), signature: req.get('svix-signature') }, d.webhook)) { res.sendStatus(401); return }
    let event
    try { event = JSON.parse(req.body.toString('utf8')) } catch { res.sendStatus(400); return }
    const emailId = event.data?.email_id
    if (typeof emailId !== 'string' || !/^[a-zA-Z0-9-]{1,200}$/.test(emailId)) { res.sendStatus(400); return }
    if (event.type === 'email.received') {
      const response = await fetcher(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${d.key}` }, signal: AbortSignal.timeout(10000) })
      if (!response.ok) { res.sendStatus(503); return }
      const mail = await response.json()
      const addresses = Array.isArray(mail.to) ? mail.to : []
      const reply = addresses.length === 1 && typeof addresses[0] === 'string' ? addresses[0].toLowerCase().match(/^wave-([a-f0-9]{48})@(.+)$/) : null
      const sender = typeof mail.from === 'string' ? mail.from.match(/^(?:[^<>]*<)?([^<>\s]+@[^<>\s]+)>?$/)?.[1] : null
      if (reply && reply[2] === d.domain.toLowerCase() && sender && mail.authentication?.dmarc === 'pass' && typeof mail.text === 'string' && mail.text.length <= 24000 && typeof mail.subject === 'string' && mail.subject.length <= 200) await store.incoming(reply[1], sender, { id: `incoming-${emailId}`, subject: mail.subject, body: mail.text, unsupportedAttachments: Array.isArray(mail.attachments) ? mail.attachments.length : 0 })
    } else if (['email.delivered', 'email.bounced', 'email.failed'].includes(event.type)) {
      // Acceptance can still be committing when a delivery webhook arrives. Request redelivery.
      if (!await store.delivery(emailId, event.type === 'email.delivered' ? 'delivered' : 'failed', id!)) { res.sendStatus(503); return }
    }
    res.sendStatus(204)
  }
}
export const helpJson = express.json({ limit: '1500kb' })
