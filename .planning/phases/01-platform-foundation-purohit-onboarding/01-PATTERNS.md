# Phase 1: Platform Foundation & Purohit Onboarding - Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 12 (new + modified)
**Analogs found:** 10 / 12 (2 have no direct in-repo analog — schema files and UPI validation util)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `code/artifacts/api-server/src/routes/whatsapp.ts` | route/controller | event-driven (webhook) + request-response (send) | itself (existing file, to be extended) | exact — extend in place |
| `code/artifacts/api-server/src/lib/onboarding.ts` (new) | service | CRUD (read/write `purohits` row) + transform (free-text → field) | `code/artifacts/api-server/src/routes/keepalive.ts` (DB-access gating) | role-match |
| `code/artifacts/api-server/src/lib/geocoding.ts` (new) | service/utility | request-response (external API proxy) | `code/artifacts/api-server/src/routes/panchang.ts` | exact (shape) |
| `code/artifacts/api-server/src/lib/upi.ts` (new, optional) | utility | transform (regex validation, no I/O) | none in-repo | no analog |
| `code/lib/db/src/schema/purohits.ts` (new) | model | CRUD | `code/lib/db/src/schema/index.ts` template comment (lines 4-18) | no analog (template only) |
| `code/lib/db/src/schema/yajmans.ts` (new) | model | CRUD | same as above | no analog (template only) |
| `code/lib/db/src/schema/events.ts` (new) | model | CRUD | same as above | no analog (template only) |
| `code/lib/db/src/schema/ledger.ts` (new) | model | CRUD | same as above | no analog (template only) |
| `code/lib/db/src/schema/index.ts` | model barrel | CRUD (re-export) | itself (currently `export {}` placeholder) | exact — fill in placeholder |
| `code/lib/api-spec/openapi.yaml` | config/contract | request-response (contract def) | `/keepalive` path + `KeepaliveStatus` schema addition (lines 107-145) | exact — same pipeline |
| `code/artifacts/api-server/.env.example` | config | n/a | itself (existing file) | exact — extend in place |
| `tests/api/whatsapp.spec.ts` | test | event-driven + request-response | itself + `tests/api/keepalive.spec.ts` | exact |

## Pattern Assignments

### `code/artifacts/api-server/src/routes/whatsapp.ts` (route/controller, event-driven + request-response)

**Analog:** itself (`code/artifacts/api-server/src/routes/whatsapp.ts`) — this is a **modify-in-place** task, not a from-scratch file. The webhook POST handler is the single entry point for onboarding; extend it, don't replace its shape.

**Current webhook handler — the exact spot Phase 1 replaces** (lines 94-118):
```typescript
// Meta calls this for every inbound message / status update.
router.post("/whatsapp/webhook", (req, res) => {
  // Always 200 immediately -- Meta retries aggressively on non-2xx responses.
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const messages = change?.value?.messages;
    if (!Array.isArray(messages)) return;

    for (const msg of messages) {
      if (msg.type !== "text") continue;
      inboundMessages.push({
        from: msg.from,
        text: msg.text?.body ?? "",
        receivedAt: new Date().toISOString(),
      });
      if (inboundMessages.length > MAX_MESSAGES) inboundMessages.shift();
      req.log.info({ from: msg.from }, "Received WhatsApp message");
    }
  } catch (err) {
    req.log.error({ err }, "Failed to parse WhatsApp webhook payload");
  }
});
```
**Critical constraint to preserve:** `res.sendStatus(200)` fires *before* any processing — Meta retries aggressively on non-2xx. Any new async onboarding logic (DB read/write, Nominatim geocode, Vedika panchang call, Meta send-reply) must happen *after* the early 200, inside the existing try/catch, never blocking the response.

**Outbound send pattern to reuse for onboarding replies** (lines 20-71, the `/whatsapp/send` handler's Graph API call):
```typescript
const upstream = await fetch(
  `https://graph.facebook.com/${GRAPH_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  },
);
```
**Recommended refactor:** extract this fetch block into a shared `sendWhatsappMessage(to, message)` helper (e.g. in the new `src/lib/onboarding.ts` or a `src/lib/whatsapp-client.ts`) so both `/whatsapp/send` and the webhook's onboarding replies call the same function instead of duplicating the Graph API call. This keeps `GRAPH_API_VERSION`/token handling in one place.

**Imports pattern** (lines 1-2):
```typescript
import { Router, type IRouter } from "express";
import { SendWhatsappMessageResponse, ListWhatsappMessagesResponseItem } from "@workspace/api-zod";
```

---

### `code/artifacts/api-server/src/lib/onboarding.ts` (new — service, CRUD + transform)

**Analog:** `code/artifacts/api-server/src/routes/keepalive.ts` for the **mandatory DB-access gating pattern** — every new file that touches `@workspace/db` must follow this exactly, since `@workspace/db`'s entrypoint throws at import time if `DATABASE_URL` is unset.

**Dynamic-import DB pattern to copy exactly** (`keepalive.ts` lines 15-31):
```typescript
// @workspace/db throws at import time if DATABASE_URL is unset (see
// lib/db/src/index.ts) — so the import is dynamic and gated behind an env check,
// not static, otherwise requiring this file at all would crash the server before
// Phase 1 wires up a real database.
router.get("/keepalive", async (req, res) => {
  let database: "ok" | "cold" | "not_configured" = "not_configured";

  if (process.env.DATABASE_URL) {
    try {
      const { pool } = await import("@workspace/db");
      await pool.query("SELECT 1");
      database = "ok";
    } catch (err) {
      req.log.warn({ err }, "Keepalive DB warm query failed (still returning 200)");
      database = "cold";
    }
  }
  ...
```
**Applied to onboarding.ts:** the same shape — `if (process.env.DATABASE_URL) { const { db, purohits } = await import("@workspace/db"); ... }` — never a static top-level `import { db } from "@workspace/db"`. Since D-03 requires the onboarding state machine to be usable at all (not degrade gracefully like keepalive), this phase is where `DATABASE_URL` becomes a **hard requirement in production** per CONTEXT.md — but the E2E suite still boots without it, so the gate must stay.

**Note on drizzle query builders:** `code/artifacts/api-server/package.json` already lists `drizzle-orm` as a direct dependency (not just via `@workspace/db`) — pure query-builder functions like `eq()` can be statically imported from `"drizzle-orm"` directly (they don't touch env vars), only the `db`/`pool` client itself needs the dynamic-import gate.

**State-machine keying (D-03):** resume-by-`phone_number` — the `purohits.phone_number` column is `UNIQUE NOT NULL` per the fixed schema (`.planning/intel/constraints.md` §"Database Schema"). Look up by `eq(purohits.phoneNumber, from)` on every inbound webhook message; if a row exists with incomplete fields, resume at the next unanswered field instead of restarting.

---

### `code/artifacts/api-server/src/lib/geocoding.ts` (new — service, request-response external API proxy)

**Analog:** `code/artifacts/api-server/src/routes/panchang.ts` — this is the closest shape in the repo for "call a free external geo/data API, normalize the response, handle upstream failure."

**Imports + env-var base-URL switch pattern** (lines 1-18):
```typescript
import { Router, type IRouter } from "express";
import { GetPanchangResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Vedika API (https://vedika.io) provides Hindu Panchang / astrology data.
// We call the free sandbox for now (no API key, mock data, same response shape
// as production). To go live, set VEDIKA_API_KEY and VEDIKA_API_BASE_URL
// (e.g. https://api.vedika.io) and this route will automatically switch over.
const VEDIKA_API_KEY = process.env.VEDIKA_API_KEY;
const VEDIKA_BASE_URL = VEDIKA_API_KEY
  ? (process.env.VEDIKA_API_BASE_URL ?? "https://api.vedika.io")
  : "https://api.vedika.io/sandbox";
```
**Applied to geocoding (D-05, Nominatim):** unlike Vedika, Nominatim needs **no API key and no sandbox/production split** — it's a single free GET endpoint (`https://nominatim.openstreetmap.org/search`). So `geocoding.ts` is actually *simpler* than `panchang.ts`: no env-var base-URL flip needed, just a fixed base URL constant. Do still honor Nominatim's usage-policy requirement of a descriptive `User-Agent` header (not present in any existing fetch call in this repo — new for this integration).

**Fetch + upstream error handling pattern** (lines 26-45):
```typescript
try {
  const upstream = await fetch(`${VEDIKA_BASE_URL}/astrology/panchang`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ... },
    body: JSON.stringify({ datetime, latitude, longitude, timezone: DEFAULT_TIMEZONE }),
  });

  if (!upstream.ok) {
    req.log.error({ status: upstream.status }, "Vedika Panchang API returned an error");
    res.status(502).json({ error: "Failed to fetch Panchang data from Vedika API" });
    return;
  }
  ...
} catch (err) {
  req.log.error({ err }, "Failed to reach Vedika Panchang API");
  res.status(502).json({ error: "Failed to reach Vedika API" });
}
```
**Applied to geocoding:** same `if (!upstream.ok) { log + 502-equivalent }` / `catch { log + fallback }` shape — but since `geocoding.ts` is a **library function** called from within the webhook handler (not its own route), the "502" becomes a thrown/returned error the caller (`onboarding.ts`) handles by asking the purohit to retype the city, not an HTTP response.

**Response normalization with fallbacks pattern** (lines 50-74, `.parse()` with `??` defaults) — same discipline should apply: don't trust upstream field presence, default/guard every field before use (e.g. Nominatim's `lat`/`lon` are strings, not numbers — must `Number()`-coerce).

---

### `code/artifacts/api-server/src/lib/upi.ts` (new, optional — utility, transform/validation)

**No analog found in repo.** D-04 requires format-check-only UPI ID validation (regex against `name@bankhandle` shape). No existing validation utility module exists anywhere in `code/artifacts/api-server/src`. Closest structural precedent is the manual type/shape checks already inline in `whatsapp.ts`'s `/whatsapp/send` handler:
```typescript
const { to, message } = req.body ?? {};
if (typeof to !== "string" || typeof message !== "string") {
  res.status(400).json({ error: "Body must include 'to' and 'message' strings" });
  return;
}
```
Follow this same "guard clause, no exceptions, explicit rejection message" style for the UPI regex check — this can live as a small pure function (`isValidUpiId(value: string): boolean`) called from `onboarding.ts`, no route of its own needed.

---

### `code/lib/db/src/schema/*.ts` (new — model, CRUD)

**No analog found** — `code/lib/db/src/schema/index.ts` is currently an empty placeholder (`export {}`) with only a comment template; no real Drizzle table has ever been defined in this repo. The comment template *is* the pattern to follow (lines 4-18 of the current file):
```typescript
// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;
```
**Confirmed conventions to follow:**
- One file per table (`purohits.ts`, `yajmans.ts`, `events.ts`, `ledger.ts`), each re-exported from `schema/index.ts` via `export * from "./purohits";` etc.
- Use `drizzle-zod`'s `createInsertSchema` for the insert-shape zod schema (package already installed: `drizzle-zod: ^0.8.3` per `code/lib/db/package.json`).
- Table + column definitions must match the **fixed SQL schema exactly** — `.planning/intel/constraints.md` §"Database Schema" (sourced from `docs/smaran-blueprint-v3.md` Part 6, lines 97-152). Key columns for `purohits`: `id UUID PK`, `phone_number TEXT UNIQUE NOT NULL`, `name`, `city`, `latitude DOUBLE PRECISION`, `longitude DOUBLE PRECISION`, `locality_key TEXT`, `upi_id TEXT`, `calendar_system TEXT DEFAULT 'purnimanta'`, `plan TEXT DEFAULT 'trial'`, `renews_at`, `trial_ends_at`, `referred_by_purohit_id UUID REFERENCES purohits(id)`, `created_at`. All four tables (`purohits`, `yajmans`, `events`, `ledger`) must be created this phase even though only `purohits` gets real writes.
- After schema files are written, the established push mechanism is `pnpm --dir code --filter @workspace/db run push` (or `push-force`), per `code/lib/db/package.json`'s scripts — this uses `drizzle-kit push` against `drizzle.config.ts`, which itself already throws if `DATABASE_URL` is unset (`code/lib/db/drizzle.config.ts` lines 4-6) — no migration-file generation step exists in this repo yet, push is the only mechanism.

**`code/lib/db/src/index.ts` — read-only reference, no changes needed:**
```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
```
This confirms: once schema files export tables, `db`/`pool`/all table objects become available from `@workspace/db`'s single entrypoint — exactly what `onboarding.ts`'s dynamic `import("@workspace/db")` will destructure from.

---

### `code/lib/api-spec/openapi.yaml` (config/contract)

**Analog:** the existing `/keepalive` path + `KeepaliveStatus` schema addition is the exact worked pipeline to repeat, documented in `docs/superpowers/plans/2026-07-13-staging-prod-infra.md` Task 2.

**Path pattern** (openapi.yaml lines 107-122):
```yaml
  /keepalive:
    get:
      operationId: keepalive
      tags: [health]
      summary: Keep-warm endpoint for external uptime pingers
      description: >
        Always returns 200, even when the database is unreachable or not configured —
        ...
      responses:
        "200":
          description: Always returned, regardless of database state
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/KeepaliveStatus"
```

**Schema pattern** (lines 132-145):
```yaml
    KeepaliveStatus:
      type: object
      properties:
        status:
          type: string
        database:
          type: string
          enum: [ok, cold, not_configured]
        timestamp:
          type: string
      required:
        - status
        - database
        - timestamp
```

**Codegen step (mandatory after any openapi.yaml edit):**
```bash
cd /Users/maulik/smaran
pnpm --dir code --filter @workspace/api-spec run codegen
```
This regenerates `code/lib/api-zod/src/generated/api.ts` (never hand-edit generated files; edit `openapi.yaml` and regenerate). `code/lib/api-zod/src/index.ts` just re-exports `./generated/api` and `./generated/types` — no manual wiring needed after codegen.

**Whether Phase 1 needs a new path at all:** D-01 confirms onboarding is 100% webhook-driven free-form conversation — no new purohit-facing HTTP endpoint is required by the requirements. If the planner adds an internal/ops-only inspection endpoint (e.g. `GET /purohits/:phone` for manual verification, mirroring `GET /whatsapp/messages`'s "no frontend consumer but still zod-validated" precedent), follow the `WhatsappInboundMessage`/`listWhatsappMessages` shape (lines 43-57, 243-255) — array response, one schema per list item, `tags: [whatsapp]`-style tagging (would need a new `purohits` or `onboarding` tag added to the `tags:` block at lines 10-16).

---

### `code/artifacts/api-server/.env.example` (config)

**Analog:** itself — extend in place, same section-comment style as existing entries.

**Current file (full):**
```bash
# Required — server throws on boot if unset (see src/index.ts)
PORT=3000

# Optional — Vedika Panchang API. Unset = sandbox (fixed mock payload, no key needed).
# Set both to switch to production.
VEDIKA_API_KEY=
VEDIKA_API_BASE_URL=

# Optional — Meta WhatsApp Cloud API. Unset = /whatsapp/send returns 502 "not configured".
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
# Shared secret for the GET /whatsapp/webhook verify handshake — any string you choose,
# must match what's entered in the Meta App Dashboard's webhook config.
WHATSAPP_VERIFY_TOKEN=

# Optional — Postgres (Drizzle ORM, code/lib/db). Unset = GET /keepalive reports
# database: "not_configured" and no query is attempted. Once set, @workspace/db's
# module-level code runs on first import — see Global Constraints above.
DATABASE_URL=
```
**Update needed:** the `DATABASE_URL` comment must change from "optional" to reflect Phase 1's shift — CONTEXT.md states Phase 1 is "the first phase where `DATABASE_URL` becomes a hard requirement in production" (already provisioned per KB — `smaran-prod`/`smaran-dev` Supabase projects exist). Nominatim needs no new secret (no API key), so no new blank `=` line is strictly required beyond a comment noting it's used, unless the planner wants an explicit `NOMINATIM_BASE_URL` override for testability (optional, following the `VEDIKA_API_BASE_URL` override precedent).

---

### `tests/api/whatsapp.spec.ts` (test)

**Analog:** itself + `tests/api/keepalive.spec.ts` for the "always-200, assert JSON body shape" pattern.

**Webhook POST test pattern to extend** (`whatsapp.spec.ts` lines 36-60):
```typescript
test("POST /whatsapp/webhook records an inbound text message, visible via GET /whatsapp/messages", async ({ request }) => {
  const from = "15559998888";
  const text = `e2e probe ${Date.now()}`;

  const webhookRes = await request.post("/api/whatsapp/webhook", {
    data: {
      entry: [{ changes: [{ value: { messages: [{ from, type: "text", text: { body: text } }] } }] }],
    },
  });
  expect(webhookRes.status()).toBe(200);

  const messagesRes = await request.get("/api/whatsapp/messages");
  const messages = await messagesRes.json();
  expect(messages[0]).toMatchObject({ from, text });
});
```
**Applied to onboarding:** new tests should POST the same webhook shape with onboarding-relevant text bodies (e.g. purohit's name, then city, then UPI ID, then calendar system in sequence) and assert on the bot's reply content via whatever inspection mechanism the planner adds (either `GET /whatsapp/messages`-equivalent outbound log, or a direct DB read if `DATABASE_URL` is set in the test environment — note `tests/api/keepalive.spec.ts` proves the E2E suite currently runs **without** `DATABASE_URL` set, so DB-asserting tests need their own gating or a test-only DB connection string).

---

## Shared Patterns

### DB access gating (mandatory for every new DB-touching file)
**Source:** `code/artifacts/api-server/src/routes/keepalive.ts` lines 15-31
**Apply to:** `onboarding.ts`, any new route/lib file that reads/writes `purohits`/`yajmans`/`events`/`ledger`
```typescript
if (process.env.DATABASE_URL) {
  const { db, purohits } = await import("@workspace/db"); // dynamic, never static top-level
  // ... query
}
```
Reason: `@workspace/db`'s entrypoint (`code/lib/db/src/index.ts` lines 7-11) throws at import time if `DATABASE_URL` is unset, and the E2E suite boots without it.

### Response validation via generated zod schema
**Source:** every existing route (`health.ts`, `panchang.ts`, `keepalive.ts`, `whatsapp.ts`) — e.g. `health.ts` lines 6-8:
```typescript
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
```
**Apply to:** any new HTTP-facing response, even internal/ops-only endpoints — `.parse()` against a schema generated from `openapi.yaml`, never send raw unvalidated objects.

### Env-var-driven external-API base-URL switching
**Source:** `code/artifacts/api-server/src/routes/panchang.ts` lines 10-13
**Apply to:** any Meta test-app-vs-production-app switching this phase needs (per CONTEXT.md code_context — WhatsApp already does this via `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` presence, no new pattern needed there, but keep the same shape if a Meta app-ID switch is ever introduced).

### Route registration
**Source:** `code/artifacts/api-server/src/routes/index.ts` (full file, 15 lines)
```typescript
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keepaliveRouter from "./keepalive";
import panchangRouter from "./panchang";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keepaliveRouter);
router.use(panchangRouter);
router.use(whatsappRouter);

export default router;
```
**Apply to:** if the planner adds any new route file (e.g. a purohits inspection endpoint), register it here the same way — no new route file is needed for onboarding itself since it lives inside the existing `whatsapp.ts` webhook handler.

### Logging
**Source:** every route uses `req.log.info/warn/error({ ... }, "message")` (pino-http, via `code/artifacts/api-server/src/lib/logger.ts`) — never `console.log`. E.g. `whatsapp.ts` line 113: `req.log.info({ from: msg.from }, "Received WhatsApp message");`
**Apply to:** all new onboarding-flow log statements.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `code/lib/db/src/schema/purohits.ts` (+ yajmans/events/ledger) | model | CRUD | No Drizzle table has ever been defined in this repo — `schema/index.ts` is an empty placeholder. Follow the comment template inside that file (extracted above) plus the fixed SQL schema in `.planning/intel/constraints.md`. |
| `code/artifacts/api-server/src/lib/upi.ts` | utility | transform | No validation-utility module exists yet. Follow the inline guard-clause style already used in `whatsapp.ts`'s `/whatsapp/send` handler (`typeof x !== "string"` checks) as the closest stylistic precedent. |

## Metadata

**Analog search scope:** `code/artifacts/api-server/src/**`, `code/lib/db/src/**`, `code/lib/api-spec/**`, `code/lib/api-zod/src/**`, `tests/api/**`, `.planning/intel/constraints.md`, `docs/superpowers/plans/2026-07-13-staging-prod-infra.md`
**Files scanned:** 14 (whatsapp.ts, panchang.ts, keepalive.ts, health.ts, routes/index.ts, db/index.ts, schema/index.ts, drizzle.config.ts, db/package.json, api-server/package.json, api-server/.env.example, openapi.yaml, api-zod/index.ts, whatsapp.spec.ts, keepalive.spec.ts)
**Pattern extraction date:** 2026-07-14
