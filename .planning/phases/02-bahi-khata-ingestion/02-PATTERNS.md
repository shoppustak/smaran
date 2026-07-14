# Phase 2: Bahi Khata Ingestion - Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 19 (new + modified)
**Analogs found:** 14 / 19 (5 have no direct in-repo analog — canonical vocab data files, fuzzy-match utility, AsrProvider interface itself, transcode sidecar, and the eval harness's actual logic)

**Ground-truth note:** Phase 1's planned files (`onboarding.ts`, `geocoding.ts`, `upi.ts`, the four `code/lib/db/src/schema/*.ts` table files) have **not landed in the repo yet** — `whatsapp.ts` still does `if (msg.type !== "text") continue;` and `schema/index.ts` is still the empty `export {}` placeholder (verified directly, not assumed from Phase 1's docs). So every analog below points at the same **currently-real** files Phase 1's own PATTERNS.md used (`keepalive.ts`, `panchang.ts`, `whatsapp.ts`, the schema placeholder comment) rather than at Phase-1-authored files that don't exist yet. If Phase 1 lands first, its `onboarding.ts` (state-machine-by-identity) and `schema/purohits.ts` (real Drizzle table) become *better* analogs than the ones cited here — the planner should re-check for their existence before falling back to this map.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `code/artifacts/api-server/src/routes/whatsapp.ts` | route/controller | event-driven (webhook) + request-response | itself (existing file, extend in place) | exact — extend in place |
| `code/artifacts/api-server/src/lib/ingest.ts` (new) | service | CRUD (`ingest_jobs` state machine) + event-driven | `keepalive.ts` (DB-gating) + Phase 1's planned `onboarding.ts` shape (phone-keyed resumable state, not yet real) | role-match |
| `code/artifacts/api-server/src/lib/media.ts` (new) | service | request-response (external API, binary fetch) | `whatsapp.ts`'s `/whatsapp/send` Graph API fetch block (lines 34-60) | role-match (auth header shape) |
| `code/artifacts/api-server/src/lib/asr/types.ts` (new) | model/interface | n/a (type-only) | none — first adapter-interface file in repo | no analog |
| `code/artifacts/api-server/src/lib/asr/sarvam.ts` (new) | service | request-response (external API proxy) | `code/artifacts/api-server/src/routes/panchang.ts` | exact (shape) |
| `code/artifacts/api-server/src/lib/asr/openai.ts` (new) | service | request-response (external API proxy) | `code/artifacts/api-server/src/routes/panchang.ts` | exact (shape) |
| `code/artifacts/api-server/src/lib/asr/index.ts` (new) | service (factory) | request-response | `panchang.ts`'s env-var-gated base-URL switch (lines 10-13) | role-match (provider switch, not URL switch) |
| `code/artifacts/api-server/src/lib/extraction.ts` (new) | service | request-response (external LLM API, JSON-mode) | `code/artifacts/api-server/src/routes/panchang.ts` | role-match |
| `code/artifacts/api-server/src/lib/vision.ts` (new, §10 photo path) | service | request-response (external vision LLM API) | `extraction.ts` (once built) / `panchang.ts` | role-match |
| `code/artifacts/api-server/src/lib/vocab/maas.ts` `tithi.ts` `paksha.ts` `gotra.ts` (new) | model/data | transform (lookup tables) | none — first pure-data-file module in repo | no analog |
| `code/artifacts/api-server/src/lib/fuzzy-match.ts` (new) | utility | transform (Levenshtein, pure function) | none — closest stylistic precedent is Phase 1's planned `upi.ts` guard-clause style (not yet real); actual precedent is `whatsapp.ts`'s inline `typeof x !== "string"` guards (lines 29-32) | no analog (pure-function precedent only) |
| `code/artifacts/api-server/src/lib/confirm-card.ts` (new) | service | request-response (WhatsApp interactive message builder + send) | `whatsapp.ts`'s `/whatsapp/send` Graph API fetch block (lines 34-60) | role-match |
| `code/lib/db/src/schema/ingest-jobs.ts` (new) | model | CRUD | `code/lib/db/src/schema/index.ts` template comment (lines 1-18) | no analog (template only, same as Phase 1) |
| `code/lib/db/src/schema/events.ts` (modify — add `label`/`source`/`ingest_job_id`) | model | CRUD | same template + Phase 1's not-yet-real `events.ts` | no analog (template only) |
| `code/lib/db/src/schema/yajmans.ts` (modify — add `source`) | model | CRUD | same template + Phase 1's not-yet-real `yajmans.ts` | no analog (template only) |
| `code/lib/api-spec/openapi.yaml` (new paths: ingest-job inspection, retention purge trigger) | config/contract | request-response (contract def) | `/keepalive` path + `KeepaliveResponse` schema (lines 107-122 route, ~lines in schemas block) | exact — same pipeline |
| `code/artifacts/api-server/.env.example` | config | n/a | itself (existing file, extend) | exact — extend in place |
| `code/scripts/src/eval-harness.ts` (new, §11) | utility/CLI | batch (offline eval run) | `code/scripts/src/hello.ts` (package convention only, logic is new) | role-match (thin — package shape, not logic) |
| `tests/api/ingest.spec.ts` (new) | test | event-driven + request-response | `tests/api/whatsapp.spec.ts` | exact |
| Transcode sidecar (contingent on Spike 1, separate deployable) | service | request-response (media transform) | none in repo — external Fly.io/Railway container | no analog |

## Pattern Assignments

### `code/artifacts/api-server/src/routes/whatsapp.ts` (route/controller, event-driven + request-response)

**Analog:** itself — modify in place, extend the existing webhook loop, don't replace its shape.

**Current message-type filter to extend** (lines 105-114) — currently drops everything but text:
```typescript
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
```
**Applied to Phase 2:** add `msg.type === "audio"` and `msg.type === "image"` branches alongside the existing `text` branch (both onboarding's text path from Phase 1 and this phase's audio/image path share the same `for (const msg of messages)` loop and the same early `res.sendStatus(200)` above it). Per §3, an audio message carries `msg.audio.id` (media ID) and optionally `msg.audio.voice === true`; an image message carries `msg.image.id`. Each should call into the new `ingest.ts` service to create an `ingest_jobs` row and kick off Stage B (download), never block the webhook response.

**Critical constraint to preserve** (line 96-97): `res.sendStatus(200)` fires *before* any processing — Meta retries aggressively on non-2xx. All new async ingestion logic (media download, ASR call, extraction call, DB writes, confirm-card send) must happen after the early 200, inside the existing try/catch, never awaited before the response.

**Outbound send pattern to reuse for the ack + confirm card** (lines 34-60, the `/whatsapp/send` handler's Graph API call):
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
**Applied to Phase 2:** the immediate ack ("सुन लिया, एक क्षण…", §3) reuses this exact shape with `type: "text"`. The confirm card (§6) needs the same auth header + endpoint but `type: "interactive"` with a `button`/`list` payload instead of `text` — same fetch/error-handling skeleton, different `body` shape. Recommend extracting this fetch into a shared `sendWhatsappMessage(to, payload)` helper (as Phase 1's PATTERNS.md also recommended) so `/whatsapp/send`, the onboarding ack, the ingestion ack, and the confirm card all share one Graph API call site.

**Imports pattern** (lines 1-2):
```typescript
import { Router, type IRouter } from "express";
import { SendWhatsappMessageResponse, ListWhatsappMessagesResponseItem } from "@workspace/api-zod";
```

---

### `code/artifacts/api-server/src/lib/ingest.ts` (new — service, CRUD state machine + event-driven)

**Analog:** `code/artifacts/api-server/src/routes/keepalive.ts` for the **mandatory DB-access gating pattern** (every file touching `@workspace/db` must follow this).

**Dynamic-import DB pattern to copy exactly** (`keepalive.ts` lines 15-31, same excerpt Phase 1 used):
```typescript
// @workspace/db throws at import time if DATABASE_URL is unset (see
// lib/db/src/index.ts) — so the import is dynamic and gated behind an env check.
if (process.env.DATABASE_URL) {
  const { db, pool } = await import("@workspace/db");
  ...
}
```
**Applied to `ingest.ts`:** `if (process.env.DATABASE_URL) { const { db, ingestJobs } = await import("@workspace/db"); ... }` — never a static top-level import. This phase's `ingest_jobs` table is a hard write target (not gracefully-degrading like keepalive), so treat `DATABASE_URL` absence the way Phase 1 treats it for onboarding: log and fail the ingest attempt with an apology template, don't crash the process.

**State-machine keying (resumability philosophy, per CONTEXT.md §"Integration Points"):** Phase 1's onboarding state resumes by `purohits.phone_number` (UNIQUE column); this phase's `ingest_jobs` state machine resumes by `ingest_job_id` instead — a *new* job per voice note/photo, not a shared row per phone number. The status enum (§3, §9) is:
```
received → transcribed → extracted → awaiting_confirm → confirmed | rejected | failed
```
Model the transition function the same way Phase 1's PATTERNS.md modeled onboarding-field resumption: look up the job by ID, check current `status`, only advance forward (never regress), write `updated_at` on every transition. D-03/D-04 confirm no reminder-nudge or retry-scheduling logic is needed this phase — a stalled `awaiting_confirm` job just waits for either a purohit tap or a superseding re-record (§6 "re-record supersedes").

**Note on drizzle query builders (same note Phase 1's PATTERNS.md made):** `drizzle-orm` is already a direct dependency of `api-server` — pure query-builder functions like `eq()` can be statically imported from `"drizzle-orm"` directly; only the `db`/`pool` client needs the dynamic-import gate.

---

### `code/artifacts/api-server/src/lib/media.ts` (new — service, request-response external API, binary fetch)

**Analog:** `whatsapp.ts`'s `/whatsapp/send` handler (lines 20-70) for the Meta Graph API auth-header shape — this is the closest existing "authenticated fetch against `graph.facebook.com` using `WHATSAPP_ACCESS_TOKEN`" precedent in the repo. No existing route does a two-step fetch (resolve media URL, then fetch bytes), so the *shape* to copy is the bearer-token header + error-handling skeleton, not the full flow.

**Auth header pattern to copy** (lines 39-41):
```typescript
headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
},
```
**Applied to `media.ts`:** per §3, this becomes two calls — `GET https://graph.facebook.com/{GRAPH_API_VERSION}/{media_id}` (with the same bearer header, no body) to resolve the short-lived download URL, then an immediate second `fetch` against that URL (also bearer-authed) to get bytes. **Critical: download immediately, never store the URL** — it expires in ~5 minutes (§3). Guard rails from §3 to implement as early returns: reject audio >5 min, cap retries at 3 then transition the job to `failed`.

**Error handling pattern to copy** (lines 54-60, same `if (!upstream.ok)` shape used everywhere in this repo):
```typescript
if (!upstream.ok) {
  req.log.error({ status: upstream.status, body }, "Meta WhatsApp API returned an error");
  res.status(502).json({ error: body?.error?.message ?? "..." });
  return;
}
```
**Applied to `media.ts`:** since this is a **library function** called from the webhook handler (not its own route), the 502 becomes a thrown/returned error that `ingest.ts` catches and turns into `ingest_jobs.status = 'failed'` + `error` column + apology template — same "library function vs. route" adjustment Phase 1's PATTERNS.md made for `geocoding.ts`.

---

### `code/artifacts/api-server/src/lib/asr/*.ts` (new — AsrProvider interface + Sarvam/OpenAI adapters, service, request-response)

**Analog:** `code/artifacts/api-server/src/routes/panchang.ts` — the established "call a free/keyed external API, normalize response, handle upstream failure" shape. This is the primary reusable pattern for this phase's most novel piece.

**Env-var-gated base-URL/key switch pattern** (`panchang.ts` lines 10-13):
```typescript
const VEDIKA_API_KEY = process.env.VEDIKA_API_KEY;
const VEDIKA_BASE_URL = VEDIKA_API_KEY
  ? (process.env.VEDIKA_API_BASE_URL ?? "https://api.vedika.io")
  : "https://api.vedika.io/sandbox";
```
**Applied to `asr/index.ts` (the factory/switch):** the spec (§4) requires this to be a **provider switch**, not a sandbox/prod URL switch — `AsrProvider` implementations for Sarvam and OpenAI both live behind a single interface, and the active one is chosen by a config value (e.g. `ASR_PROVIDER=sarvam|openai`, defaulting to `sarvam` per D-01's "primary"), not by whether a key is present. Mirror the *shape* (env var branches to a concrete implementation) not the literal key-presence logic.

**Fetch + upstream error handling pattern** (`panchang.ts` lines 26-45):
```typescript
try {
  const upstream = await fetch(`${VEDIKA_BASE_URL}/astrology/panchang`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ... },
    body: JSON.stringify({ ... }),
  });
  if (!upstream.ok) {
    req.log.error({ status: upstream.status }, "Vedika Panchang API returned an error");
    res.status(502).json({ error: "..." });
    return;
  }
  ...
} catch (err) {
  req.log.error({ err }, "Failed to reach Vedika Panchang API");
  res.status(502).json({ error: "..." });
}
```
**Applied to `asr/sarvam.ts` and `asr/openai.ts`:** same `if (!upstream.ok)` / `catch` skeleton, but as library functions (like `geocoding.ts`/`media.ts` above) they throw/return a typed error for `ingest.ts` to catch, not an HTTP response. Both implement the exact interface locked by §4:
```typescript
interface AsrProvider {
  transcribe(audio: Bytes, opts: { languageHint: "hi-IN" }): Promise<{
    transcript: string;
    providerMeta?: unknown;
  }>;
}
```
**Hard constraint from §4 (repeat for emphasis, it's load-bearing for the planner):** "No other call site may import a provider SDK directly — everything goes through the adapter." This means `ingest.ts` imports only `AsrProvider`/the factory from `asr/index.ts`, never `asr/sarvam.ts` or `asr/openai.ts` directly.

**Response normalization discipline** (`panchang.ts` lines 50-74, `??` defaults on every field) — same discipline applies: don't trust upstream field presence; the `transcript` field must always resolve to a string (empty string, not `undefined`, on a degenerate response) since Stage E's extraction call expects a string input.

---

### `code/artifacts/api-server/src/lib/extraction.ts` and `vision.ts` (new — service, request-response, JSON-mode LLM call)

**Analog:** `panchang.ts` again — same external-API-proxy shape, JSON body in, JSON body out, `.parse()` against a schema before use.

**Applied to `extraction.ts`:** per §5.1, one LLM call, JSON-mode, `temperature: 0`, system prompt embeds the canonical vocabularies (§5.2) and demands the exact shape documented in `docs/ref-state-2-plan.md` §5.1 (`family_name`, `gotra`, `whatsapp_number`, `events[]`, `confidence_notes`). D-02 leaves the model choice open (Claude Haiku 4.5 / Gemini Flash / Sarvam-M, decided by the eval harness bake-off) — so this file should be written against a **model-agnostic JSON-mode call shape** (the specific SDK/endpoint is a build-time decision the eval harness makes, not something to hardcode ahead of the bake-off). Validate the parsed JSON against a zod schema mirroring §5.1's shape before handing it to Stage F (`fuzzy-match.ts`) — same "`.parse()` before use" discipline as every other route in this repo.

**Applied to `vision.ts` (§10 photo delta):** same call shape as `extraction.ts` but with an image input instead of a transcript string, and `events[]` may span multiple families per page (the one structural difference called out in §10). Reuse `extraction.ts`'s JSON-schema validation and prompt-construction helpers rather than duplicating them — write `extraction.ts` first with an eye toward sharing its prompt/schema code with `vision.ts`.

---

### `code/artifacts/api-server/src/lib/vocab/{maas,tithi,paksha,gotra}.ts` (new — model/data, transform)

**No analog found.** No pure-data-lookup-table module exists anywhere in the repo yet (the closest structural precedent for "typed constant data shipped as a module" is `panchang.ts`'s `DEFAULT_LATITUDE`/`DEFAULT_LONGITUDE`/`DEFAULT_TIMEZONE` constants, lines 16-18 — but those are three scalars, not lookup tables). §5.2 is explicit these must "ship as data files, not prose" — one file per vocabulary (maas/tithi/paksha/gotra), each exporting a canonical-term → variants map (e.g. `{ canonical: "Chaitra", variants: ["चैत्र", "चैत", "Chait"] }[]`). The exact canonical/variant lists are given verbatim in `docs/ref-state-2-plan.md` §5.2 — transcribe them directly, do not re-derive or paraphrase (Devanagari accuracy matters here).

---

### `code/artifacts/api-server/src/lib/fuzzy-match.ts` (new — utility, transform, pure function)

**No analog found.** No Levenshtein/fuzzy-matching utility exists in the repo. The closest *stylistic* precedent (guard-clause style, explicit rejection, no exceptions) is `whatsapp.ts`'s inline validation (lines 29-32):
```typescript
const { to, message } = req.body ?? {};
if (typeof to !== "string" || typeof message !== "string") {
  res.status(400).json({ error: "Body must include 'to' and 'message' strings" });
  return;
}
```
**Applied to `fuzzy-match.ts`:** a pure function `matchField(heard: string, vocab: VocabEntry[], maxEdits: number): { canonical: string | null; matchScore: number }`, called once per field from Stage F. Implement the exact threshold table from §5.3: **maas/tithi/paksha accept ≤2 edits; gotra ≤1 edit; family_name never auto-corrected** (skip fuzzy-matching entirely for `family_name`, pass it through as-heard). This is unit-testable in isolation per §2's "Stages D–F are pure functions with typed inputs/outputs" — no WhatsApp/DB/network dependency, matching the build-order in §12 step 3 (build+test these before the plumbing in step 5).

---

### `code/artifacts/api-server/src/lib/confirm-card.ts` (new — service, request-response, WhatsApp interactive message)

**Analog:** `whatsapp.ts`'s `/whatsapp/send` Graph API fetch block (lines 34-60) — same endpoint, same bearer auth, different `type`/body shape (`interactive` instead of `text`).

**Applied to `confirm-card.ts`:** builds the WhatsApp Cloud API `interactive` message payload (button reply for `✓`/`✏`, list message for the numbered correction flow and the ≥90%-confidence-gate `❓` prompts) per §6's exact Hindi copy, then sends it via the same `fetch(...graph.facebook.com.../messages, { Authorization: Bearer ... })` shape already established. This file should call whatever shared `sendWhatsappMessage`-style helper is extracted from `whatsapp.ts` during this phase (see that file's Pattern Assignment above) rather than duplicating the fetch block a third time.

---

### `code/lib/db/src/schema/ingest-jobs.ts` (new), `events.ts` / `yajmans.ts` (modify) — model, CRUD

**Analog:** `code/lib/db/src/schema/index.ts`'s template comment (lines 1-18) — the same placeholder-as-pattern Phase 1's PATTERNS.md cited, since no real Drizzle table exists in this repo yet regardless of which phase writes it first:
```typescript
import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
```
**Confirmed conventions to follow (same as Phase 1):** one file per table, re-exported via `export * from "./ingest-jobs";` etc. from `schema/index.ts`; `drizzle-zod`'s `createInsertSchema` for the insert shape (already a dependency, `drizzle-zod: ^0.8.3`).

**Exact DDL to translate to Drizzle** — `docs/ref-state-2-plan.md` §9 (verbatim, this is the addendum CONTEXT.md's canonical_refs points at, layered on top of `.planning/intel/constraints.md`'s base schema):
```sql
ALTER TABLE events ADD COLUMN label TEXT;
ALTER TABLE events ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';  -- voice|photo|manual
ALTER TABLE events ADD COLUMN ingest_job_id UUID;
ALTER TABLE yajmans ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

CREATE TABLE ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purohit_id UUID NOT NULL REFERENCES purohits(id),
  kind TEXT NOT NULL,                    -- 'voice' | 'photo'
  status TEXT NOT NULL DEFAULT 'received',
  -- received|transcribed|extracted|awaiting_confirm|confirmed|rejected|failed
  transcript TEXT,                       -- purged per §8
  extraction JSONB,                      -- purged per §8
  field_scores JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
**If Phase 1's `events.ts`/`yajmans.ts` exist by the time this phase executes:** these are `ALTER TABLE` deltas — add the new columns to the existing Drizzle table definitions, don't recreate the tables. **If Phase 1 hasn't landed yet:** this phase's plan must create `events.ts`/`yajmans.ts` from the base schema (`.planning/intel/constraints.md` §"Database Schema") *plus* these new columns in one pass, and coordinate with whichever phase plan owns table creation to avoid duplicate work — flag this dependency explicitly in planning.

**Push mechanism (same as Phase 1):** `pnpm --dir code --filter @workspace/db run push` (or `push-force`) — `drizzle-kit push` against `drizzle.config.ts`, which itself throws if `DATABASE_URL` is unset. No migration-file generation exists in this repo; push is the only mechanism.

---

### `code/lib/api-spec/openapi.yaml` (new paths — ops inspection of `ingest_jobs`, retention purge trigger)

**Analog:** the `/keepalive` path + `KeepaliveResponse` schema — the exact worked pipeline (also cited by Phase 1's PATTERNS.md).

**Path pattern to repeat** (openapi.yaml lines 107-122):
```yaml
  /keepalive:
    get:
      operationId: keepalive
      tags: [health]
      summary: Keep-warm endpoint for external uptime pingers
      responses:
        "200":
          description: Always returned, regardless of database state
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/KeepaliveStatus"
```
**Applied to Phase 2:** two candidate new paths, both matching this "external pinger hits a GET, deterministic 200" shape:
1. An ops inspection endpoint for `ingest_jobs` (mirrors `GET /whatsapp/messages`'s "no frontend consumer but still zod-validated" precedent, lines 43-57 of `whatsapp.ts` / lines 43-57 of openapi.yaml) — e.g. `GET /ingest-jobs/:id` for manual debugging during the build-order spikes.
2. **Retention purge (§8)** — the repo's only existing precedent for "something that must run periodically without a real job scheduler" is `/keepalive` being hit by an external pinger (cron-job.org, per `keepalive.ts`'s own comment, lines 6-8). Follow the same shape for the 30-day purge: a `POST /ingest-jobs/purge` (or similar) endpoint an external cron pings daily, rather than introducing a new in-process scheduler/cron library — this keeps the "$0-infra posture" Phase 1's PATTERNS.md already established for keepalive.

**Error schema to reuse as-is** (lines 214-221):
```yaml
    ApiErrorMessage:
      type: object
      properties:
        error:
          type: string
      required:
        - error
```

**Codegen step (mandatory after any openapi.yaml edit, unchanged from Phase 1):**
```bash
cd /Users/maulik/smaran
pnpm --dir code --filter @workspace/api-spec run codegen
```
Regenerates `code/lib/api-zod/src/generated/api.ts` — never hand-edit generated files.

**New tag needed:** add an `ingestion` tag to the `tags:` block (lines 10-16 currently has `health`, `panchang`, `whatsapp`) for the new paths.

---

### `code/artifacts/api-server/.env.example` (config)

**Analog:** itself — extend in place, same section-comment style as existing entries (full current file):
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
WHATSAPP_VERIFY_TOKEN=

# Optional — Postgres (Drizzle ORM, code/lib/db). Unset = GET /keepalive reports
# database: "not_configured" and no query is attempted.
DATABASE_URL=
```
**New entries needed, following the same "optional, unset = degraded behavior described in the comment" convention:**
```bash
# Optional — Sarvam Saaras v3 ASR (primary). Unset = ASR calls fail; set ASR_PROVIDER=openai to fall back.
SARVAM_API_KEY=
SARVAM_API_BASE_URL=

# Optional — OpenAI transcribe (ASR fallback, config-switchable).
OPENAI_API_KEY=

# Which AsrProvider implementation to use. Defaults to sarvam (D-01 primary).
ASR_PROVIDER=sarvam

# Extraction-model key(s) — exact var(s) depend on which model the §11 eval
# harness bake-off selects (Claude Haiku 4.5 / Gemini Flash / Sarvam-M). Do not
# pre-populate before the bake-off runs (D-02).
```

---

### `code/scripts/src/eval-harness.ts` (new — utility/CLI, batch)

**Analog:** `code/scripts/src/hello.ts` — thin, but establishes the *package convention* to follow: `@workspace/scripts` is the existing home for standalone `tsx`-run CLI scripts, registered as an npm script.

**Current file (full, 1 line) — the only precedent for this package's shape:**
```typescript
console.log("Hello from @workspace/scripts");
```
**Package script pattern** (`code/scripts/package.json`):
```json
"scripts": {
  "hello": "tsx ./src/hello.ts",
  "typecheck": "tsc -p tsconfig.json --noEmit"
}
```
**Applied to the eval harness:** add an `"eval": "tsx ./src/eval-harness.ts"` script entry, matching §11's required invocation shape `npm run eval -- --provider=sarvam` (note: this needs `pnpm --filter @workspace/scripts run eval -- --provider=sarvam` given this repo's pnpm-workspace convention — §11's `npm run eval` phrasing is spec prose, not a literal command for this repo). The harness itself has no in-repo logic precedent (it's new: load the 20-sample corpus, run each sample through `asr/index.ts` + `extraction.ts`, compute per-field accuracy per §11) — only the *package/CLI shape* is reusable from `hello.ts`.

---

### `tests/api/ingest.spec.ts` (new — test)

**Analog:** `tests/api/whatsapp.spec.ts` — same Playwright `request` fixture pattern, same webhook-payload-POST shape.

**Webhook POST test pattern to extend** (`whatsapp.spec.ts` lines 36-60):
```typescript
test("POST /whatsapp/webhook records an inbound text message, visible via GET /whatsapp/messages", async ({ request }) => {
  const webhookRes = await request.post("/api/whatsapp/webhook", {
    data: {
      entry: [{ changes: [{ value: { messages: [{ from, type: "text", text: { body: text } }] } }] }],
    },
  });
  expect(webhookRes.status()).toBe(200);
  ...
});
```
**Applied to ingestion:** POST the same webhook envelope shape with `messages[].type === "audio"` (`audio: { id: "...", voice: true }`) and `type === "image"` payloads instead of `text`, and assert on `ingest_jobs` state transitions via whatever ops-inspection endpoint the planner adds (see openapi.yaml section above) — same "E2E suite runs without `DATABASE_URL` set" caveat Phase 1's PATTERNS.md flagged for `keepalive.spec.ts`/`whatsapp.spec.ts`, so any DB-asserting test needs its own gating or a test-only `DATABASE_URL`.

---

## Shared Patterns

### DB access gating (mandatory for every new DB-touching file)
**Source:** `code/artifacts/api-server/src/routes/keepalive.ts` lines 15-31 (same shared pattern Phase 1 established)
**Apply to:** `ingest.ts`, and any new lib file reading/writing `ingest_jobs`/`events`/`yajmans`
```typescript
if (process.env.DATABASE_URL) {
  const { db, ingestJobs } = await import("@workspace/db"); // dynamic, never static top-level
}
```

### External-API-proxy shape (env-gated key, fetch, `.ok` check, zod `.parse()`)
**Source:** `code/artifacts/api-server/src/routes/panchang.ts` (full file)
**Apply to:** `asr/sarvam.ts`, `asr/openai.ts`, `extraction.ts`, `vision.ts`, `media.ts` — every new external-API adapter this phase introduces. This is the single most-reused pattern in this phase's file list.

### Library-function vs. route error handling
**Source:** Phase 1's `geocoding.ts` adjustment to `panchang.ts`'s pattern (per `01-PATTERNS.md`) — a `502`-shaped upstream failure becomes a thrown/returned typed error when the code is a library function (not its own route), for the caller to translate into an `ingest_jobs.status = 'failed'` + apology template.
**Apply to:** `media.ts`, `asr/*.ts`, `extraction.ts`, `vision.ts` — none of these are routes; all are called from `ingest.ts`/`whatsapp.ts`.

### Response validation via generated zod schema
**Source:** every existing route (`health.ts`, `panchang.ts`, `keepalive.ts`, `whatsapp.ts`)
**Apply to:** any new HTTP-facing response this phase adds (ops inspection, purge trigger) — `.parse()` against a schema generated from `openapi.yaml`, never send raw unvalidated objects. Internal pipeline data (extraction JSON, fuzzy-match results) should similarly be zod-validated at the Stage E→F and F→G boundaries per §2's "typed inputs/outputs" requirement, even though those aren't HTTP responses.

### No-provider-SDK-at-call-site (adapter boundary)
**Source:** `docs/ref-state-2-plan.md` §4, new to this phase (no prior in-repo precedent, but structurally identical to how `panchang.ts` is the *only* place that knows about Vedika's URL shape)
**Apply to:** `ingest.ts` and any other caller of ASR/extraction — import only `AsrProvider`/factory functions from `asr/index.ts`, never `asr/sarvam.ts` or `asr/openai.ts` directly; same discipline for whatever extraction-model SDK the bake-off selects.

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
**Apply to:** if the planner adds a new route file (e.g. `ingest-jobs.ts` for the ops-inspection/purge endpoints), register it here the same way. Voice/photo ingestion itself needs no new route file — it lives inside the existing `whatsapp.ts` webhook handler, same as Phase 1's onboarding.

### Logging
**Source:** every route uses `req.log.info/warn/error({ ... }, "message")` (pino-http via `code/artifacts/api-server/src/lib/logger.ts`), never `console.log`.
**Apply to:** all new ingestion-pipeline log statements, including non-route library files (pass the logger through or use a module-level pino instance — check `logger.ts` for the exported instance shape before assuming `req.log` is available outside a request context).

### External-cron-hits-an-HTTP-endpoint (in lieu of an in-process scheduler)
**Source:** `keepalive.ts`'s own comment (lines 6-8) — "Keep-warm endpoint for external uptime pingers (e.g. cron-job.org)"
**Apply to:** the §8 retention purge job — this repo has no job-scheduler dependency and no precedent for one; follow the existing "$0-infra, external pinger hits a plain endpoint" posture rather than introducing `node-cron` or similar.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `code/artifacts/api-server/src/lib/asr/types.ts` | model/interface | n/a | First adapter-interface (`AsrProvider`) in the repo — no prior swappable-provider pattern exists to copy; the interface shape is fully specified verbatim in `docs/ref-state-2-plan.md` §4, transcribe it directly. |
| `code/artifacts/api-server/src/lib/vocab/{maas,tithi,paksha,gotra}.ts` | model/data | transform | No pure lookup-table data-file module exists yet. Canonical/variant lists are given verbatim in §5.2 — transcribe, don't re-derive (Devanagari accuracy is load-bearing). |
| `code/artifacts/api-server/src/lib/fuzzy-match.ts` | utility | transform | No Levenshtein/fuzzy-match utility exists. Threshold table (§5.3) is exact and non-negotiable: maas/tithi/paksha ≤2 edits, gotra ≤1 edit, family_name never auto-corrected. |
| `code/lib/db/src/schema/ingest-jobs.ts` (+ `events.ts`/`yajmans.ts` deltas) | model | CRUD | Same "no real Drizzle table exists yet" gap Phase 1 hit — follow the `schema/index.ts` comment template plus the exact DDL in §9. |
| Transcode sidecar (Spike 1 contingency, §4/§12) | service | file-I/O (media transform) | Not part of this pnpm workspace at all — a separate minimal container (Fly.io/Railway) running ffmpeg, only built if Spike 1 shows Saaras v3 rejects raw OGG/Opus. No in-repo precedent for a second deployable; this is a build-order gate, not a pre-decided file to write. |

## Metadata

**Analog search scope:** `code/artifacts/api-server/src/**`, `code/lib/db/src/**`, `code/lib/api-spec/**`, `code/scripts/src/**`, `tests/api/**`, `.planning/intel/constraints.md`, `docs/ref-state-2-plan.md`, `.planning/phases/01-platform-foundation-purohit-onboarding/*.md`
**Files scanned:** 15 (whatsapp.ts, panchang.ts, keepalive.ts, health.ts, routes/index.ts, db/index.ts, schema/index.ts, drizzle.config.ts, db/package.json, api-server/package.json, api-server/.env.example, openapi.yaml, scripts/hello.ts + package.json, whatsapp.spec.ts, code/package.json)
**Pattern extraction date:** 2026-07-14
