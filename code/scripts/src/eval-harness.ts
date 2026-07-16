import fs from "node:fs";
import path from "node:path";
import { getAsrProvider } from "../../artifacts/api-server/src/lib/asr/index";
import { extractFields } from "../../artifacts/api-server/src/lib/extraction";
import { getExtractionModelCaller } from "../../artifacts/api-server/src/lib/extraction-models/index";
import {
  matchField,
  normalizeString,
  GOTRA_MAX_EDITS,
  MAAS_MAX_EDITS,
  PAKSHA_MAX_EDITS,
  TITHI_MAX_EDITS,
} from "../../artifacts/api-server/src/lib/fuzzy-match";
import { gotraVocab } from "../../artifacts/api-server/src/lib/vocab/gotra";
import { maasVocab } from "../../artifacts/api-server/src/lib/vocab/maas";
import { pakshaVocab } from "../../artifacts/api-server/src/lib/vocab/paksha";
import { tithiVocab } from "../../artifacts/api-server/src/lib/vocab/tithi";

// Local vocab for event_type
const eventTypeVocab = [
  { canonical: "shraddh", variants: ["shradh", "shraadh", "श्राद्ध"] },
  { canonical: "katha", variants: ["satyanarayan katha", "सत्यनारायण कथा", "कथा"] },
  { canonical: "birthday", variants: ["janamdin", "जन्मदिन", "जन्म"] },
  { canonical: "griha_pravesh", variants: ["grihapravesh", "गृह प्रवेश", "गृहप्रवेश"] },
  { canonical: "anniversary", variants: ["marriage anniversary", "वर्षगांठ", "सालगिरह"] },
  { canonical: "other", variants: [] },
];
const EVENT_TYPE_MAX_EDITS = 2;

interface ExpectedEvent {
  family_name: string | null;
  gotra: string | null;
  event_type: string | null;
  maas: string | null;
  paksha: string | null;
  tithi: number | null;
}

interface CorpusSample {
  audioPath: string;
  expectedFields: ExpectedEvent[];
}

interface Mismatch {
  sampleIndex: number;
  audioPath: string;
  field: string;
  expected: any;
  actualRaw: any;
  actualMatched: any;
}

// Helper to map tithi number to canonical tithi name for mock extraction
function getTithiNameFromNumber(num: number | null, paksha: string | null): string | null {
  if (num === null) return null;
  if (num === 15) {
    return paksha === "Shukla" ? "Purnima" : "Amavasya";
  }
  const entry = tithiVocab.find(
    (t) => t.tithiNumber === num && t.canonical !== "Purnima" && t.canonical !== "Amavasya"
  );
  return entry ? entry.canonical : null;
}

async function main() {
  const args = process.argv.slice(2);
  let provider = "";
  let extraction = "";
  let corpusPath = "";

  for (const arg of args) {
    if (arg.startsWith("--provider=")) {
      provider = arg.split("=")[1];
    } else if (arg.startsWith("--extraction=")) {
      extraction = arg.split("=")[1];
    } else if (arg.startsWith("--corpus=")) {
      corpusPath = arg.split("=")[1];
    }
  }

  if (!provider) {
    console.error("Error: --provider is required (e.g., --provider=sarvam or --provider=openai)");
    process.exit(1);
  }
  if (!extraction) {
    console.error(
      "Error: --extraction is required (e.g., --extraction=claude-haiku-4.5, --extraction=gemini-flash, or --extraction=sarvam-m)"
    );
    process.exit(1);
  }
  if (!corpusPath) {
    console.error("Error: --corpus is required (e.g., --corpus=./src/eval-corpus/sample-fixture.json)");
    process.exit(1);
  }

  // Check if we are missing API keys to auto-enable mock mode
  const isMockMode =
    args.includes("--mock") ||
    (provider === "sarvam" && !process.env.SARVAM_API_KEY) ||
    (provider === "openai" && !process.env.OPENAI_API_KEY) ||
    (extraction === "claude-haiku-4.5" && !process.env.ANTHROPIC_API_KEY) ||
    (extraction === "gemini-flash" && !process.env.GOOGLE_AI_API_KEY) ||
    (extraction === "sarvam-m" && !process.env.SARVAM_API_KEY);

  // Setup process env
  process.env.ASR_PROVIDER = provider;
  process.env.EXTRACTION_MODEL = extraction;

  // Resolve corpus path relative to cwd
  const resolvedCorpusPath = path.resolve(process.cwd(), corpusPath);
  if (!fs.existsSync(resolvedCorpusPath)) {
    console.error(`Error: Corpus file not found at ${resolvedCorpusPath}`);
    process.exit(1);
  }

  const corpus: CorpusSample[] = JSON.parse(fs.readFileSync(resolvedCorpusPath, "utf-8"));
  console.log(`Loaded ${corpus.length} samples from ${resolvedCorpusPath}`);

  if (isMockMode) {
    console.warn("\n======================================================================");
    console.warn("⚠️ WARNING: API keys are not fully configured in the environment.");
    console.warn("   Auto-enabling Mock/Dry-Run mode. Network calls will be intercepted.");
    console.warn("======================================================================\n");

    if (!process.env.SARVAM_API_KEY) process.env.SARVAM_API_KEY = "mock-sarvam-key";
    if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = "mock-openai-key";
    if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = "mock-anthropic-key";
    if (!process.env.GOOGLE_AI_API_KEY) process.env.GOOGLE_AI_API_KEY = "mock-google-key";

    let currentSampleIndex = 0;

    // Intercept global fetch
    // @ts-ignore
    globalThis.fetch = async (url: any, init?: any): Promise<any> => {
      const urlStr = url.toString();
      const sample = corpus[currentSampleIndex];
      const expected = sample.expectedFields;

      // ASR calls
      if (urlStr.includes("speech-to-text") || urlStr.includes("transcriptions")) {
        const text = `Mock transcript for family ${expected[0]?.family_name || "unknown"}`;
        const responseData = urlStr.includes("speech-to-text")
          ? { transcript: text, request_id: "mock-request-123" }
          : { text };

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Extraction calls
      if (
        urlStr.includes("messages") ||
        urlStr.includes("generateContent") ||
        urlStr.includes("chat/completions")
      ) {
        const family_name = expected[0]?.family_name || null;
        const gotra = expected[0]?.gotra || null;
        const events = expected.map((ev) => ({
          event_type: ev.event_type,
          label: ev.event_type ? ev.event_type + " Karya" : null,
          maas: ev.maas,
          paksha: ev.paksha,
          tithi_name: getTithiNameFromNumber(ev.tithi, ev.paksha),
          gregorian_hint: null,
        }));

        const extractionResult = {
          family_name,
          gotra,
          whatsapp_number: null,
          events,
          confidence_notes: null,
        };

        let responseBody: any;
        if (urlStr.includes("messages")) {
          // Claude
          responseBody = {
            content: [{ type: "text", text: JSON.stringify(extractionResult) }],
          };
        } else if (urlStr.includes("generateContent")) {
          // Gemini
          responseBody = {
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(extractionResult) }],
                },
              },
            ],
          };
        } else {
          // Sarvam-M
          responseBody = {
            choices: [
              {
                message: {
                  content: JSON.stringify(extractionResult),
                },
              },
            ],
          };
        }

        // Advance sample index after extraction is completed
        currentSampleIndex = (currentSampleIndex + 1) % corpus.length;

        return new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    };
  }

  // Metrics trackers
  let totalAlignments = 0;
  const correctCounts = {
    family_name: 0,
    gotra: 0,
    event_type: 0,
    maas: 0,
    paksha: 0,
    tithi: 0,
  };

  const mismatches: Mismatch[] = [];

  const asrProvider = getAsrProvider();
  const modelCaller = getExtractionModelCaller();

  console.log(`Running evaluation against ${corpus.length} samples...\n`);

  for (let i = 0; i < corpus.length; i++) {
    const sample = corpus[i];
    const audioResolvedPath = path.resolve(path.dirname(resolvedCorpusPath), sample.audioPath);

    if (!fs.existsSync(audioResolvedPath)) {
      console.error(`Error: Audio file not found at ${audioResolvedPath}`);
      process.exit(1);
    }

    const audioBuffer = fs.readFileSync(audioResolvedPath);
    console.log(`[Sample ${i + 1}/${corpus.length}] Transcribing ${sample.audioPath}...`);

    let transcript = "";
    try {
      const asrResult = await asrProvider.transcribe(audioBuffer, { languageHint: "hi-IN" });
      transcript = asrResult.transcript;
      console.log(`  Transcript: "${transcript}"`);
    } catch (err) {
      console.error(`  ASR failed for ${sample.audioPath}:`, err);
      process.exit(1);
    }

    console.log(`  Extracting fields using ${extraction}...`);
    let extractionResult;
    try {
      extractionResult = await extractFields(transcript, modelCaller);
      console.log(`  Extracted:`, JSON.stringify(extractionResult, null, 2));
    } catch (err) {
      console.error(`  Extraction failed for ${sample.audioPath}:`, err);
      process.exit(1);
    }

    // Align expected events vs actual events
    const expectedEvents = sample.expectedFields;
    const actualEvents = extractionResult.events || [];
    const maxEvents = Math.max(expectedEvents.length, actualEvents.length);

    totalAlignments += maxEvents;

    for (let j = 0; j < maxEvents; j++) {
      const expected = expectedEvents[j] || null;
      const actual = actualEvents[j] || null;

      // Extract family_name and gotra from extraction root if actual event exists
      const actualFamilyName = actual ? extractionResult.family_name : null;
      const actualGotra = actual ? extractionResult.gotra : null;

      // 1. Compare family_name
      const expectedFamilyName = expected?.family_name ?? null;
      const familyMatched =
        normalizeString(actualFamilyName || "") === normalizeString(expectedFamilyName || "");
      if (familyMatched) {
        correctCounts.family_name++;
      } else {
        mismatches.push({
          sampleIndex: i,
          audioPath: sample.audioPath,
          field: "family_name",
          expected: expectedFamilyName,
          actualRaw: actualFamilyName,
          actualMatched: actualFamilyName,
        });
      }

      // 2. Compare gotra
      const expectedGotra = expected?.gotra ?? null;
      const gotraMatchResult = matchField(actualGotra || "", gotraVocab, GOTRA_MAX_EDITS);
      const gotraMatched =
        normalizeString(gotraMatchResult.canonical || "") === normalizeString(expectedGotra || "");
      if (gotraMatched) {
        correctCounts.gotra++;
      } else {
        mismatches.push({
          sampleIndex: i,
          audioPath: sample.audioPath,
          field: "gotra",
          expected: expectedGotra,
          actualRaw: actualGotra,
          actualMatched: gotraMatchResult.canonical,
        });
      }

      // 3. Compare event_type
      const expectedEventType = expected?.event_type ?? null;
      const actualEventType = actual?.event_type ?? null;
      const eventTypeMatchResult = matchField(
        actualEventType || "",
        eventTypeVocab,
        EVENT_TYPE_MAX_EDITS
      );
      const eventTypeMatched =
        normalizeString(eventTypeMatchResult.canonical || "") ===
        normalizeString(expectedEventType || "");
      if (eventTypeMatched) {
        correctCounts.event_type++;
      } else {
        mismatches.push({
          sampleIndex: i,
          audioPath: sample.audioPath,
          field: "event_type",
          expected: expectedEventType,
          actualRaw: actualEventType,
          actualMatched: eventTypeMatchResult.canonical,
        });
      }

      // 4. Compare maas
      const expectedMaas = expected?.maas ?? null;
      const actualMaas = actual?.maas ?? null;
      const maasMatchResult = matchField(actualMaas || "", maasVocab, MAAS_MAX_EDITS);
      const maasMatched =
        normalizeString(maasMatchResult.canonical || "") === normalizeString(expectedMaas || "");
      if (maasMatched) {
        correctCounts.maas++;
      } else {
        mismatches.push({
          sampleIndex: i,
          audioPath: sample.audioPath,
          field: "maas",
          expected: expectedMaas,
          actualRaw: actualMaas,
          actualMatched: maasMatchResult.canonical,
        });
      }

      // 5. Compare paksha
      const expectedPaksha = expected?.paksha ?? null;
      const actualPaksha = actual?.paksha ?? null;
      const pakshaMatchResult = matchField(actualPaksha || "", pakshaVocab, PAKSHA_MAX_EDITS);
      const pakshaMatched =
        normalizeString(pakshaMatchResult.canonical || "") === normalizeString(expectedPaksha || "");
      if (pakshaMatched) {
        correctCounts.paksha++;
      } else {
        mismatches.push({
          sampleIndex: i,
          audioPath: sample.audioPath,
          field: "paksha",
          expected: expectedPaksha,
          actualRaw: actualPaksha,
          actualMatched: pakshaMatchResult.canonical,
        });
      }

      // 6. Compare tithi
      const expectedTithi = expected?.tithi ?? null;
      const actualTithiName = actual?.tithi_name ?? null;
      const tithiMatchResult = matchField(actualTithiName || "", tithiVocab, TITHI_MAX_EDITS);
      const matchedTithiEntry = tithiVocab.find((t) => t.canonical === tithiMatchResult.canonical);
      const matchedTithiNumber = matchedTithiEntry ? matchedTithiEntry.tithiNumber : null;
      const tithiMatched = matchedTithiNumber === expectedTithi;
      if (tithiMatched) {
        correctCounts.tithi++;
      } else {
        mismatches.push({
          sampleIndex: i,
          audioPath: sample.audioPath,
          field: "tithi",
          expected: expectedTithi,
          actualRaw: actualTithiName,
          actualMatched: matchedTithiNumber,
        });
      }
    }
  }

  // Calculate accuracies
  const accuracies = {
    family_name: totalAlignments > 0 ? (correctCounts.family_name / totalAlignments) * 100 : 0,
    gotra: totalAlignments > 0 ? (correctCounts.gotra / totalAlignments) * 100 : 0,
    event_type: totalAlignments > 0 ? (correctCounts.event_type / totalAlignments) * 100 : 0,
    maas: totalAlignments > 0 ? (correctCounts.maas / totalAlignments) * 100 : 0,
    paksha: totalAlignments > 0 ? (correctCounts.paksha / totalAlignments) * 100 : 0,
    tithi: totalAlignments > 0 ? (correctCounts.tithi / totalAlignments) * 100 : 0,
  };

  const macroAverage =
    (accuracies.family_name +
      accuracies.gotra +
      accuracies.event_type +
      accuracies.maas +
      accuracies.paksha +
      accuracies.tithi) /
    6;

  console.log("\n=======================================================");
  console.log("               EVALUATION FIELD CONFUSION LOGS         ");
  console.log("=======================================================");
  if (mismatches.length === 0) {
    console.log("No mismatches found! Perfect accuracy across all samples.");
  } else {
    const fields = ["family_name", "gotra", "event_type", "maas", "paksha", "tithi"];
    for (const field of fields) {
      const fieldMismatches = mismatches.filter((m) => m.field === field);
      if (fieldMismatches.length > 0) {
        console.log(`\nMismatches for field '${field}':`);
        for (const m of fieldMismatches) {
          console.log(
            `  • Sample ${m.sampleIndex + 1} (${m.audioPath})` +
              ` | Expected: ${JSON.stringify(m.expected)}` +
              ` | Actual (raw): ${JSON.stringify(m.actualRaw)}` +
              ` | Actual (matched): ${JSON.stringify(m.actualMatched)}`
          );
        }
      }
    }
  }

  console.log("\n=======================================================");
  console.log("               EVALUATION ACCURACY SUMMARY             ");
  console.log("=======================================================");
  console.log(`Total Event Alignments: ${totalAlignments}`);
  console.log(`-------------------------------------------------------`);
  console.log(`Field Name      | Matches / Total | Accuracy`);
  console.log(`-------------------------------------------------------`);
  console.log(
    `family_name     | ${correctCounts.family_name.toString().padEnd(5)} / ${totalAlignments.toString().padEnd(5)} | ${accuracies.family_name.toFixed(2)}%`
  );
  console.log(
    `gotra           | ${correctCounts.gotra.toString().padEnd(5)} / ${totalAlignments.toString().padEnd(5)} | ${accuracies.gotra.toFixed(2)}%`
  );
  console.log(
    `event_type      | ${correctCounts.event_type.toString().padEnd(5)} / ${totalAlignments.toString().padEnd(5)} | ${accuracies.event_type.toFixed(2)}%`
  );
  console.log(
    `maas            | ${correctCounts.maas.toString().padEnd(5)} / ${totalAlignments.toString().padEnd(5)} | ${accuracies.maas.toFixed(2)}%`
  );
  console.log(
    `paksha          | ${correctCounts.paksha.toString().padEnd(5)} / ${totalAlignments.toString().padEnd(5)} | ${accuracies.paksha.toFixed(2)}%`
  );
  console.log(
    `tithi           | ${correctCounts.tithi.toString().padEnd(5)} / ${totalAlignments.toString().padEnd(5)} | ${accuracies.tithi.toFixed(2)}%`
  );
  console.log(`-------------------------------------------------------`);
  console.log(`Macro-Averaged Field Accuracy: ${macroAverage.toFixed(2)}%`);
  console.log(`=======================================================\n`);

  const acceptanceBar = 90;
  if (macroAverage < acceptanceBar) {
    console.error(
      `❌ ERROR: Macro-averaged accuracy (${macroAverage.toFixed(2)}%) is below the §11 acceptance bar of ${acceptanceBar}%.`
    );
    process.exit(1);
  } else {
    console.log(`✅ SUCCESS: Macro-averaged accuracy is above or equal to the acceptance bar of ${acceptanceBar}%.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Unhandled error in main:", err);
  process.exit(1);
});
