// @vitest-environment node
import { expect, test } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
test('private help state migration is repeatable and not granted to browser roles', async () => {
  const db = new PGlite()
  try {
    await db.exec(await readFile(new URL('../server/migrations/001-cloud.sql', import.meta.url), 'utf8'))
    const sql = await readFile(new URL('../server/migrations/002-help.sql', import.meta.url), 'utf8')
    await db.exec(sql); await db.exec(sql)
    await db.query('INSERT INTO water_alert.state(key,value) VALUES ($1,$2)', ['help', '{"requests":[]}'])
    expect((await db.query("SELECT value FROM water_alert.state WHERE key='help'")).rows).toHaveLength(1)
    expect((await db.query("SELECT has_table_privilege('public', 'water_alert.state', 'SELECT') AS allowed")).rows).toEqual([{ allowed: false }])
  } finally { await db.close() }
}, 20000)
