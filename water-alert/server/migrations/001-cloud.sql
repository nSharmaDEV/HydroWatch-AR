BEGIN;
CREATE SCHEMA IF NOT EXISTS water_alert;
REVOKE ALL ON SCHEMA water_alert FROM PUBLIC;
CREATE TABLE IF NOT EXISTS water_alert.state (
  key text PRIMARY KEY CHECK (key IN ('observations', 'devices')),
  value jsonb NOT NULL CHECK (jsonb_typeof(value) = 'object')
);
CREATE TABLE IF NOT EXISTS water_alert.jobs (
  name text PRIMARY KEY,
  token uuid NOT NULL,
  started_at bigint NOT NULL,
  leased_until bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS water_alert.rate_limits (
  key text PRIMARY KEY,
  started_at bigint NOT NULL,
  count integer NOT NULL CHECK (count > 0)
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON water_alert.rate_limits(started_at);
CREATE TABLE IF NOT EXISTS water_alert.captures (
  agency text PRIMARY KEY CHECK (agency IN ('ADH', 'ADEQ')),
  body text NOT NULL CHECK (octet_length(body) <= 2000000),
  metadata jsonb NOT NULL
);
REVOKE ALL ON ALL TABLES IN SCHEMA water_alert FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA water_alert REVOKE ALL ON TABLES FROM PUBLIC;
COMMIT;
