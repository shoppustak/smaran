import { ModelCaller, ExtractionModelNotConfiguredError } from "./types";
import { ClaudeModelCaller } from "./claude";
import { GeminiModelCaller } from "./gemini";
import { SarvamMModelCaller } from "./sarvam-m";

export * from "./types";

export function getExtractionModelCaller(): ModelCaller {
  const model = process.env.EXTRACTION_MODEL;

  if (model === "claude-haiku-4.5") {
    return new ClaudeModelCaller();
  } else if (model === "gemini-flash") {
    return new GeminiModelCaller();
  } else if (model === "sarvam-m") {
    return new SarvamMModelCaller();
  } else {
    // If unset or unsupported, return a caller whose .call() rejects
    return {
      call: async () => {
        throw new ExtractionModelNotConfiguredError();
      },
    };
  }
}
