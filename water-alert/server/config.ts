export function runtimeConfig(env: NodeJS.ProcessEnv) {
  const origin = env.WATER_ALERT_ORIGIN ?? 'http://localhost:5178'
  const url = new URL(origin)
  if (url.origin !== origin || url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('WATER_ALERT_ORIGIN must be an exact HTTPS origin (or local development origin)')
  const port = Number(env.PORT ?? 8788)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  let push: { publicKey: string; privateKey: string; subject: string } | null = null
  if (env.WATER_ALERT_PUSH_ENABLED === 'true') {
    const publicKey = env.VAPID_PUBLIC_KEY; const privateKey = env.VAPID_PRIVATE_KEY; const subject = env.VAPID_SUBJECT
    if (!publicKey || !privateKey || !subject || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) throw new Error('Push requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and a real VAPID_SUBJECT contact')
    push = { publicKey, privateKey, subject }
  }
  return { origin, port, host: env.HOST ?? '127.0.0.1', dataDirectory: env.WATER_ALERT_DATA_DIR, push }
}
