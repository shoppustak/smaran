// Screenshots each .phone in mockups.html to a retina PNG, then emits an
// Obsidian Canvas laying them out as two swimlanes: purohit and yajman.
//
// DOM order in mockups.html IS the flow order — phones[i] pairs with SCREENS[i].
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const vault = path.join(repo, "knowledgebase");
const shotDir = path.join(vault, "assets", "whatsapp-flow");
fs.mkdirSync(shotDir, { recursive: true });

const P = "purohit";
const Y = "yajman";

const SCREENS = [
  { slug: "00-purohit-menu",      lane: P, title: "Purohit Menu",        note: "Triggered by 'pranaam'. Replaces archaic numbered lists with native WhatsApp interactive lists." },
  { slug: "00-yajman-menu",       lane: Y, title: "Yajman Menu",         note: "Triggered by 'pranaam' or unrecognized text. Yajmans don't need to memorize commands anymore." },
  { slug: "01-onboarding",        lane: P, title: "Onboarding",          note: "A brother-purohit's invite link prefills `invite:{id}` as the very first message.\n\nFive questions, no forms: name → city → area → UPI → calendar system. `referred_by_purohit_id` is captured here — before the account row exists." },
  { slug: "02-account-created",   lane: P, title: "Account created",     note: "Account written, draft state dropped, then a \"wow card\" pulled **live** from `/api/panchang`.\n\n⚠️ Verbatim sandbox output. Without `VEDIKA_API_KEY` the free tier serves fixed 1995 mock data, and `Tarikh:` prints Vedika's raw ISO timestamp — this is the purohit's first impression of the product." },
  { slug: "03-voice-confirm",     lane: P, title: "Voice → confirm",     note: "Voice note → ASR → LLM extraction → **confirm card**.\n\nNo typed forms, ever. Nothing reaches the DB until the purohit taps ✓ (ING-03)." },
  { slug: "04-correction",        lane: P, title: "Correction",          note: "`✏ सुधारें` opens WhatsApp **list** messages — not buttons.\n\nCandidates are Levenshtein-ranked against the tithi vocab: heard \"Ekadashi\" → एकादशी / द्वादशी / त्रयोदशी. `कुछ और` drops to free text. Only `family_name` skips the list — it has no vocab to rank against." },
  { slug: "05-collision",         lane: P, title: "Double-booking",      note: "**Warned before saving**, not after.\n\nCollision = tuple match on (maas, paksha, tithi, window). Needs no date resolution, so it's immune to when the ritual was logged." },
  { slug: "06-multi-family",      lane: P, title: "Multi-family",        note: "One voice note can carry several families. After each booking-confirm the bot asks for the next.\n\nThis is the loop that turns a season's bookings into a single sitting." },
  { slug: "07-day-sheet",         lane: P, title: "Day-sheet",           note: "**“my week”** → real commitments grouped by muhurat window.\n\nThe purohit's whole season, one message. Verbatim production output (2026-07-16, 135ms round trip)." },
  { slug: "08-pre-ritual",        lane: P, title: "6 AM brain",          note: "Daily 6 AM job, fires at **~7 and ~2 days** ahead.\n\nCarries the samagri checklist and a confirm tap — never a payment link. Solemn vs celebratory use separate template packs." },
  { slug: "09-dakshina",          lane: P, title: "Dakshina (purohit)",  note: "Ritual completed → amount → **UPI deep link to the purohit's own VPA**.\n\nMoney never touches the platform. No payment gateway, no webhook. The same tap hands off to the family — see the yajman lane below." },
  { slug: "10-lapse-nudge",       lane: P, title: "Lapse nudge",         note: "Daily scan for an annual ritual whose cycle year passed unbooked.\n\nSent as the `smaran_lapse_recovery_nudge` template, free-form interactive as fallback; deduped in `lapse_recoveries` on (event, cycle_year). `नियत करें` stamps `recovered_at` — that stamp *is* the retention metric." },
  { slug: "11-referral",          lane: P, title: "Referral",            note: "Purohit-to-purohit invite card — closes the loop back to screen 1.\n\n`getOrCreateInviteLink` mints a durable short-link (`/i/{code}`, random, *not* derived from the purohit id) → `referred_by_purohit_id` → weekly observed-k. The growth loop, instrumented." },

  { slug: "12-family-dakshina",   lane: Y, title: "Family confirms",     note: "The family's **first contact** — they never onboard; they exist because a purohit logged them.\n\nThey confirm independently → the ledger row reaches **corroborated** (🤝, a token spent on this moment alone). Neither side can assert payment by itself." },
  { slug: "13-family-offer",      lane: Y, title: "Family + ₹21",        note: "Only once the ledger corroborates does the ₹21/mo calendar offer follow — attributed to their own purohit, never the platform.\n\nA UPI autopay mandate on the purohit's own VPA. Gated on `familySubStatus === \"none\"`, so it is never re-offered." },
  { slug: "14-family-subscribed", lane: Y, title: "Subscription active", note: "`familySubStatus: active`. The mandate is the family's own UPI autopay.\n\n**The lane now delivers content.** A daily `family-content-dispatch` cron reads `active` and dispatches Vedika affirmation content to the family, idempotently tracked." },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto("file://" + path.join(here, "mockups.html"));
await page.waitForTimeout(600); // let fonts settle

const phones = await page.locator(".phone").all();
if (phones.length !== SCREENS.length) {
  console.warn(`warn: ${phones.length} phones vs ${SCREENS.length} screen defs`);
}
// Record each phone's real height: a screen allowed to grow (.phone.auto) must not
// be squashed into a fixed-height canvas node.
const heights = {};
for (let i = 0; i < Math.min(phones.length, SCREENS.length); i++) {
  const out = path.join(shotDir, SCREENS[i].slug + ".png");
  await phones[i].screenshot({ path: out });
  const box = await phones[i].boundingBox();
  heights[SCREENS[i].slug] = Math.round(box?.height ?? 866);
  console.log("shot:", path.relative(repo, out), `(${heights[SCREENS[i].slug]}px)`);
}

// .chat is overflow:hidden, so a thread that outgrows 844px is clipped silently —
// the PNG still looks plausible while hiding copy. Fail loudly instead.
for (let i = 0; i < Math.min(phones.length, SCREENS.length); i++) {
  const clipped = await phones[i]
    .locator(".chat")
    .evaluate((el) => el.scrollHeight > el.clientHeight + 1);
  if (clipped) console.warn(`WARN: ${SCREENS[i].slug} — chat thread is clipped, copy is hidden`);
}
await browser.close();

// ---- Obsidian Canvas ----------------------------------------------------
// Node coords are absolute; file paths are vault-relative.
const W = 400, H = 866, GAP = 300, NOTE_H = 210, STEP = W + GAP;
const LANE_Y = { [P]: 0, [Y]: 1500 };
const LANE_COLOR = { [P]: "5", [Y]: "4" };
const nodes = [];
const edges = [];

nodes.push({
  id: "title",
  type: "text",
  text:
    "# Smaran — end-to-end user journey\n\n" +
    "WhatsApp-only. Two lanes: **purohit** (top) and **yajman** (bottom). Every screen is **real product copy** read out of source — `onboarding.ts`, `confirm-card.ts`, `brain.ts`, `whatsapp.ts` — and the day-sheet is verbatim production output.\n\n" +
    "*Dates on seeded screens are fixtures; live tithi→date resolution needs the Vedika production tier.*",
  x: 0, y: -320, width: 980, height: 210,
  color: "6",
});

// The yajman lane opens where the purohit hands off — under the dakshina screen.
const handoffIdx = SCREENS.findIndex((s) => s.slug === "09-dakshina");
const firstOf = (lane) => SCREENS.findIndex((s) => s.lane === lane);
const laneOrigin = { [P]: 0, [Y]: handoffIdx };

const xOf = (i) => (i - firstOf(SCREENS[i].lane) + laneOrigin[SCREENS[i].lane]) * STEP;

for (const [lane, name, subtitle] of [
  [P, "PUROHIT", "the paying user"],
  [Y, "YAJMAN", "the family"],
]) {
  const i = firstOf(lane);
  nodes.push({
    id: `lane-${lane}`,
    type: "text",
    text: `## ${name}\n\n*${subtitle}*`,
    x: xOf(i) - 460, y: LANE_Y[lane] + 380,
    width: 400, height: 120,
    color: LANE_COLOR[lane],
  });
}

SCREENS.forEach((s, i) => {
  const x = xOf(i);
  const y = LANE_Y[s.lane];
  nodes.push({
    id: `img-${s.slug}`,
    type: "file",
    file: `assets/whatsapp-flow/${s.slug}.png`,
    x, y, width: W, height: heights[s.slug] ?? H,
  });
  nodes.push({
    id: `note-${s.slug}`,
    type: "text",
    text: `### ${i + 1}. ${s.title}\n\n${s.note}`,
    x, y: y + Math.max(heights[s.slug] ?? H, H) + 60, width: W, height: NOTE_H,
    color: LANE_COLOR[s.lane],
  });
  edges.push({
    id: `en-${s.slug}`,
    fromNode: `img-${s.slug}`, fromSide: "bottom",
    toNode: `note-${s.slug}`, toSide: "top",
  });
  const prev = SCREENS[i - 1];
  if (prev && prev.lane === s.lane) {
    edges.push({
      id: `e-${i}`,
      fromNode: `img-${prev.slug}`, fromSide: "right",
      toNode: `img-${s.slug}`, toSide: "left",
    });
  }
});

// Cross-lane handoff: the purohit's dakshina tap is what creates the family's first message.
edges.push({
  id: "e-handoff",
  fromNode: `note-${SCREENS[handoffIdx].slug}`, fromSide: "bottom",
  toNode: `img-${SCREENS[firstOf(Y)].slug}`, toSide: "top",
  label: "purohit confirms → family is messaged",
});

const canvas = { nodes, edges };
const canvasPath = path.join(vault, "smaran-user-flow.canvas");
fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2));
console.log("canvas:", path.relative(repo, canvasPath));
