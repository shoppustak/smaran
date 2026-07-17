// Screenshots each .phone in mockups.html to a retina PNG, then emits an
// Obsidian Canvas laying them out as a left-to-right user flow.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const vault = path.join(repo, "knowledgebase");
const shotDir = path.join(vault, "assets", "whatsapp-flow");
fs.mkdirSync(shotDir, { recursive: true });

const SCREENS = [
  { slug: "01-day-sheet",    title: "Day-sheet",        note: "**“my week”** → real commitments grouped by muhurat window.\n\nThe purohit's whole season, one message. Verbatim production output (2026-07-16, 135ms round trip)." },
  { slug: "02-voice-confirm", title: "Voice → confirm",  note: "Voice note → ASR → LLM extraction → **confirm card**.\n\nNo typed forms, ever. Nothing reaches the DB until the purohit taps ✓ (ING-03)." },
  { slug: "03-collision",     title: "Double-booking",   note: "**Warned before saving**, not after.\n\nCollision = tuple match on (maas, paksha, tithi, window). Needs no date resolution, so it's immune to when the ritual was logged." },
  { slug: "04-pre-ritual",    title: "6 AM brain",       note: "Daily 6 AM job, fires at **~7 and ~2 days** ahead.\n\nCarries the samagri checklist and a confirm tap — never a payment link. Solemn vs celebratory use separate template packs." },
  { slug: "05-dakshina",      title: "Dakshina (purohit)", note: "Ritual completed → amount → **UPI deep link to the purohit's own VPA**.\n\nMoney never touches the platform. No payment gateway, no webhook." },
  { slug: "06-family-sub",    title: "Family + ₹29",     note: "Family independently confirms → ledger reaches **corroborated**.\n\nNeither side alone can mark it paid. Then the ₹29/mo calendar offer — attributed to their own purohit only." },
  { slug: "07-referral",      title: "Referral",         note: "Purohit-to-purohit invite card.\n\n`invite:{id}` → `referred_by_purohit_id` → weekly observed-k. The growth loop, instrumented." },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto("file://" + path.join(here, "mockups.html"));
await page.waitForTimeout(600); // let fonts settle

const phones = await page.locator(".phone").all();
if (phones.length !== SCREENS.length) {
  console.warn(`warn: ${phones.length} phones vs ${SCREENS.length} screen defs`);
}
for (let i = 0; i < Math.min(phones.length, SCREENS.length); i++) {
  const out = path.join(shotDir, SCREENS[i].slug + ".png");
  await phones[i].screenshot({ path: out });
  console.log("shot:", path.relative(repo, out));
}
await browser.close();

// ---- Obsidian Canvas ----------------------------------------------------
// Node coords are absolute; file paths are vault-relative.
const W = 400, H = 866, GAP = 300, NOTE_H = 210;
const nodes = [];
const edges = [];

nodes.push({
  id: "title",
  type: "text",
  text: "# Smaran — purohit user flow\n\nWhatsApp-only. Every screen below is **real product copy** pulled from `confirm-card.ts`; the day-sheet is verbatim production output.\n\n*Dates shown are seeded — live tithi→date resolution needs the Vedika production tier.*",
  x: 0, y: -320, width: 980, height: 210,
  color: "6",
});

SCREENS.forEach((s, i) => {
  const x = i * (W + GAP);
  nodes.push({
    id: `img-${s.slug}`,
    type: "file",
    file: `assets/whatsapp-flow/${s.slug}.png`,
    x, y: 0, width: W, height: H,
  });
  nodes.push({
    id: `note-${s.slug}`,
    type: "text",
    text: `### ${i + 1}. ${s.title}\n\n${s.note}`,
    x, y: H + 60, width: W, height: NOTE_H,
    color: String((i % 6) + 1),
  });
  edges.push({
    id: `en-${s.slug}`,
    fromNode: `img-${s.slug}`, fromSide: "bottom",
    toNode: `note-${s.slug}`, toSide: "top",
  });
  if (i > 0) {
    const prev = SCREENS[i - 1].slug;
    edges.push({
      id: `e-${i}`,
      fromNode: `img-${prev}`, fromSide: "right",
      toNode: `img-${s.slug}`, toSide: "left",
    });
  }
});

const canvas = { nodes, edges };
const canvasPath = path.join(vault, "smaran-user-flow.canvas");
fs.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2));
console.log("canvas:", path.relative(repo, canvasPath));
