/* Push-only worker; no offline cache of potentially stale advisory status. */
function appUrl(value) {
  try {
    const url = new URL(value || '/', self.location.origin)
    if (url.origin === self.location.origin && url.pathname === '/') return url.href
  } catch {}
  return self.location.origin + '/'
}
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('push', event => {
  let payload = {}
  try { payload = event.data?.json() || {} } catch {}
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'WellPower: WAVE'
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 700) : 'Check the app and official agency source. The notification details could not be read.'
  event.waitUntil(self.registration.showNotification(title, { body, tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 180) : 'water-alert-unreadable', icon: '/icon-192.png', data: { url: appUrl(payload.url) } }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = appUrl(event.notification.data?.url)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        if ('navigate' in client) await client.navigate(url)
        return client.focus()
      }
    }
    return self.clients.openWindow(url)
  })())
})
