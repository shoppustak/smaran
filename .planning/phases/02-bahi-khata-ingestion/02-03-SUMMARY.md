# Phase 2 (Bahi Khata Ingestion) - Plan 03 Execution Summary

## Deliverables Completed

1. **ASR Provider Types**:
   - `code/artifacts/api-server/src/lib/asr/types.ts`: Created the `AsrProvider` interface defining the single `transcribe` entry point, which accepts a Node `Buffer` representation of the audio bytes and a strictly typed language hint (`"hi-IN"`).
   - Created the custom `AsrError` class extending `Error` to throw structured exceptions containing the upstream response status and body, identifying the provider (`"sarvam" | "openai"`).

2. **Sarvam Saaras v3 ASR Adapter**:
   - `code/artifacts/api-server/src/lib/asr/sarvam.ts`: Created the `SarvamAsrProvider` class using native `fetch` with `FormData` to perform a multipart/form-data request to the Sarvam.ai synchronous REST transcription endpoint (`/speech-to-text`).
   - Gated by `SARVAM_API_KEY` and optional `SARVAM_API_BASE_URL` (defaulting to `https://api.sarvam.ai`).
   - Extracts the transcribed text cleanly, throwing `AsrError` on HTTP failures or network connectivity issues.
   - Forwards raw OGG/Opus audio bytes directly to the REST endpoint without transcoding.

3. **OpenAI Whisper-1 ASR Adapter (Fallback)**:
   - `code/artifacts/api-server/src/lib/asr/openai.ts`: Created the `OpenAiAsrProvider` class utilizing native `fetch` to target the `https://api.openai.com/v1/audio/transcriptions` endpoint.
   - Gated by `OPENAI_API_KEY`.
   - Maps the incoming `"hi-IN"` language hint to `"hi"` (ISO-639-1) for Whisper.
   - Follows the same structured `AsrError` throwing pattern for failures.

4. **ASR Provider Factory & Config Switch**:
   - `code/artifacts/api-server/src/lib/asr/index.ts`: Implemented the `getAsrProvider()` factory which parses the `ASR_PROVIDER` env variable.
   - Defaults to `"sarvam"` (the primary provider) but can be config-switched to `"openai"`.
   - Serves as the single adapter boundary entry point, preventing any direct imports of provider files elsewhere in the app.

5. **Environment Configuration**:
   - `code/artifacts/api-server/.env.example`: Extended to document `SARVAM_API_KEY`, `SARVAM_API_BASE_URL`, `OPENAI_API_KEY`, `ASR_PROVIDER`, and placeholders/comments for future extraction-model keys.
