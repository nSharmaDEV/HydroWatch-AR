// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'

it('limits runtime access to the private app tables and denies public and browser roles', { timeout: 20000 }, async () => {
  const db = new PGlite()
  try {
    await db.exec(await readFile(new URL('../server/migrations/001-cloud.sql', import.meta.url), 'utf8'))
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;')
    // Simulate inherited provider grants: the access script must revoke them explicitly.
    await db.exec('GRANT USAGE ON SCHEMA water_alert TO anon, authenticated, service_role; GRANT SELECT ON ALL TABLES IN SCHEMA water_alert TO anon, authenticated, service_role;')
    await db.exec(await readFile(new URL('../server/runtime-role.sql', import.meta.url), 'utf8'))
    const roles = await db.query<{ rolcanlogin: boolean; rolsuper: boolean; rolcreaterole: boolean; rolcreatedb: boolean; rolbypassrls: boolean }>("SELECT rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls FROM pg_roles WHERE rolname='water_alert_runtime'")
    expect(roles.rows).toEqual([{ rolcanlogin: false, rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolbypassrls: false }])
    const tables = await db.query<{ relrowsecurity: boolean }>("SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='water_alert' AND c.relkind='r'")
    expect(tables.rows).toHaveLength(4)
    expect(tables.rows.every(t => t.relrowsecurity)).toBe(true)
    await db.exec('SET ROLE water_alert_runtime')
    await db.exec(`INSERT INTO water_alert.state(key,value) VALUES ('observations','{"count":1}'); UPDATE water_alert.state SET value='{"count":2}';`)
    expect((await db.query('SELECT value FROM water_alert.state')).rows).toEqual([{ value: { count: 2 } }])
    await expect(db.exec('CREATE TABLE water_alert.forbidden(id int)')).rejects.toThrow(/permission denied/)
    await expect(db.exec('TRUNCATE water_alert.state')).rejects.toThrow(/permission denied/)
    await db.exec('DELETE FROM water_alert.state; RESET ROLE')
    for (const role of ['anon', 'authenticated', 'service_role']) {
      await db.exec(`SET ROLE ${role}`)
      await expect(db.query('SELECT * FROM water_alert.state')).rejects.toThrow(/permission denied/)
      await db.exec('RESET ROLE')
    }
    // An existing role might be someone else's: fail rather than silently change its grants.
    await expect(db.exec(await readFile(new URL('../server/runtime-role.sql', import.meta.url), 'utf8'))).rejects.toThrow(/already exists/)
    await db.exec('ROLLBACK')
  } finally { await db.close() }
})
