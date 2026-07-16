# Smaran — State 2 Technical Specification: Voice Ingestion
### From voice note to confirmed yajman record
*v1.0 · July 2026 · Companion to Blueprint v3.0 (Parts 5–7). Agent-ready. Where this spec and the Blueprint conflict, this spec wins for State 2 only. One schema addendum in §9.*

---

## §1 — Scope & the metric that matters

**In scope:** the full pipeline from a purohit's WhatsApp voice note to a confirmed row-set in `yajmans` + `events`: media ingestion → ASR → structured extraction → closed-vocabulary correction → confirm card → write. Photo (bahi khata page) ingestion shares stages 3–6 and is specified by delta in §10.

**The success metric is field-level extraction accuracy after fuzzy matching and before purohit confirmation — not ASR word-error rate.** WER is the wrong metric because most extraction targets are closed vocabularies (§5): a transcript can be 20% wrong by WER and still yield 100% correct fields. Acceptance bar: **≥90% of fields correct-before-confirm** on the 20-sample eval set (§11); the purohit's confirm tap catches the remainder.

**Design stance:** the AI drafts, the priest ratifies. Nothing is written to the permanent record without his tap. This is both the UX and the error model.

## §2 — Pipeline overview

```
WhatsApp voice note (OGG/Opus)
  → [A] Webhook handler (Supabase Edge Function)
  → [B] Media download (WhatsApp Cloud API /media)
  → [C] Format gate (OGG pass-through or transcode sidecar — spike, §4)
  → [D] ASR adapter → Saaras v3 (Sarvam)          ← swappable interface
  → [E] Extraction (LLM, JSON-mode, closed-vocab prompt)
  → [F] Fuzzy-match & normalize (canonical tables, §5)
  → [G] Confidence gate → Confirm card (WhatsApp interactive)
  → [H] On confirm: write yajmans/events; purge per retention policy (§8)
```
Stages D–F are pure functions with typed inputs/outputs — unit-testable without WhatsApp or audio.

## §3 — Stage A–B: inbound audio & media download

- Webhook receives `messages[].type == "audio"` (voice notes carry `audio.voice: true`). Queue the job (Supabase table `ingest_jobs`, status enum: `received → transcribed → extracted → awaiting_confirm → confirmed | failed`); reply immediately with a lightweight ack ("सुन लिया, एक क्षण…") so the purohit never stares at silence.
- Download: `GET /{media_id}` for the URL (URLs expire in ~5 minutes — download immediately, never store the URL), then fetch bytes with the system token. Voice notes arrive as **OGG containing Opus**, typically ≤1–2 MB.
- Guard rails: reject >5 min audio with a polite "छोटे-छोटे notes भेजें — एक परिवार एक बार में" message; max 3 retries on download failure, then `failed` + apology template.

## §4 — Stage C–D: format gate & the ASR adapter

**Spike #1 (do this before writing anything else):** POST a real WhatsApp OGG/Opus file to Saaras v3's batch endpoint. If accepted natively → Stage C is a no-op, delete the sidecar from the plan. If not → stand up the **transcode sidecar**: a minimal container (Fly.io/Railway, ~50 lines) exposing `POST /transcode` (OGG in → 16kHz mono WAV out via ffmpeg), because Supabase Edge Functions (Deno) cannot run ffmpeg natively. Do not let the sidecar grow features; it converts audio and nothing else.

**ASR adapter — the swappability boundary (F8 applied to a second platform):**
```ts
interface AsrProvider {
  transcribe(audio: Bytes, opts: { languageHint: "hi-IN" }): Promise<{
    transcript: string;         // Devanagari + Latin mixed, as heard
    providerMeta?: unknown;
  }>;
}
```
- **Primary: Sarvam Saaras v3** (`model: "saaras:v3"`, batch REST). Rationale on file: trained on 1M+ hrs Indian audio, best-in-class Indic benchmarks incl. code-mixing, ₹30/hour, zero retention, all processing in-India (DPDP alignment).
- **Fallback (config-switchable, used by the eval harness): OpenAI transcribe.** No other call site may import a provider SDK directly — everything goes through the adapter.
- Cost note for the log: ~₹0.50/min ⇒ full 100-family onboarding ≈ ₹12/purohit. Never optimize this.

## §5 — Stage E–F: extraction & closed-vocabulary correction

### 5.1 Extraction call
One LLM call, JSON-mode, temperature 0. System prompt states the task, embeds the canonical vocabularies below, and demands this exact shape:
```json
{
  "family_name": "string | null",
  "gotra": "string | null",
  "whatsapp_number": "string | null",
  "events": [{
    "event_type": "shraddh | katha | birthday | griha_pravesh | anniversary | other",
    "label": "string | null",
    "maas": "string | null",
    "paksha": "Shukla | Krishna | null",
    "tithi_name": "string | null",
    "gregorian_hint": "string | null"
  }],
  "confidence_notes": "string | null"
}
```
Rules embedded in the prompt: never guess a field not spoken; multiple events per note are normal (pitaji + mataji in one breath); exactly one family per note — if two families are detected, return the first and set `confidence_notes: "multi-family"` (the bot will ask the purohit to send the second separately).

### 5.2 Canonical tables (ship as data files, not prose)
**Maas (12) + common spoken variants:**
| Canonical | Variants to match |
|---|---|
| Chaitra | चैत्र, चैत, Chait |
| Vaishakha | वैशाख, बैसाख, Baisakh |
| Jyeshtha | ज्येष्ठ, जेठ, Jeth |
| Ashadha | आषाढ़, असाढ़, Asadh |
| Shravana | श्रावण, सावन, Sawan |
| Bhadrapada | भाद्रपद, भादो, भादों, Bhado |
| Ashwina | आश्विन, क्वार, कुँवार, Kwar |
| Kartika | कार्तिक, कातिक, Katik |
| Margashirsha | मार्गशीर्ष, अगहन, Aghan |
| Pausha | पौष, पूस, Poos |
| Magha | माघ, Magh |
| Phalguna | फाल्गुन, फागुन, Phagun |

**Tithi (map to SMALLINT 1–15) + variants:** Pratipada/पड़वा(1), Dwitiya/दूज(2), Tritiya/तीज(3), Chaturthi/चौथ(4), Panchami(5), Shashthi/छठ(6), Saptami(7), Ashtami(8), Navami(9), Dashami(10), Ekadashi/ग्यारस(11), Dwadashi/बारस(12), Trayodashi/तेरस(13), Chaturdashi/चौदस(14), **Purnima/पूनम = tithi 15 + paksha Shukla; Amavasya/अमावस = tithi 15 + paksha Krishna.** If Purnima/Amavasya is spoken, it *implies* the paksha — set both fields and never contradict a spoken paksha (contradiction ⇒ low confidence, ask).

**Paksha (2):** Shukla (शुक्ल, सुदी, Sudi) · Krishna (कृष्ण, बदी, Badi, वदी). *Sudi/Badi are extremely common in speech — must be in the table.*

**Gotra (~150-entry seed list; semi-open set):** ship a seed file (Kashyap, Bharadwaj, Vashishtha, Vishwamitra, Atri, Gautam, Jamadagni, Agastya, Shandilya, Garg, Kaushik, Parashar, Vatsa, Angirasa, …). Match threshold is *looser* than calendar fields, and **no-match is valid**: store as-heard (the confirm card shows it for the purohit to fix). Never force a gotra to the nearest list entry — a wrong gotra on a shraddh card is a serious insult; as-heard beats auto-corrected here.

### 5.3 Fuzzy-match rules
- Normalize (NFC, strip diacritic noise, lowercase Latin) → exact variant-table hit → else Levenshtein against canonical+variants, **per-field thresholds: maas/tithi/paksha accept ≤2 edits (closed sets, aggressive); gotra ≤1 edit (protective); family_name never auto-corrected.**
- Each field gets `match_score ∈ [0,1]`. Field-level confidence = match score × (extraction returned non-null without hedging).
- `gregorian_hint` path: if a Gregorian date was spoken, convert via Vedika (reverse lookup) *respecting the purohit's `calendar_system`*, and present the resulting tithi on the confirm card labeled "पंचांग से" — he confirms the conversion, not just the date.

## §6 — Stage G: the confirm card

One interactive message per voice note:
```
📿 नया परिवार — पुष्टि करें
परिवार: शर्मा परिवार
गोत्र: कश्यप
१. श्राद्ध — पिताजी — भाद्रपद, कृष्ण पक्ष, द्वादशी
२. जन्मदिन — बेटी — कार्तिक, शुक्ल, पंचमी
[✓ सही है]  [✏ सुधारें]
```
- **All fields ≥ threshold:** card as above. `✓` writes everything (§7). `✏` opens a numbered list — reply with the item number, then a WhatsApp **interactive list message** offering the 3 nearest canonical candidates + "कुछ और" (free-text re-entry for that field only).
- **Any field < threshold:** that field renders with `❓` and the card leads with the question ("माह ठीक से सुन नहीं पाया — भाद्रपद / आश्विन / कुछ और?" as list options). Never write a below-threshold field silently.
- **Multi-family note:** confirm family #1's card + one line: "दूसरे परिवार के लिए एक और voice note भेज दें 🙏".
- Re-record path: the purohit can always just send a new voice note; the newest note for an unconfirmed job supersedes.

## §7 — Stage H: writes, idempotency, provenance

- Writes happen **only** on `✓`: upsert `yajmans` (dedupe on `purohit_id + normalized family_name` — on collision, ask "यह वही शर्मा परिवार है?" rather than silently merging), insert `events` rows.
- Provenance columns (§9): `source: 'voice' | 'photo' | 'manual'`, `ingest_job_id`.
- Idempotency: confirm taps carry the job id; a double-tap is a no-op.
- Every write stamps `locality_key` from the purohit's record (density accounting, per Blueprint).

## §8 — Retention (DPDP-aligned; also brand)

| Artifact | Kept | Then |
|---|---|---|
| Audio bytes | Until transcription succeeds | **Deleted immediately** — never persisted to storage |
| Raw transcript | 30 days (debugging window) | Purged by scheduled job |
| Extraction JSON | Until confirm/reject + 30 days | Purged |
| Confirmed fields | Permanent (the product) | Deletion-on-request honors cascade |

This must be true, because the landing page and the sabha pitch will say it is.

## §9 — Schema addendum (extends Blueprint Part 6)

```sql
ALTER TABLE events ADD COLUMN label TEXT;            -- whose/which: 'पिताजी', 'सत्यनारायण'
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
Rationale for `label`: a shraddh row without *whose* it is cannot render a respectful reminder card — "श्राद्ध — पिताजी" and "श्राद्ध — माताजी" are different obligations in the same family.

## §10 — Photo path (delta only)

Bahi khata page photo → vision-capable LLM call (image + the same §5 vocabularies and JSON shape, but `events[]` may span **multiple families per page** — the one structural difference) → same fuzzy-match → one confirm card **per family**, sent sequentially (max 5 per page per burst; then "अगला पन्ना भेजें"). Same retention: image deleted after extraction. Spike #2: test extraction quality on 3 real khata photos (the ground-contact kit already collects these with permission) before promising the photo path in any pitch.

## §11 — Eval harness & the bake-off

- **Corpus:** 20 real voice notes minimum, collected with consent during ground-contact interviews (the kit's khata section has purohits describing families — "अगर app को बताना हो तो कैसे बोलेंगे?" costs 15 seconds each). Must include: ≥2 regional accents, ≥5 distinct maas, sudi/badi usage, at least one Purnima and one Amavasya, one multi-event note, one multi-family note, one noisy environment.
- **Metric:** per-field accuracy after Stage F (before confirm), macro-averaged over {family_name, gotra, event_type, maas, paksha, tithi}. Log per-field confusion — a maas confusion table tells you which variants the table is missing.
- **Bake-off:** run the corpus through Saaras v3 and the fallback provider via the same adapter; pick on field accuracy, not WER. **Acceptance: ≥90% field accuracy** with the winner; below 85% → expand variant tables and re-run before touching model choice.
- Ship the harness as a repo script (`npm run eval -- --provider=sarvam`); it reruns in minutes whenever tables change. The harness is a permanent asset, not launch scaffolding.

## §12 — Build order & spikes

1. **Spike 1:** OGG/Opus → Saaras direct (decides the sidecar's existence). ½ day.
2. **Spike 2:** 3 khata photos → vision extraction quality read. ½ day.
3. Stages D–F as pure functions + canonical tables + unit tests (no WhatsApp needed). 2–3 days.
4. Eval harness + bake-off on whatever samples exist (even 8 pre-ground-contact samples beat zero). 1 day.
5. Stages A–C plumbing + job table. 1–2 days.
6. Confirm card + correction flow (Stage G) + writes (H). 2 days.
7. Photo delta. 1–2 days.

Total: ~1.5–2 weeks solo, with the two spikes front-loaded because they're the only genuine unknowns.

---
*v1.0 — The pipeline's philosophy in one line: closed vocabularies make ASR errors cheap, and the purohit's tap makes the rest safe. Nothing enters the bahi khata that the priest didn't ratify.*