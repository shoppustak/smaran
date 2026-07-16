import { ModelCaller, ExtractionModelError } from "./types";
import { retryFetch } from "../retry";

export class SarvamMModelCaller implements ModelCaller {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    const key = process.env.SARVAM_API_KEY;
    if (!key) {
      throw new Error("SARVAM_API_KEY is not configured");
    }
    this.apiKey = key;
    this.baseUrl = process.env.SARVAM_API_BASE_URL || "https://api.sarvam.ai";
    this.model = process.env.SARVAM_MODEL_ID || "sarvam-2b-v1";
  }

  async call(
    systemPrompt: string,
    userContent: string | { imageBytes: Buffer }
  ): Promise<unknown> {
    if (typeof userContent !== "string") {
      throw new Error("Sarvam-M does not support image/multimodal input.");
    }

    try {
      const response = await retryFetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": this.apiKey,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userContent,
            },
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          try {
            body = await response.text();
          } catch {
            body = null;
          }
        }
        throw new ExtractionModelError(
          "sarvam-m",
          `Sarvam Chat API returned error status ${response.status}`,
          response.status,
          body
        );
      }

      const resBody = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
        [key: string]: any;
      };

      const text = resBody.choices?.[0]?.message?.content;
      if (!text) {
        throw new ExtractionModelError(
          "sarvam-m",
          "Sarvam Chat API returned empty choices or content"
        );
      }

      return text;
    } catch (err) {
      if (err instanceof ExtractionModelError) {
        throw err;
      }
      throw new ExtractionModelError(
        "sarvam-m",
        err instanceof Error ? err.message : "Failed to call Sarvam Chat API",
        undefined,
        err
      );
    }
  }
}
