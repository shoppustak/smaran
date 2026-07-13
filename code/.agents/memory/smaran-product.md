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

## Vedika Panchang API integration

`GET /api/panchang` on `artifacts/api-server` proxies to Vedika's sandbox (`https://api.vedika.io/sandbox/astrology/panchang`, POST, no API key needed) and normalizes the response into the `Panchang` OpenAPI schema. Frontend consumes it via `useGetPanchang()` from `@workspace/api-client-react` (see the widget on the Smaran dashboard).

Quirks discovered when wiring this up:
- The sandbox endpoint **ignores the request's `datetime`/lat/long and always returns the same fixed mock payload** (dated 1995-01-01) — it exists to prove out API shape/plumbing, not to compute real dates. Don't rely on it for "resolve this tithi to a real date" logic; that needs the paid production tier.
- Response nesting differs from what you'd guess: `data.tithi.paksha` is an object (`{id, name}`), not a string — read `data.tithi.paksha.name`. `data.masa`, `data.nakshatra`, `data.disha_shool` (snake_case) are separate top-level objects under `data`.
- Switching sandbox → production is designed to be just an env var flip: set `VEDIKA_API_KEY` (and optionally `VEDIKA_API_BASE_URL`, default `https://api.vedika.io`) and the route auto-switches base URL + adds the Bearer header — no code changes needed.

**Why this matters:** future work extending Panchang usage (e.g. real lapse/conflict date resolution) will hit the "always returns 1995-01-01" limitation immediately — budget for the production tier before treating sandbox output as real dates.

## WhatsApp test layer (Meta Cloud API)

Chose Meta's own WhatsApp Cloud API (not Twilio) for testing, since the blueprint's real target stack is Meta — user explicitly picked this over the Twilio Sandbox connector to avoid a vendor mismatch later. Implemented as `POST /api/whatsapp/send`, `GET/POST /api/whatsapp/webhook`, `GET /api/whatsapp/messages` on `artifacts/api-server`, with a live test panel on the Smaran Settings page. Inbound messages are stored in-memory only (no DB yet, per project scope).

Verified working end-to-end: inbound message from a real WhatsApp number reached the webhook and rendered in the UI within seconds; outbound send correctly reaches Meta's Graph API (confirmed via the expected "recipient not in allowed list" error for an unverified test number).

Quirks discovered when wiring this up:
- Meta's test-mode setup requires *two separate steps* that are easy to miss: (1) entering the callback URL + verify token in WhatsApp → Configuration, and (2) separately clicking "Subscribe" on the "messages" webhook field in the same page. Step 1 alone registers the URL but sends zero webhook calls — step 2 is what actually triggers delivery.
- Using the same string for the access token and the verify token is harmless — they're compared independently (one is a Bearer credential for outbound Graph API calls, the other is just an echoed handshake secret for the webhook GET).
- Test-mode sending only works to phone numbers pre-added as verified test recipients in the Meta dashboard, and only within the 24-hour window opened by that recipient messaging the test number first.

**Why this matters:** this is a test/proof-of-concept integration path, distinct from the blueprint's real production WhatsApp requirement — but since it already uses the real Meta Cloud API (not Twilio), the same route/webhook code should carry forward largely unchanged into production (swap test number/token for a verified business number).
