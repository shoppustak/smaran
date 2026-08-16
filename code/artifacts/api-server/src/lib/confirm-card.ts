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
import { buildAutopayDeepLink } from "./subscription";
import { BEADS, NAMASTE, FLOWER, DIYA, ENVELOPE, POINT, RULE } from "./copy-tokens";

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

export const eventTypeMap: Record<string, string> = {
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

export function toHindi(field: string, val: string | null | undefined): string {
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
  const bodyText =
    `${BEADS} *दक्षिणा*\n${RULE}\n` +
    `*यजमान:* ${familyName}\n*अनुष्ठान:* ${eventLabel}\n\n` +
    `*भुगतान लिंक:* ${upiLink}\n\n` +
    `${POINT} दक्षिणा प्राप्त होने पर पुष्टि करें:`;
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
  const bodyText =
    `${BEADS} *अनुष्ठान की स्थिति*\n${RULE}\n` +
    `*यजमान:* ${familyName}\n*अनुष्ठान:* ${eventLabel}\n\n` +
    `${POINT} क्या अनुष्ठान पूर्ण हो गया है? नीचे टैप करें:`;
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
  const bodyText =
    `${BEADS} *दक्षिणा अर्पण*\n${RULE}\n` +
    `*पुरोहित:* ${purohitName}\n*अनुष्ठान:* ${eventLabel}\n\n` +
    `*अर्पण लिंक:* ${upiLink}\n\n` +
    `${POINT} दक्षिणा अर्पण की पुष्टि करें (अनुष्ठान संपन्न हुआ):`;
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

export function getTithiHindiName(tithiNum: number, paksha: "Shukla" | "Krishna"): string {
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
  
  let samagriList = "";
  if (resolved.event.eventType === "shraddh") {
    samagriList = "- काले तिल (Black Sesame)\n- जौ (Barley)\n- कुशा घास (Kusha Grass)\n- गंगाजल (Ganga Water)\n- सफेद फूल (White Flowers)\n- कपूर, धूप (Camphor, Incense)";
  } else if (resolved.event.eventType === "katha") {
    samagriList = "- पंजीरी, पंचामृत (Panjiri, Panchamrit)\n- केले के पत्ते (Banana Leaves)\n- कलश (Kalash/Pot)\n- नारियल, सुपारी (Coconut, Betel Nut)\n- रोली, अक्षत (Roli, Rice)\n- फूल, फल, मिठाई (Flowers, Fruits, Sweets)";
  } else if (resolved.event.eventType === "griha_pravesh") {
    samagriList = "- कलश, नारियल (Kalash, Coconut)\n- आम के पत्ते (Mango Leaves)\n- दूध, दही, शहद (Milk, Curd, Honey)\n- रोली, अक्षत, धूप (Roli, Rice, Incense)\n- हवन सामग्री (Havan Materials)";
  } else if (resolved.event.eventType === "birthday" || resolved.event.eventType === "anniversary") {
    samagriList = "- दीपक, आरती थाली (Lamp, Aarti Plate)\n- रोली, अक्षत (Roli, Rice)\n- मौली/रक्षासूत्र (Kalava)\n- फूल, मिठाई (Flowers, Sweets)";
  } else {
    samagriList = "- रोली, अक्षत (Roli, Rice)\n- मौली/रक्षासूत्र (Kalava)\n- धूप, दीप, कपूर (Incense, Lamp, Camphor)\n- फूल, फल, प्रसाद (Flowers, Fruits, Prasad)";
  }

  const eventName = eventTypeMap[resolved.event.eventType] || resolved.event.eventType;
  const purohitName = resolved.purohit.name.endsWith("जी") ? resolved.purohit.name : `${resolved.purohit.name} जी`;

  // One anchor emoji per register (NAMASTE = solemn, FLOWER = celebratory);
  // everything else is carried by bold labels and a divider. See copy-tokens.ts.
  const ritualLine = isSolemn
    ? `श्राद्ध/पुण्यतिथि ${resolved.event.label ? `(${resolved.event.label})` : ""}`.trim()
    : `${eventName} ${resolved.event.label ? `(${resolved.event.label})` : ""}`.trim();

  const detail =
    `${RULE}\n` +
    `*तिथि:* ${resolved.gregorianDate}\n` +
    `*पंचांग:* ${maas} ${paksha} पक्ष, ${tithi}\n` +
    `*शेष दिन:* ${daysRemaining}\n\n` +
    `*यजमान:* ${familyName} परिवार\n` +
    `*अनुष्ठान:* ${ritualLine}\n` +
    `${RULE}\n\n` +
    `*आवश्यक सामग्री*\n${samagriList}\n\n` +
    `_स्मरण रहे_ — ${daysRemaining} दिन शेष।\n${POINT} कृपया पूजा की पुष्टि करें।`;

  const bodyText = isSolemn
    ? `${NAMASTE} आदरणीय ${purohitName}, प्रणाम।\n\nआगामी तिथि को निम्नलिखित श्राद्ध अनुष्ठान निर्धारित है:\n\n${detail}`
    : `${FLOWER} जय श्री राम ${purohitName}!\n\nआगामी तिथि को निम्नलिखित मांगलिक कार्य निर्धारित है:\n\n${detail}`;

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
              title: "✓ पूजा की पुष्टि",
            },
          },
        ],
      },
    },
  };
}

export function buildFamilyCalendarOfferCard(
  yajmanId: string,
  purohitName: string,
  VPA: string
): { type: "interactive"; interactive: Record<string, unknown> } {
  const mandateUrl = buildAutopayDeepLink(yajmanId, VPA, purohitName);
  
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          `${DIYA} *परिवार का पंचांग*\n${RULE}\n` +
          `अपने परिवार का पंचांग और अनुष्ठान कैलेंडर सीधे अपने WhatsApp पर प्राप्त करें।\n` +
          `_वार्षिक अनुष्ठानों के स्मरण पत्र सीधे प्राप्त होंगे_\n\n` +
          `*शुल्क:* ₹21/माह (UPI Autopay)\n*पुरोहित जी:* ${purohitName}\n\n` +
          `*सदस्यता लिंक:* ${mandateUrl}`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `subscribe-confirm:${yajmanId}`,
              title: "मैंने सदस्यता ले ली",
            },
          },
        ],
      },
    },
  };
}

export function buildReferralCard(
  inviteUrl: string,
  purohitName: string
): { type: "interactive"; interactive: Record<string, unknown> } {
  // Takes a prebuilt short URL: minting one is a DB write, and this builder stays pure.
  const url = inviteUrl;
  
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        // There is NO referrer bounty in this product — GROW-01..03 are measurement
        // only, and the growth mechanism is the sabha presentation, not this card
        // (blueprint State 7). So the card must not imply a reward that does not exist.
        //
        // What it CAN do is stop making the purohit explain Smaran himself: everything
        // below the second rule is written to be forwarded verbatim, states the
        // INVITEE's benefit, and carries the one real, live incentive — the founding-100
        // price already published on the landing page.
        text:
          `${ENVELOPE} *पुरोहित आमंत्रण कार्ड*\n${RULE}\n` +
          `नीचे का संदेश अपने साथी पुरोहित-जी को भेज दीजिए।\n${RULE}\n` +
          `${NAMASTE} *स्मरण* — पुरोहितों के लिए WhatsApp पर बही खाता।\n` +
          `_${purohitName} जी की ओर से आमंत्रण_\n\n` +
          `• यजमानों की तिथियाँ याद रहती हैं — कोई अनुष्ठान छूटता नहीं\n` +
          `• दक्षिणा सीधे आपके UPI पर — बीच में न कोई प्लेटफ़ॉर्म, न कमीशन\n` +
          `• बोलकर या बही खाता की फोटो भेजकर — कोई फॉर्म नहीं\n\n` +
          `*पहले 100 पुरोहितों के लिए पहला वर्ष ₹501*\n\n` +
          `${url}`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "referral-sent",
              title: "आमंत्रण भेजा गया",
            },
          },
        ],
      },
    },
  };
}

export function buildCalendarSystemCard(): any {
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "शुभ मुहूर्त ठीक-ठीक निकालने के लिए दो छोटे सवाल। पहला — आप किस पंचांग से चलते हैं?",
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "calendar:purnimanta",
              title: "पूर्णिमांत",
            },
          },
          {
            type: "reply",
            reply: {
              id: "calendar:amanta",
              title: "अमांत",
            },
          },
        ],
      },
    },
  };
}

export async function buildFamilyLaneCard(yajmanId: string, timeframe: "year" | "month"): Promise<any | null> {
  const { db, eventsTable, yajmansTable, purohitsTable } = await import("@workspace/db");
  const { eq, and, gte, lte, asc } = await import("drizzle-orm");

  const [yajman] = await db
    .select()
    .from(yajmansTable)
    .where(eq(yajmansTable.id, yajmanId))
    .limit(1);

  if (!yajman) return null;

  const [purohit] = await db
    .select()
    .from(purohitsTable)
    .where(eq(purohitsTable.id, yajman.purohitId))
    .limit(1);

  if (!purohit) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  
  let startDate: Date;
  let endDate: Date;
  
  if (timeframe === "year") {
    startDate = new Date(currentYear, 0, 1);
    endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const events = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.yajmanId, yajmanId),
        eq(eventsTable.resolvedCycleYear, currentYear),
        gte(eventsTable.resolvedDate, startDate),
        lte(eventsTable.resolvedDate, endDate)
      )
    )
    .orderBy(asc(eventsTable.resolvedDate));

  if (events.length === 0) return null;

  const formatShortDate = (d: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  const titleStr = timeframe === "year" ? `*वार्षिक तिथि सूची (${currentYear})*` : `*मासिक तिथि सूची*`;

  let bodyText = `${NAMASTE} प्रणाम।\n${RULE}\n${titleStr}\n`;

  for (const event of events) {
    if (!event.resolvedDate) continue;
    const dateStr = formatShortDate(new Date(event.resolvedDate));
    const label = event.label || event.eventType || "अनुष्ठान";
    const pakshaHindi = HINDI_MAPS.paksha[event.paksha] || event.paksha;
    const maasHindi = HINDI_MAPS.maas[event.maas] || event.maas;
    
    const tithiEntry = fieldVocabMap.tithi_name.find((t: any) => t.tithiNumber === event.tithi);
    const tithiCanonical = tithiEntry ? tithiEntry.canonical : String(event.tithi);
    const tithiH = HINDI_MAPS.tithi_name[tithiCanonical] || tithiCanonical;

    bodyText += `\n*${label}*\n${maasHindi} ${pakshaHindi}, ${tithiH} — ${dateStr}\n`;
  }

  bodyText += `\n${RULE}\n*पुरोहित:* ${purohit.name} जी`;

  return {
    type: "text",
    text: { body: bodyText },
  };
}

export async function buildMeraSmaranCard(yajmanId: string): Promise<any | null> {
  const { db, eventsTable, occurrencesTable, yajmansTable, purohitsTable } = await import("@workspace/db");
  const { eq, and, asc } = await import("drizzle-orm");

  const [yajman] = await db.select().from(yajmansTable).where(eq(yajmansTable.id, yajmanId)).limit(1);
  if (!yajman) return null;
  const [purohit] = await db.select().from(purohitsTable).where(eq(purohitsTable.id, yajman.purohitId)).limit(1);
  if (!purohit) return null;

  const events = await db.select().from(eventsTable).where(eq(eventsTable.yajmanId, yajmanId));
  if (events.length === 0) return null;

  let bodyText = `${BEADS} *स्मरण*\n${RULE}\n`;

  for (const event of events) {
    const label = event.label || event.eventType || "अनुष्ठान";
    const pakshaHindi = HINDI_MAPS.paksha[event.paksha] || event.paksha;
    const maasHindi = HINDI_MAPS.maas[event.maas] || event.maas;
    const tithiEntry = fieldVocabMap.tithi_name.find((t: any) => t.tithiNumber === event.tithi);
    const tithiH = HINDI_MAPS.tithi_name[tithiEntry?.canonical || String(event.tithi)] || tithiEntry?.canonical || String(event.tithi);

    bodyText += `*${label}*\n${maasHindi} ${pakshaHindi}, ${tithiH}\n`;

    const occs = await db.select().from(occurrencesTable).where(eq(occurrencesTable.eventId, event.id)).orderBy(asc(occurrencesTable.cycleYear));
    if (occs.length > 0) {
      const years = occs.map(o => o.cycleYear).sort();
      bodyText += `${years.join(' · ')}\n`;
      let streak = 1;
      let currentYear = years[years.length - 1];
      for (let i = years.length - 2; i >= 0; i--) {
        if (years[i] === currentYear - 1) {
          streak++;
          currentYear--;
        } else {
          break;
        }
      }
      bodyText += `_${streak} वर्ष नियमित रूप से_\n`;
    } else {
      bodyText += `_कोई पुराना रिकॉर्ड नहीं_\n`;
    }
    bodyText += `\n`;
  }

  bodyText += `${RULE}\n*संकल्प:* ${purohit.name} जी`;

  return {
    type: "text",
    text: { body: bodyText },
  };
}

export async function buildBeneficiarySmaranCard(yajmanId: string, beneficiaryLabel: string): Promise<any | null> {
  const { db, eventsTable, occurrencesTable, yajmansTable, purohitsTable } = await import("@workspace/db");
  const { eq, and, asc, ilike } = await import("drizzle-orm");

  const [yajman] = await db.select().from(yajmansTable).where(eq(yajmansTable.id, yajmanId)).limit(1);
  if (!yajman) return null;
  const [purohit] = await db.select().from(purohitsTable).where(eq(purohitsTable.id, yajman.purohitId)).limit(1);
  if (!purohit) return null;

  const events = await db.select().from(eventsTable).where(and(eq(eventsTable.yajmanId, yajmanId), ilike(eventsTable.label, `%${beneficiaryLabel}%`)));
  if (events.length === 0) return null;

  let bodyText = `${BEADS} *${beneficiaryLabel} — स्मरण*\n${RULE}\n`;

  for (const event of events) {
    const label = event.eventType === "shraddh" ? "पुण्यतिथि" : (event.eventType === "birthday" ? "जन्मदिन" : "अनुष्ठान");
    const pakshaHindi = HINDI_MAPS.paksha[event.paksha] || event.paksha;
    const maasHindi = HINDI_MAPS.maas[event.maas] || event.maas;
    const tithiEntry = fieldVocabMap.tithi_name.find((t: any) => t.tithiNumber === event.tithi);
    const tithiH = HINDI_MAPS.tithi_name[tithiEntry?.canonical || String(event.tithi)] || tithiEntry?.canonical || String(event.tithi);

    bodyText += `*${label}*\n${maasHindi} ${pakshaHindi}, ${tithiH}\n`;

    const occs = await db.select().from(occurrencesTable).where(eq(occurrencesTable.eventId, event.id)).orderBy(asc(occurrencesTable.cycleYear));
    if (occs.length > 0) {
      const years = occs.map(o => o.cycleYear).sort();
      bodyText += `${years.join(' · ')}\n`;
      let streak = 1;
      let currentYear = years[years.length - 1];
      for (let i = years.length - 2; i >= 0; i--) {
        if (years[i] === currentYear - 1) {
          streak++;
          currentYear--;
        } else {
          break;
        }
      }
      bodyText += `_${streak} वर्ष नियमित रूप से_\n`;
    } else {
      bodyText += `_कोई पुराना रिकॉर्ड नहीं_\n`;
    }
    bodyText += `\n`;
  }

  bodyText += `${RULE}\n*संकल्प:* ${purohit.name} जी`;

  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `notify-purohit:${yajmanId}`,
              title: "हाँ, सूचित करें",
            },
          },
        ],
      },
    },
  };
}

export async function buildAgleKaamCard(yajmanId: string): Promise<any | null> {
  const { db, eventsTable, yajmansTable, purohitsTable } = await import("@workspace/db");
  const { eq, and, gte, asc } = await import("drizzle-orm");

  const [yajman] = await db.select().from(yajmansTable).where(eq(yajmansTable.id, yajmanId)).limit(1);
  if (!yajman) return null;
  const [purohit] = await db.select().from(purohitsTable).where(eq(purohitsTable.id, yajman.purohitId)).limit(1);
  if (!purohit) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

  const events = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.yajmanId, yajmanId),
        gte(eventsTable.resolvedDate, today),
        eq(eventsTable.resolvedCycleYear, currentYear)
      )
    )
    .orderBy(asc(eventsTable.resolvedDate))
    .limit(5);

  if (events.length === 0) return null;

  const formatShortDate = (d: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  let bodyText = `${NAMASTE} प्रणाम।\n${RULE}\n*आने वाले अनुष्ठान*\n`;

  for (const event of events) {
    if (!event.resolvedDate) continue;
    const dateObj = new Date(event.resolvedDate);
    const dateStr = formatShortDate(dateObj);
    const diffTime = dateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const label = event.label || event.eventType || "अनुष्ठान";
    const pakshaHindi = HINDI_MAPS.paksha[event.paksha] || event.paksha;
    const maasHindi = HINDI_MAPS.maas[event.maas] || event.maas;
    const tithiEntry = fieldVocabMap.tithi_name.find((t: any) => t.tithiNumber === event.tithi);
    const tithiH = HINDI_MAPS.tithi_name[tithiEntry?.canonical || String(event.tithi)] || tithiEntry?.canonical || String(event.tithi);

    bodyText += `\n*${label}* — ${dateStr}\n${maasHindi} ${pakshaHindi}, ${tithiH} — _${diffDays} दिन शेष_\n`;
  }

  bodyText += `\n${RULE}\n*पुरोहित:* ${purohit.name} जी`;

  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `notify-purohit:${yajmanId}`,
              title: "हाँ, सूचित करें",
            },
          },
        ],
      },
    },
  };
}
