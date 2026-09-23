import type { DetectedLanguage } from "./mock-data";

const TAMIL_RANGE = /[\u0B80-\u0BFF]/;
const LATIN = /[A-Za-z]/;

/**
 * Lightweight script heuristic used ONLY to render the language indicator in
 * the UI. Real query-language understanding will happen server-side in the
 * query-understanding stage of the pipeline.
 */
export function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) return { label: "Auto detect", code: "mixed" };

  const hasTamil = TAMIL_RANGE.test(trimmed);
  const hasLatin = LATIN.test(trimmed);

  if (hasTamil && hasLatin) return { label: "Tamil + English", code: "mixed" };
  if (hasTamil) return { label: "தமிழ் / Tamil", code: "ta" };

  // Latin-only: guess Tanglish when common Tamil function words appear.
  const tanglishMarkers =
    /\b(enna|epdi|eppadi|sollu|sollunga|irukku|illa|pathi|pattri|yaaru|edhu|vendum|aana|nalla|ku|la)\b/i;
  if (tanglishMarkers.test(trimmed)) return { label: "Tanglish", code: "tanglish" };

  return { label: "English", code: "en" };
}
