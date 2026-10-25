import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import { databaseOptions } from '../server/database-connection'

// Explicit operator command only; never invoked by a build or request handler.
const raw = process.env.DATABASE_URL_ADMIN
if (!raw) throw new Error('Set DATABASE_URL_ADMIN for the approved database; never commit it')
const pool = new Pool(databaseOptions(raw, process.env.DATABASE_SSL_CA))
try {
  await pool.query(await readFile(new URL('../server/migrations/001-cloud.sql', import.meta.url), 'utf8'))
  await pool.query(await readFile(new URL('../server/migrations/002-help.sql', import.meta.url), 'utf8'))
  console.log('Water Alert cloud schema initialized. Configure a restricted runtime role before deploying.')
} finally { await pool.end() }
