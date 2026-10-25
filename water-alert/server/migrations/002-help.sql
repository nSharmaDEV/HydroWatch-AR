BEGIN;
-- Private server-owned help state; no browser/Data API grants are added.
ALTER TABLE water_alert.state DROP CONSTRAINT IF EXISTS state_key_check;
ALTER TABLE water_alert.state ADD CONSTRAINT state_key_check CHECK (key IN ('observations', 'devices', 'help'));
REVOKE ALL ON water_alert.state FROM PUBLIC;
COMMIT;
