import { AsrProvider } from "./types";
import { SarvamAsrProvider } from "./sarvam";
import { OpenAiAsrProvider } from "./openai";

export * from "./types";

export function getAsrProvider(): AsrProvider {
  const provider = process.env.ASR_PROVIDER || "sarvam";

  if (provider === "sarvam") {
    return new SarvamAsrProvider();
  } else if (provider === "openai") {
    return new OpenAiAsrProvider();
  } else {
    throw new Error(`Unsupported ASR provider: ${provider}`);
  }
}
