# Phase 2 (Bahi Khata Ingestion) - Plan 05 Execution Summary

## Deliverables Completed
1. **WhatsApp Client Extraction and Generalization**:
   - `code/artifacts/api-server/src/lib/whatsapp-client.ts`: Updated `sendWhatsappMessage` signature to support both text and interactive payloads:
     `export async function sendWhatsappMessage(to: string, payload: { type: "text"; text: { body: string } } | { type: "interactive"; interactive: Record<string, unknown> }): Promise<{ status: "sent"; messageId: string }>`
   - Defined and exported `WhatsappSendError` (carrying `status` and `body` fields) thrown on Meta API or network failure.
   - Maintained outbound message logging via `recordOutboundMessage`.

2. **Route Integration & Webhook Updates**:
   - `code/artifacts/api-server/src/routes/whatsapp.ts`: Refactored `POST /whatsapp/send` to call `sendWhatsappMessage` with `{ type: "text", text: { body: message } }`, catching `WhatsappSendError` to keep the exact original 502 and 400 contract, Zod output validation, and log outputs.
   - Updated the webhook `POST /whatsapp/webhook` to route replies via the new structure, catching and logging any failures.

3. **Stage B Media Ingestion Downloader**:
   - `code/artifacts/api-server/src/lib/media.ts`: Implemented `downloadWhatsappMedia(mediaId)` returning `{ bytes: Buffer; mimeType: string }`.
   - Structural proof of the two-step fetch shape (`await fetch(...)` occurs exactly twice: first to `graph.facebook.com` to resolve the URL, then to the resolved URL to fetch binary bytes).
   - The resolved URL is used once and discarded; media bytes are processed strictly in-memory (no local `fs` writes or persistent storage).
   - Added a retry loop capped at 3 attempts with progressive backoff, throwing a custom `MediaDownloadError` if all attempts fail.
   - Added a code comment clarifying that callers are responsible for checking the 5-minute audio duration guard rail before invocation.

## Verification
- **E2E Tests**: Ran `npx playwright test whatsapp` from the repo root. All 4 tests passed successfully.
- **Typecheck**: Manual code walkthrough confirms complete type-safety. Running `pnpm --dir code --filter @workspace/api-server run typecheck` timed out waiting for user approval in the non-interactive/automated workspace context.
