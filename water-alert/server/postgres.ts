import { randomUUID } from 'node:crypto'
export interface SqlConnection { query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; release(): void }
export interface SqlPool { connect(): Promise<SqlConnection> }
export interface StateCell<T> { read(): Promise<T>; update<R>(apply: (state: T) => R): Promise<R> }
export class PostgresCell<T> implements StateCell<T> {
  constructor(private pool: SqlPool, private key: string, private initial: () => T) {}
  async read(): Promise<T> {
    const client = await this.pool.connect()
    try {
      const { rows } = await client.query('SELECT value FROM water_alert.state WHERE key = $1', [this.key])
      return rows.length ? rows[0].value as T : this.initial()
    } finally { client.release() }
  }
  async update<R>(apply: (state: T) => R): Promise<R> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("SET LOCAL lock_timeout = '3s'")
      await client.query("SET LOCAL statement_timeout = '5s'")
      await client.query('INSERT INTO water_alert.state(key,value) VALUES ($1,$2::jsonb) ON CONFLICT DO NOTHING', [this.key, JSON.stringify(this.initial())])
      const { rows } = await client.query('SELECT value FROM water_alert.state WHERE key = $1 FOR UPDATE', [this.key])
      const state = rows[0].value as T
      const result = apply(state)
      if (result instanceof Promise) throw new Error('Network work must not run inside a state transaction')
      await client.query('UPDATE water_alert.state SET value = $2::jsonb WHERE key = $1', [this.key, JSON.stringify(state)])
      await client.query('COMMIT')
      return result
    } catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  }
}
export class JobGate {
  constructor(private pool: SqlPool, private clock = Date.now) {}
  async claim(name: string, cooldown: number, lease: number): Promise<string | null> {
    const client = await this.pool.connect(); const now = this.clock(); const token = randomUUID()
    try {
      const { rows } = await client.query(`INSERT INTO water_alert.jobs(name,token,started_at,leased_until) VALUES ($1,$2,$3,$4)
        ON CONFLICT(name) DO UPDATE SET token=EXCLUDED.token,started_at=EXCLUDED.started_at,leased_until=EXCLUDED.leased_until
        WHERE water_alert.jobs.started_at <= $5 AND water_alert.jobs.leased_until <= $3 RETURNING token`, [name, token, now, now + lease, now - cooldown])
      return rows.length ? token : null
    } finally { client.release() }
  }
  async release(name: string, token: string): Promise<void> {
    const client = await this.pool.connect()
    try { await client.query('UPDATE water_alert.jobs SET leased_until=0 WHERE name=$1 AND token=$2', [name, token]) }
    finally { client.release() }
  }
  async allow(key: string, limit: number): Promise<boolean> {
    const client = await this.pool.connect(); const now = this.clock()
    try {
      await client.query('DELETE FROM water_alert.rate_limits WHERE started_at <= $1', [now - 60000])
      const { rows } = await client.query(`INSERT INTO water_alert.rate_limits(key,started_at,count) VALUES ($1,$2,1)
        ON CONFLICT(key) DO UPDATE SET count=water_alert.rate_limits.count+1 RETURNING count`, [key, now])
      return Number(rows[0].count) <= limit
    } finally { client.release() }
  }
}
