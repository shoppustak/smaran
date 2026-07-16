import { AsrProvider, AsrError } from "./types";
import { retryFetch } from "../retry";

export class SarvamAsrProvider implements AsrProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const key = process.env.SARVAM_API_KEY;
    if (!key) {
      throw new Error("SARVAM_API_KEY is not configured");
    }
    this.apiKey = key;
    this.baseUrl = process.env.SARVAM_API_BASE_URL || "https://api.sarvam.ai";
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
    formData.append("model", "saaras:v3");
    formData.append("language_code", opts.languageHint);

    try {
      const upstream = await retryFetch(`${this.baseUrl}/speech-to-text`, {
        method: "POST",
        headers: {
          "api-subscription-key": this.apiKey,
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
          "sarvam",
          `Sarvam API returned error status ${upstream.status}`,
          upstream.status,
          body
        );
      }

      const responseBody = (await upstream.json()) as {
        transcript?: string;
        request_id?: string;
        [key: string]: any;
      };

      return {
        transcript: responseBody.transcript ?? "",
        providerMeta: responseBody,
      };
    } catch (err) {
      if (err instanceof AsrError) {
        throw err;
      }
      throw new AsrError(
        "sarvam",
        err instanceof Error ? err.message : "Failed to reach Sarvam API",
        undefined,
        err
      );
    }
  }
}
