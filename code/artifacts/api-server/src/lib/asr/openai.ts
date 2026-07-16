import { AsrProvider, AsrError } from "./types";

export class OpenAiAsrProvider implements AsrProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    this.apiKey = key;
    this.baseUrl = "https://api.openai.com/v1";
  }

  async transcribe(
    audio: Buffer,
    opts: { languageHint: "hi-IN" }
  ): Promise<{
    transcript: string;
    providerMeta?: unknown;
  }> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audio)], { type: "audio/ogg" });
    formData.append("file", blob, "audio.ogg");
    formData.append("model", "whisper-1");
    formData.append("language", opts.languageHint === "hi-IN" ? "hi" : "en");

    try {
      const upstream = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!upstream.ok) {
        let body: unknown;
        try {
          body = await upstream.json();
        } catch {
          try {
            body = await upstream.text();
          } catch {
            body = null;
          }
        }
        throw new AsrError(
          "openai",
          `OpenAI API returned error status ${upstream.status}`,
          upstream.status,
          body
        );
      }

      const responseBody = (await upstream.json()) as {
        text?: string;
        [key: string]: any;
      };

      return {
        transcript: responseBody.text ?? "",
        providerMeta: responseBody,
      };
    } catch (err) {
      if (err instanceof AsrError) {
        throw err;
      }
      throw new AsrError(
        "openai",
        err instanceof Error ? err.message : "Failed to reach OpenAI API",
        undefined,
        err
      );
    }
  }
}
