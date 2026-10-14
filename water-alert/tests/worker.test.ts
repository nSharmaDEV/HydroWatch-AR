// @vitest-environment node
import { expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
async function worker() {
  const listeners: Record<string, (event: unknown) => void> = {}
  const shown: { title: string; options: { body: string; data: { url: string }; tag: string } }[] = []
  const opened: string[] = []
  const self = { location: { origin: 'https://app.example.org' }, addEventListener: (name: string, fn: (event: unknown) => void) => { listeners[name] = fn }, skipWaiting: async () => {}, registration: { showNotification: async (title: string, options: typeof shown[number]['options']) => { shown.push({ title, options }) } }, clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (url: string) => { opened.push(url) } } }
  runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), { self, URL })
  async function dispatch(name: string, fields: object) { let done: Promise<unknown> = Promise.resolve(); listeners[name]?.({ ...fields, waitUntil: (work: Promise<unknown>) => { done = work } }); await done }
  return { dispatch, shown, opened }
}
it('shows a dated agency change and opens the live app rather than an external payload URL', async () => {
  const { dispatch, shown, opened } = await worker()
  await dispatch('push', { data: { json: () => ({ title: 'Water system', body: 'Agency published a lift · 10/13/2026', tag: 'lifted:id', url: 'https://evil.invalid' }) } })
  expect(shown[0]).toMatchObject({ title: 'Water system', options: { body: 'Agency published a lift · 10/13/2026', tag: 'lifted:id' } })
  await dispatch('notificationclick', { notification: { close: () => {}, data: shown[0].options.data } })
  expect(opened).toEqual(['https://app.example.org/'])
})
it('handles malformed pushes honestly and never intercepts/caches agency or API fetches', async () => {
  const { dispatch, shown } = await worker()
  await dispatch('push', { data: { json: () => { throw new Error('malformed') } } })
  expect(shown[0].options.body).toContain('Check the app')
  const code = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  expect(code).not.toMatch(/addEventListener\(['"]fetch/)
})
