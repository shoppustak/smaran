import test from "node:test";
import assert from "node:assert";
import { matchField, MAAS_MAX_EDITS, PAKSHA_MAX_EDITS, GOTRA_MAX_EDITS } from "./fuzzy-match";
import { maasVocab } from "./vocab/maas";
import { pakshaVocab } from "./vocab/paksha";
import { gotraVocab } from "./vocab/gotra";

test("fuzzy-match behavior cases", async (t) => {
  await t.test("exact variant hit for 'भाद्रपद'", () => {
    const result = matchField("भाद्रपद", maasVocab, MAAS_MAX_EDITS);
    assert.deepEqual(result, { canonical: "Bhadrapada", matchScore: 1 });
  });

  await t.test("variant hit for 'भादो'", () => {
    const result = matchField("भादो", maasVocab, MAAS_MAX_EDITS);
    assert.deepEqual(result, { canonical: "Bhadrapada", matchScore: 1 });
  });

  await t.test("Levenshtein match <= 2 edits for 'bhadrapad'", () => {
    const result = matchField("bhadrapad", maasVocab, MAAS_MAX_EDITS);
    assert.deepEqual(result, { canonical: "Bhadrapada", matchScore: 1 - 1 / (MAAS_MAX_EDITS + 1) });
  });

  await t.test("no match for nonsense input 'xyz-nonsense-string'", () => {
    const result = matchField("xyz-nonsense-string", maasVocab, MAAS_MAX_EDITS);
    assert.deepEqual(result, { canonical: null, matchScore: 0 });
  });

  await t.test("variant hit for paksha 'सुदी'", () => {
    const result = matchField("सुदी", pakshaVocab, PAKSHA_MAX_EDITS);
    assert.deepEqual(result, { canonical: "Shukla", matchScore: 1 });
  });

  await t.test("rejects gotra input 2 edits away", () => {
    // "Kashyap" has gotraVocab entry.
    // "Kashyappp" has normalized form "kashyappp"
    // "kashyap" (canonical) vs "kashyappp" is distance 2.
    // "kashyapa" (variant) vs "kashyappp" is distance 2.
    // "kasiapa" (variant) vs "kashyappp" is distance 4.
    // So min distance is 2. With GOTRA_MAX_EDITS = 1, it should reject (2 > 1).
    const result = matchField("Kashyappp", gotraVocab, GOTRA_MAX_EDITS);
    assert.deepEqual(result, { canonical: null, matchScore: 0 });
  });

  await t.test("accepts gotra input 1 edit away", () => {
    // "Kashyapp" has normalized form "kashyapp".
    // "kashyap" (canonical) vs "kashyapp" is distance 1.
    // So min distance is 1. With GOTRA_MAX_EDITS = 1, it should accept.
    const result = matchField("Kashyapp", gotraVocab, GOTRA_MAX_EDITS);
    assert.deepEqual(result, { canonical: "Kashyap", matchScore: 1 - 1 / (GOTRA_MAX_EDITS + 1) });
  });
});
