// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { Client } from 'pg'
import { databaseOptions } from '../server/database-connection'

describe('verified pooled database connection', () => {
  it('uses one connection and cannot disable TLS verification through URL flags', () => {
    const options = databaseOptions('postgresql://water_alert_runtime.project:password@pooler.example:6543/postgres?ssl=0&sslmode=disable&sslrootcert=ignored&application_name=water-alert')
    expect(options.max).toBe(1)
    expect(options.ssl).toEqual({ rejectUnauthorized: true })
    const url = new URL(options.connectionString!)
    expect(url.searchParams.has('sslmode')).toBe(false)
    expect(url.searchParams.has('sslrootcert')).toBe(false)
    expect(url.searchParams.has('ssl')).toBe(false)
    expect(new Client(options).ssl).toEqual({ rejectUnauthorized: true })
    expect(url.searchParams.get('application_name')).toBe('water-alert')
    expect(options.connectionTimeoutMillis).toBe(5000)
  })
  it('accepts an explicitly supplied certificate authority and rejects invalid certificate data', () => {
    // Syntactically valid PEM is checked here; actual TLS trust is checked by pg at connection time.
    const ca = '-----BEGIN CERTIFICATE-----\nY2VydGlmaWNhdGU=\n-----END CERTIFICATE-----'
    expect(databaseOptions('postgres://runtime:password@pooler.example/postgres', ca).ssl).toEqual({ rejectUnauthorized: true, ca })
    expect(() => databaseOptions('postgres://runtime:password@pooler.example/postgres', 'not a certificate')).toThrow('Database CA must be PEM')
    expect(() => databaseOptions('http://pooler.example/postgres')).toThrow('PostgreSQL URL required')
  })
})
