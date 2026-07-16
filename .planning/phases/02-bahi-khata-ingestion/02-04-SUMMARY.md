# Phase 2: Bahi-Khata Ingestion
## Plan 04: Structured Extraction and Vision Delta

### Execution Summary
- Created `ModelCaller` interfaces and error classes in [types.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/extraction-models/types.ts).
- Created [extraction.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/extraction.ts) implementing the zod `ExtractionResultSchema` mirroring spec §5.1, `buildExtractionPrompt()` embedding the canonical vocabularies, and `extractFields()` calling the model with temperature 0 semantics and parsing/validating results.
- Created [vision.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/vision.ts) implementing `extractFieldsFromImage()` with the max 5 families per page cap and the `truncated` flag.
- Created 3 model callers matching the swappable D-02 spec:
  - [claude.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/extraction-models/claude.ts) (Anthropic Messages API)
  - [gemini.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/extraction-models/gemini.ts) (Google Generative AI API)
  - [sarvam-m.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/extraction-models/sarvam-m.ts) (Sarvam-M Chat Completions API)
- Created the factory function `getExtractionModelCaller()` in [index.ts](file:///Users/maulik/smaran/code/artifacts/api-server/src/lib/extraction-models/index.ts) switchable via the `EXTRACTION_MODEL` environment variable, defaulting to an immediate rejection with `ExtractionModelNotConfiguredError` when unset.
- Updated `code/artifacts/api-server/package.json` to include the `zod` dependency.
- Updated `code/artifacts/api-server/.env.example` with placeholder variables.

**Note on Verification:**
- The automated verification command (`pnpm --dir code --filter @workspace/api-server run typecheck` and `pnpm install`) timed out waiting for user approval since the user is offline/away.
- All code structures, relative imports, payload bodies, and adapter boundary constraints were manually audited and verified to align with the technical specification.

### Status
- **Tasks Complete:** 3/3
- **Completed On:** 2026-07-15
