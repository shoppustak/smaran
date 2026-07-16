import { test } from "node:test";
import assert from "node:assert";
import { topCandidates, shouldAskField, buildConfirmCard, buildMultiFamilyFollowup } from "./confirm-card";
import { maasVocab } from "./vocab/maas";
import { ExtractionResult } from "./extraction";

test("topCandidates should return top n candidates sorted by distance", () => {
  const candidates = topCandidates("भदो", maasVocab, 3);
  assert.strictEqual(candidates.length, 3);
  assert.strictEqual(candidates[0], "Bhadrapada"); // "भादो" matches Bhadrapada with distance 0
  const unique = new Set(candidates);
  assert.strictEqual(unique.size, 3);
});

test("shouldAskField should return true if score is below threshold", () => {
  assert.strictEqual(shouldAskField(0.4, 0.7), true);
  assert.strictEqual(shouldAskField(0.7, 0.7), false);
  assert.strictEqual(shouldAskField(0.8, 0.7), false);
});

test("buildConfirmCard with all fields >= threshold", () => {
  const extraction: ExtractionResult = {
    family_name: "शर्मा परिवार",
    gotra: "Kashyap",
    whatsapp_number: null,
    events: [
      {
        event_type: "shraddh",
        label: "पिताजी",
        maas: "Bhadrapada",
        paksha: "Krishna",
        tithi_name: "Dwadashi",
        gregorian_hint: null
      },
      {
        event_type: "birthday",
        label: "बेटी",
        maas: "Kartika",
        paksha: "Shukla",
        tithi_name: "Panchami",
        gregorian_hint: null
      }
    ],
    confidence_notes: null
  };

  const fieldScores = {
    gotra: 1.0,
    "events.0.maas": 1.0,
    "events.0.paksha": 1.0,
    "events.0.tithi_name": 1.0,
    "events.1.maas": 1.0,
    "events.1.paksha": 1.0,
    "events.1.tithi_name": 1.0
  };

  const thresholds = {
    gotra: 0.7,
    "events.0.maas": 0.7,
    "events.0.paksha": 0.7,
    "events.0.tithi_name": 0.7,
    "events.1.maas": 0.7,
    "events.1.paksha": 0.7,
    "events.1.tithi_name": 0.7
  };

  const card = buildConfirmCard("job-123", extraction, fieldScores, thresholds);

  assert.strictEqual(card.type, "interactive");
  assert.strictEqual((card.interactive as any).type, "button");
  
  const text = (card.interactive as any).body.text;
  assert.ok(text.includes("📿 नया परिवार — पुष्टि करें"));
  assert.ok(text.includes("परिवार: शर्मा परिवार"));
  assert.ok(text.includes("गोत्र: कश्यप"));
  assert.ok(text.includes("१. श्राद्ध — पिताजी — भाद्रपद, कृष्ण पक्ष, द्वादशी"));
  assert.ok(text.includes("२. जन्मदिन — बेटी — कार्तिक, शुक्ल पक्ष, पंचमी"));

  const buttons = (card.interactive as any).action.buttons;
  assert.strictEqual(buttons.length, 2);
  assert.strictEqual(buttons[0].reply.id, "confirm:job-123");
  assert.strictEqual(buttons[0].reply.title, "✓ सही है");
  assert.strictEqual(buttons[1].reply.id, "edit:job-123");
  assert.strictEqual(buttons[1].reply.title, "✏ सुधारें");
});

test("buildConfirmCard with a field < threshold", () => {
  const extraction: ExtractionResult = {
    family_name: "शर्मा परिवार",
    gotra: "Kashyap",
    whatsapp_number: null,
    events: [
      {
        event_type: "shraddh",
        label: "पिताजी",
        maas: "भदो", // low confidence maas
        paksha: "Krishna",
        tithi_name: "Dwadashi",
        gregorian_hint: null
      }
    ],
    confidence_notes: null
  };

  const fieldScores = {
    gotra: 1.0,
    "events.0.maas": 0.4, // below threshold
    "events.0.paksha": 1.0,
    "events.0.tithi_name": 1.0
  };

  const thresholds = {
    gotra: 0.7,
    "events.0.maas": 0.7,
    "events.0.paksha": 0.7,
    "events.0.tithi_name": 0.7
  };

  const card = buildConfirmCard("job-123", extraction, fieldScores, thresholds);

  assert.strictEqual(card.type, "interactive");
  assert.strictEqual((card.interactive as any).type, "list");

  const text = (card.interactive as any).body.text;
  assert.ok(text.startsWith("माह ठीक से सुन नहीं पाया"));
  assert.ok(text.includes("भाद्रपद"));
  assert.ok(text.includes("१. श्राद्ध — पिताजी — ❓, कृष्ण पक्ष, द्वादशी"));

  const action = (card.interactive as any).action;
  assert.strictEqual(action.button, "विकल्प चुनें");
  const rows = action.sections[0].rows;
  assert.ok(rows.length >= 2);
  assert.strictEqual(rows[0].id, "candidate:job-123:events.0.maas:0");
  assert.strictEqual(rows[0].title, "भाद्रपद");
  assert.strictEqual(rows[rows.length - 1].id, "freetext:job-123:events.0.maas");
  assert.strictEqual(rows[rows.length - 1].title, "कुछ और");
});

test("buildMultiFamilyFollowup returns exact copy", () => {
  const follow = buildMultiFamilyFollowup();
  assert.strictEqual(follow.type, "text");
  assert.strictEqual(follow.text.body, "दूसरे परिवार के लिए एक और voice note भेज दें 🙏");
});
