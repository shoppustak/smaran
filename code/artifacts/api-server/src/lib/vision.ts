import { buildExtractionPrompt, ExtractionResult, ExtractionResultSchema } from "./extraction";
import { ModelCaller } from "./extraction-models/types";

export async function extractFieldsFromImage(
  imageBytes: Buffer,
  caller: ModelCaller
): Promise<{ families: ExtractionResult[]; truncated: boolean }> {
  // Reuse the main extraction prompt, but override the single-family rule for images
  const prompt =
    buildExtractionPrompt() +
    "\n\nCRITICAL DELTA FOR IMAGES: This is an image of a ledger page. " +
    "Extract all families on this page. Return a JSON array of family objects " +
    "conforming to the schema above, rather than a single family object.";

  const rawResponse = await caller.call(prompt, { imageBytes });

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
  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array from vision extraction");
  }

  const families = parsed.map((item) => ExtractionResultSchema.parse(item));

  let truncated = false;
  let finalFamilies = families;
  if (families.length > 5) {
    finalFamilies = families.slice(0, 5);
    truncated = true;
  }

  return {
    families: finalFamilies,
    truncated,
  };
}
