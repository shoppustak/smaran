-- Smaran demo fixtures.
--
-- Every row created here is tagged locality_key = 'smaran-demo'; teardown keys off
-- that marker alone, so it can never touch a real purohit/yajman/ledger row.
-- Re-runnable: teardown-then-insert, with fixed UUIDs.
--
-- Params (psql -v):
--   phone         purohit's WhatsApp number, digits only, as Meta sends it (no '+')
--   yajman_phone  family-side number for the corroboration/subscription demo ('' to skip)
--   upi           purohit's UPI VPA — appears in the dakshina deep link
--
-- Design notes that matter (see scripts/demo/README.md):
--   * time and resolved_* are PRE-POPULATED so the day-sheet never calls Vedika
--     (it reads the cache first and only falls back to panchang when cold).
--     The day-sheet SKIPS any row with a null time — hence every event sets it.
--   * Event 0026 is deliberately Pausha/Krishna/30 to match the Vedika *sandbox*
--     constant, which is what lets the daily-brain cron actually fire a pre-ritual
--     card. That is the entry point to the whole dakshina loop.

BEGIN;

-- ---------------------------------------------------------------- teardown
DELETE FROM ledger            WHERE locality_key = 'smaran-demo';
DELETE FROM lapse_recoveries  WHERE purohit_id IN (SELECT id FROM purohits WHERE locality_key = 'smaran-demo');
DELETE FROM ingest_jobs       WHERE purohit_id IN (SELECT id FROM purohits WHERE locality_key = 'smaran-demo');
DELETE FROM events            WHERE purohit_id IN (SELECT id FROM purohits WHERE locality_key = 'smaran-demo');
DELETE FROM yajmans           WHERE locality_key = 'smaran-demo';
DELETE FROM onboarding_state  WHERE phone_number = :'phone';
DELETE FROM purohits          WHERE locality_key = 'smaran-demo';

-- ---------------------------------------------------------------- purohit
-- locality_key 'smaran-demo' is the teardown marker. Varanasi lat/long is real so
-- panchang calls are geographically sane once the production tier is provisioned.
INSERT INTO purohits (id, phone_number, name, city, latitude, longitude, locality_key, upi_id, calendar_system, plan)
VALUES ('d0000000-0000-4000-8000-000000000001', :'phone', 'पं. रमेश शर्मा',
        'Varanasi', 25.3176, 82.9739, 'smaran-demo', :'upi', 'purnimanta', 'trial');

-- ---------------------------------------------------------------- yajmans
-- Sharma carries the family-side number: it receives the post-ritual confirm card
-- and (because family_sub_status='none') the ₹29 subscription offer afterwards.
INSERT INTO yajmans (id, purohit_id, family_name, gotra, whatsapp_number, locality_key, consent_status, family_sub_status)
VALUES
  ('d0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 'शर्मा',  'कश्यप',    NULLIF(:'yajman_phone', ''), 'smaran-demo', 'confirmed', 'none'),
  ('d0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 'गुप्ता', 'भारद्वाज', NULL, 'smaran-demo', 'confirmed', 'none'),
  ('d0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000001', 'वर्मा',  'वत्स',     NULL, 'smaran-demo', 'confirmed', 'none'),
  ('d0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000001', 'मिश्रा', 'गौतम',    NULL, 'smaran-demo', 'confirmed', 'none'),
  ('d0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000001', 'तिवारी', 'शांडिल्य', NULL, 'smaran-demo', 'confirmed', 'none');

-- ---------------------------------------------------------------- events
-- resolved_date is seeded relative to today so "my week" always has content.
-- Windows are varied, and 0022/0023 share a date to show window grouping.
INSERT INTO events (id, yajman_id, purohit_id, time, event_type, maas, paksha, tithi, label, source,
                    resolved_date, resolved_window, resolved_cycle_year)
VALUES
  -- day +1, morning
  ('d0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000001',
   '07:30', 'shraddh', 'Shravana', 'Krishna', 12, 'पितृ श्राद्ध', 'manual',
   (CURRENT_DATE + 1)::timestamptz, 'morning', EXTRACT(YEAR FROM CURRENT_DATE)::smallint),

  -- day +2, morning  <-- COLLISION ANCHOR: Shravana / Shukla / Ekadashi(11) / morning
  ('d0000000-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001',
   '09:00', 'katha', 'Shravana', 'Shukla', 11, 'सत्यनारायण कथा', 'manual',
   (CURRENT_DATE + 2)::timestamptz, 'morning', EXTRACT(YEAR FROM CURRENT_DATE)::smallint),

  -- day +2, evening (same date, different window -> proves window grouping)
  ('d0000000-0000-4000-8000-000000000023', 'd0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000001',
   '18:30', 'birthday', 'Shravana', 'Shukla', 11, 'जन्मदिन पूजा', 'manual',
   (CURRENT_DATE + 2)::timestamptz, 'evening', EXTRACT(YEAR FROM CURRENT_DATE)::smallint),

  -- day +4, afternoon
  ('d0000000-0000-4000-8000-000000000024', 'd0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000001',
   '13:00', 'katha', 'Shravana', 'Shukla', 13, 'रुद्राभिषेक', 'manual',
   (CURRENT_DATE + 4)::timestamptz, 'afternoon', EXTRACT(YEAR FROM CURRENT_DATE)::smallint),

  -- day +6, morning
  ('d0000000-0000-4000-8000-000000000025', 'd0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001',
   '08:00', 'shraddh', 'Shravana', 'Krishna', 30, 'अमावस्या श्राद्ध', 'manual',
   (CURRENT_DATE + 6)::timestamptz, 'morning', EXTRACT(YEAR FROM CURRENT_DATE)::smallint),

  -- BRAIN-DEMO EVENT. Pausha/Krishna/30 matches the Vedika sandbox's fixed payload,
  -- which reports every day as Pausha Krishna Amavasya. That is what makes the
  -- daily-brain cron match this event and dispatch a real pre-ritual card, whose
  -- booking-confirm button opens the dakshina loop. resolved_date is left NULL so it
  -- does not clutter the day-sheet until the brain stamps it.
  ('d0000000-0000-4000-8000-000000000026', 'd0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001',
   '10:00', 'katha', 'Pausha', 'Krishna', 30, 'सत्यनारायण कथा', 'manual',
   NULL, NULL, NULL);

-- ---------------------------------------------------------------- ledger: deliberately NOT seeded
--
-- A pre-staged pending row (amount NULL) looks tempting but BREAKS THE DEMO.
-- findAwaitingAmountEntry (ledger.ts:158) matches exactly `payment_status='pending'
-- AND amount_collected IS NULL`, and the webhook checks it for every inbound text
-- that isn't "my week"/"referral" (whatsapp.ts:428) — BEFORE ordinary handling.
-- So a seeded pending row swallows the purohit's first message (e.g. the landing
-- page's "नमस्ते स्मरण") and answers "कृपया सही दक्षिणा राशि भेजें".
--
-- The ritual-completed tap calls createLedgerEntry itself (whatsapp.ts:1131), so the
-- row appears exactly when it should and the amount-capture window stays scoped to
-- the moment after the tap. Leave this unseeded.
--
-- (Root cause is the Phase 3 amount-capture prompt having no TTL/cancellation — see
--  "Deferred robustness" in .planning/STATE.md.)

COMMIT;

-- ---------------------------------------------------------------- summary
SELECT 'purohits' AS table, count(*) FROM purohits WHERE locality_key = 'smaran-demo'
UNION ALL SELECT 'yajmans', count(*) FROM yajmans WHERE locality_key = 'smaran-demo'
UNION ALL SELECT 'events',  count(*) FROM events  WHERE purohit_id = 'd0000000-0000-4000-8000-000000000001'
UNION ALL SELECT 'ledger (must be 0 — see note above)', count(*) FROM ledger WHERE locality_key = 'smaran-demo';
