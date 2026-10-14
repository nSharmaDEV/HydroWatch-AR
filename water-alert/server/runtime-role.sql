-- Operator-only access setup; no automatic request/build execution.
-- Apply once AFTER 001-cloud.sql. Existing role names cause rollback, not modification.
BEGIN;
CREATE ROLE water_alert_runtime NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
REVOKE ALL ON SCHEMA water_alert FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA water_alert FROM PUBLIC;
DO $$
DECLARE browser_role text;
BEGIN
  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA water_alert FROM %I', browser_role);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA water_alert FROM %I', browser_role);
    END IF;
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA water_alert TO water_alert_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON water_alert.state, water_alert.jobs, water_alert.rate_limits, water_alert.captures TO water_alert_runtime;
ALTER TABLE water_alert.state ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_alert.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_alert.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_alert.captures ENABLE ROW LEVEL SECURITY;
-- Server-only role owns the app's access decisions; no browser/client policies.
CREATE POLICY runtime_access ON water_alert.state TO water_alert_runtime USING (true) WITH CHECK (true);
CREATE POLICY runtime_access ON water_alert.jobs TO water_alert_runtime USING (true) WITH CHECK (true);
CREATE POLICY runtime_access ON water_alert.rate_limits TO water_alert_runtime USING (true) WITH CHECK (true);
CREATE POLICY runtime_access ON water_alert.captures TO water_alert_runtime USING (true) WITH CHECK (true);
COMMIT;
