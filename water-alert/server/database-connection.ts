import type { PoolConfig } from 'pg'
export function databaseOptions(raw: string, ca?: string): PoolConfig {
  const url = new URL(raw)
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.pathname.slice(1)) throw new Error('PostgreSQL URL required')
  // pg lets connection-string SSL options override explicit config. Keep one verified source of truth.
  for (const key of [...url.searchParams.keys()]) if (key.startsWith('ssl') || key === 'uselibpqcompat') url.searchParams.delete(key)
  if (ca !== undefined && (ca.length > 65536 || !/^-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----\s*$/.test(ca))) throw new Error('Database CA must be PEM')
  return {
    connectionString: url.href, max: 1, idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, query_timeout: 5000, statement_timeout: 5000,
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, allowExitOnIdle: true,
  }
}
