import { logger } from "./logger";

const GRAPH_API_VERSION = "v21.0";

export class MediaDownloadError extends Error {
  status?: number;
  body?: any;

  constructor(message: string, status?: number, body?: any) {
    super(message);
    this.name = "MediaDownloadError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Downloads WhatsApp media using a two-step fetch process.
 * 
 * NOTE: The caller (e.g. the pipeline orchestrator) is responsible for checking the
 * audio duration (e.g. rejecting audio > 5 minutes) from the webhook payload before
 * invoking this function, as media metadata/duration is not available on the download endpoint.
 */
export async function downloadWhatsappMedia(mediaId: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!WHATSAPP_ACCESS_TOKEN) {
    throw new MediaDownloadError("WhatsApp access token is not configured (WHATSAPP_ACCESS_TOKEN).", 502);
  }

  let lastError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Step 1: Resolve the download URL
      const resolveRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
        }
      );

      if (!resolveRes.ok) {
        const body = (await resolveRes.json().catch(() => ({}))) as any;
        throw new MediaDownloadError(
          body?.error?.message ?? `Failed to resolve media URL (HTTP ${resolveRes.status})`,
          resolveRes.status,
          body
        );
      }

      const data = (await resolveRes.json()) as { url?: string; mime_type?: string };
      if (!data.url) {
        throw new MediaDownloadError("Media resolution response did not contain a URL", resolveRes.status, data);
      }

      const mimeType = data.mime_type || "application/octet-stream";

      // Step 2: Download raw bytes from the resolved URL
      const downloadRes = await fetch(
        data.url,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
        }
      );

      if (!downloadRes.ok) {
        const body = await downloadRes.text().catch(() => "");
        throw new MediaDownloadError(
          `Failed to download media bytes (HTTP ${downloadRes.status})`,
          downloadRes.status,
          body
        );
      }

      const arrayBuffer = await downloadRes.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);

      return { bytes, mimeType };
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt, mediaId }, "Attempt to download WhatsApp media failed");
      // If we haven't reached the limit, wait a bit before retrying
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  if (lastError instanceof MediaDownloadError) {
    throw lastError;
  }
  throw new MediaDownloadError(
    `Failed to download WhatsApp media after 3 attempts: ${lastError?.message || "Unknown error"}`,
    502,
    lastError
  );
}
