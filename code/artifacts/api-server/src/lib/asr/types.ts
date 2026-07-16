export interface AsrProvider {
  transcribe(
    audio: Buffer,
    opts: { languageHint: "hi-IN" }
  ): Promise<{
    transcript: string;         // Devanagari + Latin mixed, as heard
    providerMeta?: unknown;
  }>;
}

export class AsrError extends Error {
  provider: "sarvam" | "openai";
  status?: number;
  body?: unknown;

  constructor(
    provider: "sarvam" | "openai",
    message: string,
    status?: number,
    body?: unknown
  ) {
    super(message);
    this.name = "AsrError";
    this.provider = provider;
    this.status = status;
    this.body = body;
  }
}
