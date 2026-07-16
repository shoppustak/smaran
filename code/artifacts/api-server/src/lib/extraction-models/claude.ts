import { ModelCaller, ExtractionModelError } from "./types";
import { retryFetch } from "../retry";

export class ClaudeModelCaller implements ModelCaller {
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    this.apiKey = key;
    this.model = process.env.CLAUDE_MODEL_ID || "claude-3-5-haiku-20241022";
  }

  async call(
    systemPrompt: string,
    userContent: string | { imageBytes: Buffer }
  ): Promise<unknown> {
    let content: any;
    if (typeof userContent === "string") {
      content = userContent;
    } else {
      content = [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: userContent.imageBytes.toString("base64"),
          },
        },
        {
          type: "text",
          text: "Extract fields from the image as instructed.",
        },
      ];
    }

    try {
      const response = await retryFetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content,
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
          "claude-haiku-4.5",
          `Anthropic API returned error status ${response.status}`,
          response.status,
          body
        );
      }

      const resBody = (await response.json()) as {
        content?: Array<{ type: "text"; text: string }>;
        [key: string]: any;
      };

      if (!resBody.content || resBody.content.length === 0) {
        throw new ExtractionModelError(
          "claude-haiku-4.5",
          "Anthropic API returned empty content"
        );
      }

      return resBody.content[0].text;
    } catch (err) {
      if (err instanceof ExtractionModelError) {
        throw err;
      }
      throw new ExtractionModelError(
        "claude-haiku-4.5",
        err instanceof Error ? err.message : "Failed to call Anthropic API",
        undefined,
        err
      );
    }
  }
}
