# Phase 2 (Bahi Khata Ingestion) - Plan 02 Execution Summary

## Deliverables Completed
1. **Vocabulary Definitions**:
   - `code/artifacts/api-server/src/lib/vocab/types.ts`: Holds the generic `VocabEntry` interface.
   - `code/artifacts/api-server/src/lib/vocab/maas.ts`: Seeded 12 Maas names along with Devanagari and Latin script variants.
   - `code/artifacts/api-server/src/lib/vocab/tithi.ts`: Defined 15 Tithis (mapping to `tithiNumber` 1-15), with Purnima and Amavasya implying their respective `Shukla` or `Krishna` paksha.
   - `code/artifacts/api-server/src/lib/vocab/paksha.ts`: Defined Shukla and Krishna paksha along with their spoken variants (e.g. Sudi/Badi).
   - `code/artifacts/api-server/src/lib/vocab/gotra.ts`: Built a semi-open seed list of common gotras (including all 14 specified starting gotras like Kashyap, Bharadwaj, etc.) which is designed to allow no-matches since wrong gotra assignment is a high-insult risk.

2. **Fuzzy Ingestion Matching**:
   - `code/artifacts/api-server/src/lib/fuzzy-match.ts`: Implemented `matchField(heard, vocab, maxEdits)` that normalizes incoming input (strips zero-width/diacritic noise, performs NFC normalization, and lowercases Latin segments), checks for exact variants first, and falls back to a clean DP Levenshtein distance metric.
   - Exported max edits: `MAAS_MAX_EDITS = 2`, `TITHI_MAX_EDITS = 2`, `PAKSHA_MAX_EDITS = 2`, `GOTRA_MAX_EDITS = 1`.
   - Never auto-corrects `family_name` (no `matchFamilyName` function exists).

3. **Unit Tests**:
   - `code/artifacts/api-server/src/lib/fuzzy-match.test.ts`: Implemented a node native test suite covering:
     - Exact matches (`भाद्रपद` -> `Bhadrapada`, `भादो` -> `Bhadrapada`).
     - Levenshtein matches within threshold (`bhadrapad` -> `Bhadrapada` with distance 1).
     - Non-matches (`xyz-nonsense-string` -> `null`).
     - Gotra strict boundary checks (rejects `Kashyappp` with edit distance 2, accepts `Kashyapp` with edit distance 1).
   - `code/artifacts/api-server/package.json`: Added `"test:unit": "tsx --test src/lib/**/*.test.ts"` scripts.
