import { z } from "zod";
import { ModelCaller } from "./extraction-models/types";
import { maasVocab } from "./vocab/maas";
import { tithiVocab } from "./vocab/tithi";
import { pakshaVocab } from "./vocab/paksha";
import { gotraVocab } from "./vocab/gotra";

export const ExtractionResultSchema = z.object({
  family_name: z.string().nullable(),
  gotra: z.string().nullable(),
  whatsapp_number: z.string().nullable(),
  events: z.array(
    z.object({
      event_type: z.enum([
        "shraddh",
        "katha",
        "birthday",
        "griha_pravesh",
        "anniversary",
        "other",
      ]),
      label: z.string().nullable(),
      maas: z.string().nullable(),
      paksha: z.enum(["Shukla", "Krishna"]).nullable(),
      tithi_name: z.string().nullable(),
      gregorian_hint: z.string().nullable(),
    })
  ),
  confidence_notes: z.string().nullable(),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export function buildExtractionPrompt(): string {
  const maasCanonical = maasVocab.map((v) => v.canonical).join(", ");
  const tithiCanonical = tithiVocab.map((v) => v.canonical).join(", ");
  const pakshaCanonical = pakshaVocab.map((v) => v.canonical).join(", ");
  const gotraCanonical = gotraVocab.map((v) => v.canonical).join(", ");

  return `You are a system that extracts structured family and event data from voice transcripts or images of a purohit's ledger (bahi khata).
You must output a single JSON object matching this schema:
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

Extraction Rules:
1. NEVER guess a field that was not spoken or present. If you cannot find a value, return null for that field.
2. Multiple events per note are normal. Extract all of them.
3. Exactly ONE family per note/transcript. If two or more families are detected, extract the first family only and set "confidence_notes" to "multi-family".
4. Here are the canonical lists of terms. If you extract these fields, match them to these canonical values if possible, or extract them as heard:
   - Canonical Maas (months): [ ${maasCanonical} ]
   - Canonical Tithis: [ ${tithiCanonical} ] (Note: Purnima implies paksha Shukla, Amavasya implies paksha Krishna. If either is spoken, set paksha to Shukla or Krishna respectively.)
   - Canonical Paksha: [ ${pakshaCanonical} ]
   - Canonical Gotras (partial seed list): [ ${gotraCanonical} ]
5. Return ONLY a valid JSON object. Do not include any explanation or markdown formatting (except a standard json code block if required by the caller, but preferably just raw JSON).`;
}

export async function extractFields(
  transcript: string,
  caller: ModelCaller
): Promise<ExtractionResult> {
  const prompt = buildExtractionPrompt();
  
  // Calls with temperature: 0 semantics (passed down to the LLM)
  const rawResponse = await caller.call(prompt, transcript);
  
  let jsonString: string;
  if (typeof rawResponse === "string") {
    jsonString = rawResponse;
  } else {
    jsonString = JSON.stringify(rawResponse);
  }

  // Strip markdown code blocks if present
  jsonString = jsonString.trim();
  if (jsonString.startsWith("```")) {
    const lines = jsonString.split("\n");
    const firstLine = lines[0];
    if (firstLine.startsWith("```")) {
      lines.shift();
    }
    const lastLine = lines[lines.length - 1];
    if (lastLine.endsWith("```")) {
      lines.pop();
    }
    jsonString = lines.join("\n").trim();
  }

  const parsed = JSON.parse(jsonString);
  return ExtractionResultSchema.parse(parsed);
}
