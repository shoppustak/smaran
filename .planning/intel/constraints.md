# Constraints (SPEC intel)

Synthesized by gsd-doc-synthesizer · mode: new

Source doc: `smaran-blueprint-v3.md` (classified SPEC, confidence: medium). Content spans platform/API contracts, a full database schema, and a set of strict negative constraints — split below by constraint type per the classifier's multi-source note.

---

## Platform & API Contracts

**Title:** Core platform stack
**Type:** api-contract
**Content:**
- WhatsApp Cloud API — interface only, never system of record.
- Supabase (PostgreSQL + Edge Functions) — the system of record.
- Vedika API — all Panchang (lunar calendar) computation; no custom astronomical logic is to be built.
- Raw dynamic UPI deep links to the purohit's own merchant VPA — no PSP, no payment gateway.
- Bot must be registered with Meta as a task-specific agent ("ritual calendar and ledger assistant for Hindu priests") per the 2026 general-purpose-AI prohibition.
- All business-initiated outbound messaging uses registered Utility templates (₹0.115–0.15/msg); conversational follow-ups ride free user-initiated 24h service windows.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 5 preamble, line 61)

---

## Database Schema

**Title:** Core relational schema (Postgres/Supabase)
**Type:** schema
**Content:**

```sql
CREATE TABLE purohits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  locality_key TEXT NOT NULL,
  upi_id TEXT NOT NULL,
  calendar_system TEXT NOT NULL DEFAULT 'purnimanta',  -- purnimanta | amanta
  plan TEXT NOT NULL DEFAULT 'trial',   -- trial | annual | monthly | lapsed
  renews_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  referred_by_purohit_id UUID REFERENCES purohits(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE yajmans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purohit_id UUID NOT NULL REFERENCES purohits(id),
  family_name TEXT NOT NULL,
  gotra TEXT,
  whatsapp_number TEXT,
  locality_key TEXT,
  consent_status TEXT NOT NULL DEFAULT 'pending',  -- DPDP: pending | granted | withdrawn
  family_sub_status TEXT NOT NULL DEFAULT 'none',  -- none | active | lapsed | cancelled
  family_sub_renews_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  yajman_id UUID NOT NULL REFERENCES yajmans(id),
  event_type TEXT NOT NULL,             -- shraddh | katha | birthday | griha_pravesh | ...
  maas TEXT NOT NULL,
  paksha TEXT NOT NULL,                 -- 'Shukla' | 'Krishna'
  tithi SMALLINT NOT NULL,              -- 1-15
  last_performed_year SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purohit_id UUID NOT NULL REFERENCES purohits(id),
  yajman_id UUID NOT NULL REFERENCES yajmans(id),
  event_id UUID REFERENCES events(id),
  amount_collected NUMERIC(10,2),
  payment_status TEXT NOT NULL DEFAULT 'pending',  -- pending | claimed | corroborated
  purohit_claimed_at TIMESTAMPTZ,
  family_confirmed_at TIMESTAMPTZ,
  locality_key TEXT NOT NULL,           -- denormalized for density queries
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Design note:** `locality_key` is denormalized onto `ledger` so per-locality activation/event/corroboration density is computable without cross-table joins — density is the leading indicator for the M0-4 growth gate.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 6, lines 97-152)

---

## Negative Constraints (Strict)

**Type:** protocol
**Note:** Source doc phrases these as permanent rules ("ever" / "never can be"). Classifier did not score this section as ADR (no Status/Context/Decision/Consequences structure, `locked: false` on the classification record) — see `decisions.md` for the LOCKED-eligibility caveat.

1. No marketplace, ratings, search, matching, or discovery — ever. Trust is computed from corroborated interactions, never declared or rated. Families must never see, compare, or reach any other purohit.
2. No consumer app or web UI. The family-side WhatsApp flow (cards, confirms, ₹29 calendar subscription) is in scope; an app, portal, or catalog is not.
3. No payment gateways or PSP checkout. Raw dynamic UPI deep links to the purohit's merchant VPA only. Zero commission is the point.
4. No webhook-driven payment states. No webhook will ever arrive. Corroboration buttons are the only path to `corroborated`; never trust a single side's client-side assertion.
5. No samagri commerce. The samagri list is the value; kits, inventory, and fulfilment are out of scope.
6. No diaspora/NRI payment flows in v1. International UPI is deferred.
7. No marketing blasts. Registered Utility templates only.
8. No system of record on WhatsApp. WhatsApp is the interface; PostgreSQL is the truth.
9. No custom Panchang engine. Vedika API only.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 7, lines 154-164)

---

## Non-Functional / Compliance Requirements

**Type:** nfr
**Content:**
- DPDP Act 2023: gotra and death-anniversary data are religious personal data. Minimal collection; consent line at family-side first contact (`consent_status` field); deletion-on-request must be a built function, not a manual promise.
- Meta 2026: task-specific agent registration required; Utility-template discipline enforced (see api-contract above).
- Domain: must use a trust-signaling TLD (smaran.in-class); a disposable-feeling domain contradicts the brand promise.

source: /Users/maulik/smaran/docs/smaran-blueprint-v3.md (Part 8, lines 166-170)
