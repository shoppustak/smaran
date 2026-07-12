---
name: Smaran product scope
description: What Smaran is and its hard negative constraints, for any future work on this project.
---

Smaran is a WhatsApp-native ledger/calendar for independent Hindu priests (purohits) tracking yajman (patron family) relationships, lunar-calendar ritual dates (tithis), lapse recovery, schedule conflicts, and dakshina (ritual payment) corroboration.

Real product negative constraints (from the founder's blueprint, Part 7):
- No marketplace, ratings, search, or discovery of priests/families — ever.
- No consumer web/app UI for the actual product — WhatsApp is the interface, Postgres is the system of record.
- No payment gateway/PSP — raw UPI deep links to the purohit's own VPA only.
- No webhook-driven payment state — corroboration is two-sided button taps only (pending → claimed → corroborated).
- Requires Vedika API for all Panchang (lunar calendar) computation — never build custom astronomical logic.

**Why this matters for future work:** the first build (in `artifacts/smaran`) is an internal/demo react-vite web dashboard with mock data, explicitly requested by the user as a preview surface — it is not a violation of the "no consumer web UI" rule, but the *real* production experience must stay WhatsApp-only when the backend is built. Don't assume the web app is the end-state UI.

**How to apply:** before adding backend/WhatsApp features, re-check this file so new work doesn't silently reintroduce marketplace/discovery patterns or payment webhooks that the blueprint explicitly forbids.
