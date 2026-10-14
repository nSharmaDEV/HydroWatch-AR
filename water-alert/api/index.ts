import type { IncomingMessage, ServerResponse } from 'node:http'
import { Pool } from 'pg'
import { createCloudApp } from '../server/cloud'
import { cloudConfig } from '../server/cloud-config'
import { databaseOptions } from '../server/database-connection'

let app: ReturnType<typeof createCloudApp> | undefined
export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!app) {
      const config = cloudConfig(process.env)
      const pool = new Pool(databaseOptions(config.databaseUrl, process.env.DATABASE_SSL_CA))
      pool.on('error', () => { /* No credentials, endpoint or database errors in public logs. */ })
      app = createCloudApp(pool, config)
    }
    app(req, res)
  } catch {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ error: 'Cloud service is not configured' }))
  }
}
