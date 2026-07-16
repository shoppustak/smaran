# Smaran Ground-Contact Evaluation Corpus

This directory is designated for the ground-contact evaluation corpus used to perform the bake-off between ASR providers and extraction models (specifically, Saaras v3 vs. OpenAI Whisper, and Claude Haiku 4.5 vs. Gemini Flash vs. Sarvam-M) as detailed in the Smaran Ingestion Plan (§11).

## Corpus Requirements

To run a valid evaluation, the corpus must meet the following strict criteria:
1. **Minimum Size**: At least 20 real voice notes from ground-contact interviews.
2. **Consent**: All voice notes must be collected with the explicit consent of the participating purohits.
3. **Diversity Checklist**:
   - **Regional Accents**: At least 2 distinct regional accents must be represented.
   - **Distinct Maas**: At least 5 distinct Hindu calendar months (Maas) must be mentioned across the samples.
   - **Paksha/Sudi-Badi**: Must include cases of both "Sudi" (Shukla) and "Badi" (Krishna) usage.
   - **Key Lunar Phases**: At least one "Purnima" (Full Moon) and one "Amavasya" (New Moon) event.
   - **Multi-Event**: At least one voice note containing multiple distinct events for the family.
   - **Multi-Family**: At least one voice note where multiple families are mentioned (the system should extract the first family only and flag `"multi-family"` in `confidence_notes` under Stage F).
   - **Noisy Environment**: At least one voice note recorded in a realistic noisy outdoor/field environment.

## Target JSON Format

The evaluation harness expects a JSON corpus file (e.g. `corpus.json`) structured as an array of objects:

```json
[
  {
    "audioPath": "./path/to/voice_note.ogg",
    "expectedFields": [
      {
        "family_name": "Sharma",
        "gotra": "Kashyap",
        "event_type": "shraddh",
        "maas": "Bhadrapada",
        "paksha": "Krishna",
        "tithi": 12
      }
    ]
  }
]
```

Each item in the array must provide:
- `audioPath`: Absolute or relative path (relative to the corpus JSON file or execution Cwd) to the recorded voice note audio file.
- `expectedFields`: An array of expected extracted events, containing:
  - `family_name`: Exact/normalized family name (e.g., `"Sharma"`).
  - `gotra`: Gotra name (e.g., `"Kashyap"`).
  - `event_type`: Event type enum (`"shraddh" | "katha" | "birthday" | "griha_pravesh" | "anniversary" | "other"`).
  - `maas`: Maas name (e.g., `"Bhadrapada"`).
  - `paksha`: Paksha name (`"Shukla" | "Krishna"`).
  - `tithi`: Tithi number (1 to 15, where 15 is Purnima for Shukla and Amavasya for Krishna).

## In-Repo Verification Fixture

Since the real ground-contact voice notes are sensitive and collected out-of-band in the field, this repository only includes `sample-fixture.json`, which contains synthetic placeholder entries for smoke testing. Do not use the sample fixture to claim real production accuracy.
