import { ModelCaller, ExtractionModelError } from "./types";
import { retryFetch } from "../retry";

export class GeminiModelCaller implements ModelCaller {
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }
    this.apiKey = key;
    this.model = process.env.GEMINI_MODEL_ID || "gemini-1.5-flash";
  }

  async call(
    systemPrompt: string,
    userContent: string | { imageBytes: Buffer }
  ): Promise<unknown> {
    const parts: any[] = [];
    if (typeof userContent === "string") {
      parts.push({ text: userContent });
    } else {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: userContent.imageBytes.toString("base64"),
        },
      });
      parts.push({ text: "Extract fields from the image as instructed." });
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await retryFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
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
          "gemini-flash",
          `Google AI API returned error status ${response.status}`,
          response.status,
          body
        );
      }

      const resBody = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        [key: string]: any;
      };

      const text = resBody.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new ExtractionModelError(
          "gemini-flash",
          "Google AI API returned empty candidates or text"
        );
      }

      return text;
    } catch (err) {
      if (err instanceof ExtractionModelError) {
        throw err;
      }
      throw new ExtractionModelError(
        "gemini-flash",
        err instanceof Error ? err.message : "Failed to call Google AI API",
        undefined,
        err
      );
    }
  }
}
