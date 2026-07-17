# Smaran demo runbook

Shows the real product — real backend, real WhatsApp, real DB — with a seeded roster so the
demo starts from an established purohit mid-season rather than an empty account.

## What is real vs rigged

| Real (no rigging) | Rigged |
|---|---|
| Voice/photo ingestion → extraction → confirm card | The roster (5 families + events) is seeded |
| Double-booking collision + force/cancel | Event dates are **pre-resolved** (`resolved_date`), so the day-sheet never calls Vedika |
| Dakshina: amount capture → two-sided corroboration → UPI deep link | The brain-demo event is tuned to match the Vedika **sandbox** constant so the cron fires |
| Subscription offer → ownership-checked activation | |
| Referral card + observed-k | |
| Per-purohit isolation | |

**The one thing this demo does not prove: tithi → real Gregorian date resolution.** That needs the
paid Vedika production tier (`VEDIKA_API_KEY`); the sandbox returns a fixed 1995-01-01 payload for
every request. Dates in the day-sheet are seeded, not computed. Don't claim otherwise — a purohit
who knows their calendar will check.

## Setup (once)

1. **Meta**: the demo purohit's phone AND the family phone must be added as **test recipients**.
   Webhook callback → `https://api.smaran.click/api/whatsapp/webhook`, and the `messages` field
   must be **Subscribed** (a separate click from saving the URL — saving alone delivers nothing).
2. **Render env**: `WHATSAPP_APP_SECRET` must be the App Secret of *the same Meta app* that sends
   the webhook. A mismatch → every message 401s **silently**. If you rotated the secret, update it.
3. **Access token**: the temporary token expires in **24h**. Use a System User token, or replies
   will 502 mid-demo.

## Seed

```bash
export DEMO_PUROHIT_PHONE=919876543210   # digits only, exactly as Meta sends `from`
export DEMO_YAJMAN_PHONE=919812345678    # second test-recipient phone (family side)
export DEMO_UPI='ramesh.sharma@okhdfcbank'
scripts/demo/demo.sh seed --yes          # writes to smaran-prod
```

Everything is tagged `locality_key = 'smaran-demo'`. Re-running re-seeds cleanly.

## Run of show

**First: message the bot from the purohit phone** (anything — "namaste"). This opens the 24h
window. Every card below is then delivered **free-form**, which is why no Meta template approval
is needed. Outside that window, proactive sends fall back to free-form too, but only inside 24h
will they actually arrive.

1. **`my week`** (or `इस हफ्ते`) — the money shot. Real dates, grouped by muhurat window;
   day +2 has both a morning katha and an evening birthday, which shows the grouping.
2. **Voice note** → send a booking for the *same slot as the anchor*:
   > "शर्मा परिवार, सत्यनारायण कथा, श्रावण शुक्ल एकादशी"
   Extraction → confirm card → tap **✓** → **double-booking warning** (it collides with the
   seeded 09:00 katha on the same tithi + morning window). Show **force** and **cancel**.
   *Collision is a pure tuple match on (maas, paksha, tithi, window) — no rigging, no panchang.*
3. **Trigger the brain** (from your laptop) to fire the pre-ritual card:
   ```bash
   curl -X POST https://api.smaran.click/api/cron/daily-brain -H "x-cron-secret: $CRON_SECRET"
   ```
   The purohit gets a pre-ritual card (template send fails → free-form fallback → delivers).
4. **Tap "Confirm ritual"** (`booking-confirm`) → ack + a **"ritual completed?"** card.
5. **Tap it** → amount prompt → reply **`2100`** → dakshina cards go out:
   purohit gets **"दक्षिणा प्राप्त हुई"**, family gets a confirm card + the **UPI deep link to the
   purohit's own VPA** (money never touches the platform — worth saying out loud).
6. **Purohit taps "Dakshina received"** → `claimed`. **Family taps "Confirm"** → `corroborated`.
   Neither side alone can mark it paid.
7. **The family then gets the ₹29/month calendar offer** (fires automatically on ledger-confirm
   because `family_sub_status='none'`). Tap **"मैंने सदस्यता ले ली"** → active.
8. **`referral`** (or `आमंत्रण`) → referral card with the invite link.
9. Optional, for a technical audience:
   ```bash
   curl -s https://api.smaran.click/api/metrics/observed-k -H "X-Internal-Key: $INTERNAL_API_KEY"
   ```

## Keep off screen

- **Onboarding** — the wow card renders `Tarikh: 1995-01-01` (Vedika sandbox). Seeding the purohit
  is what skips it.
- Any claim that dates are computed live.

## Teardown

```bash
scripts/demo/demo.sh teardown --yes
```

Removes only `locality_key='smaran-demo'` rows, plus anything the demo created under the demo
purohit (ingest jobs, confirmed events, lapse rows). Real data is never matched.

## If it goes quiet mid-demo

| Symptom | Cause |
|---|---|
| Nothing arrives at all | 24h window closed → message the bot again; or `messages` field not Subscribed |
| Webhook 401s, bot silent | `WHATSAPP_APP_SECRET` ≠ the sending app's secret (check first if you rotated it) |
| Replies 502 | Access token expired (24h) |
| Bot treats you as a new user | `DEMO_PUROHIT_PHONE` ≠ Meta's `from` format (no `+`) |
| Day-sheet empty | Seed didn't run, or `resolved_cycle_year` ≠ current year |
