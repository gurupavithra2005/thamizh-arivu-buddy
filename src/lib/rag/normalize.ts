/**
 * Tamil-safe text normalisation.
 *
 * The original text is always kept by the caller (document_chunks.content);
 * the output of this module is stored separately in normalized_content and is
 * only used for full-text search and embedding input.
 *
 * Deliberately conservative: no stemming, no transliteration, no removal of
 * literary punctuation that carries meaning in classical Tamil verse.
 */

/** Zero-width and bidi control characters that break Tamil rendering/search. */
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;

/** Curly quotes / dashes that differ between e-text editions of the same work. */
const PUNCTUATION_MAP: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u201B]/g, "'"],
  [/[\u201C\u201D\u201F]/g, '"'],
  [/[\u2013\u2014\u2015]/g, "-"],
  [/\u2026/g, "..."],
];

/** Collapses runs of whitespace without destroying paragraph boundaries. */
export function normalizeTamilText(input: string): string {
  let text = input.normalize("NFC").replace(INVISIBLE, "");

  for (const [pattern, replacement] of PUNCTUATION_MAP) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Rough token estimate that works for both Tamil and English. */
export function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  return Math.max(words, Math.ceil(chars / 4));
}
