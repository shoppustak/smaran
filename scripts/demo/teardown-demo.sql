-- Remove every Smaran demo fixture.
--
-- Keys off locality_key = 'smaran-demo' only, so real purohits/yajmans/ledger rows
-- are never touched. Also clears anything the demo itself created (ingest jobs from
-- voice notes, events from confirmed bookings, lapse rows) via the demo purohit id.
--
-- Params (psql -v): phone — the demo purohit's number, to clear any onboarding_state.

BEGIN;

DELETE FROM ledger            WHERE locality_key = 'smaran-demo';
DELETE FROM lapse_recoveries  WHERE purohit_id IN (SELECT id FROM purohits WHERE locality_key = 'smaran-demo');
DELETE FROM ingest_jobs       WHERE purohit_id IN (SELECT id FROM purohits WHERE locality_key = 'smaran-demo');
DELETE FROM events            WHERE purohit_id IN (SELECT id FROM purohits WHERE locality_key = 'smaran-demo');
DELETE FROM yajmans           WHERE locality_key = 'smaran-demo';
DELETE FROM onboarding_state  WHERE phone_number = :'phone';
DELETE FROM purohits          WHERE locality_key = 'smaran-demo';

COMMIT;

SELECT 'remaining demo purohits' AS check, count(*) FROM purohits WHERE locality_key = 'smaran-demo';
