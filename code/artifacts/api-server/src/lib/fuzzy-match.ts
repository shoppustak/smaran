import { VocabEntry } from "./vocab/types";

export const MAAS_MAX_EDITS = 2;
export const TITHI_MAX_EDITS = 2;
export const PAKSHA_MAX_EDITS = 2;
export const GOTRA_MAX_EDITS = 1;

export function normalizeString(str: string): string {
  return str
    .normalize("NFC")
    .replace(/[\u0300-\u036f\u200b-\u200d\uFEFF]/g, "")
    .toLowerCase()
    .trim();
}

export function getLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  let currRow = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    // Swap rows
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }
  return prevRow[b.length];
}

export function matchField(
  heard: string,
  vocab: VocabEntry[],
  maxEdits: number
): { canonical: string | null; matchScore: number } {
  if (!heard || typeof heard !== "string" || !heard.trim()) {
    return { canonical: null, matchScore: 0 };
  }

  const normalizedHeard = normalizeString(heard);
  if (!normalizedHeard) {
    return { canonical: null, matchScore: 0 };
  }

  // 1. Exact variant-table hit check
  for (const entry of vocab) {
    if (normalizeString(entry.canonical) === normalizedHeard) {
      return { canonical: entry.canonical, matchScore: 1 };
    }
    for (const variant of entry.variants) {
      if (normalizeString(variant) === normalizedHeard) {
        return { canonical: entry.canonical, matchScore: 1 };
      }
    }
  }

  // 2. Levenshtein fuzzy match check
  let minDistance = Infinity;
  let bestCanonical: string | null = null;

  for (const entry of vocab) {
    // Check distance against canonical
    const dCanonical = getLevenshteinDistance(normalizedHeard, normalizeString(entry.canonical));
    if (dCanonical < minDistance) {
      minDistance = dCanonical;
      bestCanonical = entry.canonical;
    }

    // Check distance against variants
    for (const variant of entry.variants) {
      const dVariant = getLevenshteinDistance(normalizedHeard, normalizeString(variant));
      if (dVariant < minDistance) {
        minDistance = dVariant;
        bestCanonical = entry.canonical;
      }
    }
  }

  if (minDistance <= maxEdits) {
    const matchScore = 1 - minDistance / (maxEdits + 1);
    return { canonical: bestCanonical, matchScore };
  }

  return { canonical: null, matchScore: 0 };
}
