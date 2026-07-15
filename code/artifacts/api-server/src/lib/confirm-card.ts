import { ExtractionResult } from "./extraction";
import type { ResolvedBrainEvent } from "./brain";
import { VocabEntry } from "./vocab/types";
import { gotraVocab } from "./vocab/gotra";
import { maasVocab } from "./vocab/maas";
import { pakshaVocab } from "./vocab/paksha";
import { tithiVocab } from "./vocab/tithi";
import {
  normalizeString,
  getLevenshteinDistance,
  MAAS_MAX_EDITS,
  TITHI_MAX_EDITS,
  PAKSHA_MAX_EDITS,
  GOTRA_MAX_EDITS,
} from "./fuzzy-match";
import { sendWhatsappMessage } from "./whatsapp-client";

// Static mapping of English canonicals to Hindi Devanagari
const HINDI_MAPS: Record<string, Record<string, string>> = {
  maas: {
    Chaitra: "चैत्र",
    Vaishakha: "वैशाख",
    Jyeshtha: "ज्येष्ठ",
    Ashadha: "आषाढ़",
    Shravana: "श्रावण",
    Bhadrapada: "भाद्रपद",
    Ashwina: "आश्विन",
    Kartika: "कार्तिक",
    Margashirsha: "मार्गशीर्ष",
    Pausha: "पौष",
    Magha: "माघ",
    Phalguna: "फाल्गुन",
  },
  tithi_name: {
    Pratipada: "प्रतिपदा",
    Dwitiya: "द्वितीया",
    Tritiya: "तृतीया",
    Chaturthi: "चतुर्थी",
    Panchami: "पंचमी",
    Shashthi: "षष्ठी",
    Saptami: "सप्तमी",
    Ashtami: "अष्टमी",
    Navami: "नवमी",
    Dashami: "दशमी",
    Ekadashi: "एकादशी",
    Dwadashi: "द्वादशी",
    Trayodashi: "त्रयोदशी",
    Chaturdashi: "चतुर्दशी",
    Purnima: "पूर्णिमा",
    Amavasya: "अमावस्या",
  },
  paksha: {
    Shukla: "शुक्ल",
    Krishna: "कृष्ण",
  },
};

const fieldVocabMap: Record<string, VocabEntry[]> = {
  gotra: gotraVocab,
  maas: maasVocab,
  paksha: pakshaVocab,
  tithi_name: tithiVocab,
};

const eventTypeMap: Record<string, string> = {
  shraddh: "श्राद्ध",
  katha: "कथा",
  birthday: "जन्मदिन",
  griha_pravesh: "गृह प्रवेश",
  anniversary: "वर्षगांठ",
  other: "अन्य",
};

export const CORRECTABLE_VOCAB_FIELDS: Record<
  string,
  { vocab: VocabEntry[]; maxEdits: number; label: string }
> = {
  gotra: { vocab: gotraVocab, maxEdits: GOTRA_MAX_EDITS, label: "गोत्र" },
  maas: { vocab: maasVocab, maxEdits: MAAS_MAX_EDITS, label: "माह" },
  paksha: { vocab: pakshaVocab, maxEdits: PAKSHA_MAX_EDITS, label: "पक्ष" },
  tithi_name: { vocab: tithiVocab, maxEdits: TITHI_MAX_EDITS, label: "तिथि" },
};

export function topCandidates(heard: string, vocab: VocabEntry[], n: number): string[] {
  if (!heard || typeof heard !== "string" || !heard.trim()) {
    return vocab.slice(0, n).map((e) => e.canonical);
  }

  const normalizedHeard = normalizeString(heard);
  if (!normalizedHeard) {
    return vocab.slice(0, n).map((e) => e.canonical);
  }

  const scored = vocab.map((entry) => {
    let minDistance = getLevenshteinDistance(normalizedHeard, normalizeString(entry.canonical));
    for (const variant of entry.variants) {
      const d = getLevenshteinDistance(normalizedHeard, normalizeString(variant));
      if (d < minDistance) {
        minDistance = d;
      }
    }
    return { entry, distance: minDistance };
  });

  scored.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    return a.entry.canonical.localeCompare(b.entry.canonical);
  });

  return scored.slice(0, n).map((s) => s.entry.canonical);
}

export function shouldAskField(score: number, threshold: number): boolean {
  return score < threshold;
}

function toHindi(field: string, val: string | null | undefined): string {
  if (!val) return "❓";
  if (/[\u0900-\u097F]/.test(val)) return val;

  const map = HINDI_MAPS[field];
  if (map && map[val]) {
    return map[val];
  }

  const vocab = fieldVocabMap[field];
  if (vocab) {
    const entry = vocab.find((e) => e.canonical.toLowerCase() === val.toLowerCase());
    if (entry) {
      const hindiVariant = entry.variants.find((v) => /[\u0900-\u097F]/.test(v));
      if (hindiVariant) return hindiVariant;
    }
  }

  return val;
}

function toDevanagariNumeral(num: number): string {
  const digits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return num
    .toString()
    .split("")
    .map((d) => digits[parseInt(d, 10)] || d)
    .join("");
}

export function buildConfirmCard(
  extraction: ExtractionResult,
  fieldScores: Record<string, number>,
  thresholds: Record<string, number>
): { type: "interactive"; interactive: Record<string, unknown> };

export function buildConfirmCard(
  jobId: string,
  extraction: ExtractionResult,
  fieldScores: Record<string, number>,
  thresholds: Record<string, number>
): { type: "interactive"; interactive: Record<string, unknown> };

export function buildConfirmCard(
  first: string | ExtractionResult,
  second: ExtractionResult | Record<string, number>,
  third?: Record<string, number>,
  fourth?: Record<string, number>
): { type: "interactive"; interactive: Record<string, unknown> } {
  let jobId = "mock-job-id";
  let extraction: ExtractionResult;
  let fieldScores: Record<string, number>;
  let thresholds: Record<string, number>;

  if (typeof first === "string") {
    jobId = first;
    extraction = second as ExtractionResult;
    fieldScores = third as Record<string, number>;
    thresholds = fourth as Record<string, number>;
  } else {
    extraction = first;
    fieldScores = second as Record<string, number>;
    thresholds = third as Record<string, number>;
  }

  // Let's identify the fields that are below threshold (and non-null/non-empty)
  interface CorrectableField {
    path: string;
    vocab: VocabEntry[];
    label: string;
    value: string | null;
  }

  const correctableFields: CorrectableField[] = [];

  if (extraction.gotra !== undefined && extraction.gotra !== null) {
    correctableFields.push({
      path: "gotra",
      vocab: gotraVocab,
      label: "गोत्र",
      value: extraction.gotra,
    });
  }

  (extraction.events || []).forEach((event, i) => {
    correctableFields.push({
      path: `events.${i}.maas`,
      vocab: maasVocab,
      label: "माह",
      value: event.maas,
    });
    correctableFields.push({
      path: `events.${i}.paksha`,
      vocab: pakshaVocab,
      label: "पक्ष",
      value: event.paksha,
    });
    correctableFields.push({
      path: `events.${i}.tithi_name`,
      vocab: tithiVocab,
      label: "तिथि",
      value: event.tithi_name,
    });
  });

  let firstBelowThresholdField: CorrectableField | null = null;
  for (const field of correctableFields) {
    if (field.value !== null && field.value !== undefined && field.value.trim() !== "") {
      const score = fieldScores[field.path] ?? 1.0;
      const threshold = thresholds[field.path] ?? 0.7;
      if (shouldAskField(score, threshold)) {
        firstBelowThresholdField = field;
        break;
      }
    }
  }

  // Helper to get formatted display value for a field path
  const getFieldVal = (path: string, originalVal: string | null, fieldKey: string) => {
    if (!originalVal || originalVal.trim() === "") return "❓";
    const score = fieldScores[path] ?? 1.0;
    const threshold = thresholds[path] ?? 0.7;
    if (shouldAskField(score, threshold)) {
      return "❓";
    }
    return toHindi(fieldKey, originalVal);
  };

  // Build the lines of the card
  const lines: string[] = [];

  let clarifyingQuestion = "";
  let listRows: Array<{ id: string; title: string }> = [];

  if (firstBelowThresholdField) {
    const fieldKey = firstBelowThresholdField.path.split(".").pop()!;
    const rawVal = firstBelowThresholdField.value!;
    const candidates = topCandidates(rawVal, firstBelowThresholdField.vocab, 3);
    const hindiCandidates = candidates.map((c) => toHindi(fieldKey, c));
    
    clarifyingQuestion = `${firstBelowThresholdField.label} ठीक से सुन नहीं पाया — ${hindiCandidates.join(" / ")} / कुछ और?`;

    lines.push(clarifyingQuestion);
    lines.push(""); // empty line after question

    listRows = hindiCandidates.map((hc, idx) => ({
      id: `candidate:${jobId}:${firstBelowThresholdField!.path}:${idx}`,
      title: hc,
    }));
    listRows.push({
      id: `freetext:${jobId}:${firstBelowThresholdField!.path}`,
      title: "कुछ और",
    });
  }

  lines.push("📿 नया परिवार — पुष्टि करें");
  
  const familyNameVal = extraction.family_name || "❓";
  lines.push(`परिवार: ${familyNameVal}`);

  const gotraVal = getFieldVal("gotra", extraction.gotra, "gotra");
  lines.push(`गोत्र: ${gotraVal}`);

  (extraction.events || []).forEach((event, i) => {
    const eventTypeHindi = eventTypeMap[event.event_type] || event.event_type;
    const labelStr = event.label || "❓";
    const maasVal = getFieldVal(`events.${i}.maas`, event.maas, "maas");
    const pakshaVal = getFieldVal(`events.${i}.paksha`, event.paksha, "paksha");
    const pakshaStr = pakshaVal === "❓" ? "❓" : `${pakshaVal} पक्ष`;
    const tithiVal = getFieldVal(`events.${i}.tithi_name`, event.tithi_name, "tithi_name");

    const line = `${toDevanagariNumeral(i + 1)}. ${eventTypeHindi} — ${labelStr} — ${maasVal}, ${pakshaStr}, ${tithiVal}`;
    lines.push(line);
  });

  const bodyText = lines.join("\n");

  if (firstBelowThresholdField) {
    return {
      type: "interactive",
      interactive: {
        type: "list",
        body: {
          text: bodyText,
        },
        action: {
          button: "विकल्प चुनें",
          sections: [
            {
              title: "संभावित विकल्प",
              rows: listRows,
            },
          ],
        },
      },
    };
  }

  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyText,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `confirm:${jobId}`,
              title: "✓ सही है",
            },
          },
          {
            type: "reply",
            reply: {
              id: `edit:${jobId}`,
              title: "✏ सुधारें",
            },
          },
        ],
      },
    },
  };
}

export async function sendConfirmCard(to: string, card: any): Promise<void> {
  await sendWhatsappMessage(to, card);
}

export function buildMultiFamilyFollowup(): { type: "text"; text: { body: string } } {
  return {
    type: "text",
    text: {
      body: "दूसरे परिवार के लिए एक और voice note भेज दें 🙏",
    },
  };
}

export function buildFieldSelectionList(
  jobId: string,
  extraction: ExtractionResult
): { type: "interactive"; interactive: Record<string, unknown> } {
  const rows = [
    {
      id: `field:${jobId}:family_name`,
      title: "परिवार का नाम",
    },
    {
      id: `field:${jobId}:gotra`,
      title: "गोत्र",
    },
  ];

  (extraction.events || []).forEach((event, i) => {
    const eventTypeHindi = eventTypeMap[event.event_type] || event.event_type;
    const context = event.label ? `${eventTypeHindi} — ${event.label}` : eventTypeHindi;

    rows.push({
      id: `field:${jobId}:events.${i}.maas`,
      title: `माह (${context})`.slice(0, 24),
    });
    rows.push({
      id: `field:${jobId}:events.${i}.paksha`,
      title: `पक्ष (${context})`.slice(0, 24),
    });
    rows.push({
      id: `field:${jobId}:events.${i}.tithi_name`,
      title: `तिथि (${context})`.slice(0, 24),
    });
  });

  return {
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: "किस जानकारी में सुधार करना है? नीचे दी गई सूची से चुनें:",
      },
      action: {
        button: "जानकारी चुनें",
        sections: [
          {
            title: "सुधारने योग्य जानकारी",
            rows: rows,
          },
        ],
      },
    },
  };
}

export function buildFieldCandidateList(
  jobId: string,
  fieldPath: string,
  heard: string
): { type: "interactive"; interactive: Record<string, unknown> } | null {
  if (fieldPath === "family_name") {
    return null;
  }

  const segments = fieldPath.split(".");
  const baseKey = segments[segments.length - 1];

  const fieldConfig = CORRECTABLE_VOCAB_FIELDS[baseKey];
  if (!fieldConfig) {
    return null;
  }

  const candidates = topCandidates(heard || "", fieldConfig.vocab, 3);
  const hindiCandidates = candidates.map((c) => toHindi(baseKey, c));

  const rows = hindiCandidates.map((hc, idx) => ({
    id: `candidate:${jobId}:${fieldPath}:${idx}`,
    title: hc.slice(0, 24),
  }));

  rows.push({
    id: `freetext:${jobId}:${fieldPath}`,
    title: "कुछ और",
  });

  return {
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: `सही ${fieldConfig.label} चुनें या 'कुछ और' पर क्लिक करके टाइप करें:`,
      },
      action: {
        button: "विकल्प चुनें",
        sections: [
          {
            title: "संभावित विकल्प",
            rows: rows,
          },
        ],
      },
    },
  };
}

export function buildPostRitualPurohitCard(
  ledgerId: string,
  familyName: string,
  eventLabel: string,
  upiLink: string
): { type: "interactive"; interactive: Record<string, unknown> } {
  const bodyText = `📿 यजमान: ${familyName}\nअनुष्ठान: ${eventLabel}\n\nदक्षिणा भुगतान लिंक: ${upiLink}\n\nदक्षिणा प्राप्त होने पर पुष्टि करें:`;
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyText,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `ledger-claim:${ledgerId}`,
              title: "Dakshina received ✓",
            },
          },
        ],
      },
    },
  };
}

export function buildRitualCompletedCard(
  eventId: string,
  familyName: string,
  eventLabel: string
): { type: "interactive"; interactive: Record<string, unknown> } {
  const bodyText = `📿 यजमान: ${familyName}\nअनुष्ठान: ${eventLabel}\n\nक्या अनुष्ठान पूर्ण हो गया है? नीचे टैप करें:`;
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyText,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `ritual-completed:${eventId}`,
              title: "पूजा संपन्न ✓",
            },
          },
        ],
      },
    },
  };
}

export function buildPostRitualFamilyCard(
  ledgerId: string,
  purohitName: string,
  eventLabel: string,
  upiLink: string
): { type: "interactive"; interactive: Record<string, unknown> } {
  const bodyText = `📿 पुरोहित: ${purohitName}\nअनुष्ठान: ${eventLabel}\n\nदक्षिणा अर्पण लिंक: ${upiLink}\n\nदक्षिणा अर्पण की पुष्टि करें (अनुष्ठान संपन्न हुआ):`;
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyText,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `ledger-confirm:${ledgerId}`,
              title: "Confirm ✓",
            },
          },
        ],
      },
    },
  };
}

const HINDI_TITHIS: Record<number, string> = {
  1: "प्रतिपदा",
  2: "द्वितीया",
  3: "तृतीया",
  4: "चतुर्थी",
  5: "पंचमी",
  6: "षष्ठी",
  7: "सप्तमी",
  8: "अष्टमी",
  9: "नवमी",
  10: "दशमी",
  11: "एकादशी",
  12: "द्वादशी",
  13: "त्रयोदशी",
  14: "चतुर्दशी",
};

function getTithiHindiName(tithiNum: number, paksha: "Shukla" | "Krishna"): string {
  if (tithiNum === 15) {
    return paksha === "Shukla" ? "पूर्णिमा" : "अमावस्या";
  }
  return HINDI_TITHIS[tithiNum] ?? `तिथि ${tithiNum}`;
}

export function buildUpcomingPreRitualCard(
  resolved: ResolvedBrainEvent,
  daysRemaining: number
): { type: "interactive"; interactive: Record<string, unknown> } {
  const familyName = resolved.yajman.familyName;
  const maas = toHindi("maas", resolved.hinduDate.maas);
  const paksha = toHindi("paksha", resolved.hinduDate.paksha);
  const tithi = getTithiHindiName(resolved.hinduDate.tithi, resolved.hinduDate.paksha);

  const isSolemn = resolved.event.eventType === "shraddh";
  let bodyText = "";

  if (isSolemn) {
    bodyText = `आदरणीय पुरोहित जी, यजमान ${familyName} के परिवार का ${maas} ${paksha} ${tithi} को श्राद्ध अनुष्ठान है (शेष दिन: ${daysRemaining})। क्या आप इस तिथि को उपलब्ध हैं?`;
  } else {
    const eventLabel = resolved.event.label || eventTypeMap[resolved.event.eventType] || resolved.event.eventType;
    bodyText = `प्रणाम पुरोहित जी! यजमान ${familyName} के परिवार का ${eventLabel} शुभ अवसर आ रहा है (शेष दिन: ${daysRemaining})। पूजा की पुष्टि करें:`;
  }

  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyText,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `booking-confirm:${resolved.event.id}`,
              title: "हाँ, बुक करें",
            },
          },
        ],
      },
    },
  };
}


