import { normalizeTamilText } from "./normalize";

export type ExtractedPage = { pageNumber: number | null; text: string; section?: string | null };

export type ExtractedDocument = {
  title: string | null;
  language: string | null;
  pages: ExtractedPage[];
  pageCount: number;
  contentType: string;
};

/** Strips scripts, styles, navigation and tags from an HTML document. */
export function extractFromHtml(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]!).trim() : null;

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|header|footer|aside|form|noscript)[\s\S]*?<\/\1>/gi, " ");

  const main = body.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
  if (main) body = main[2]!;

  const text = decodeEntities(
    body
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  );

  return { title, text: normalizeTamilText(text) };
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

/** Extracts text page-by-page from a PDF that already has a text layer. */
export async function extractFromPdf(bytes: Uint8Array): Promise<ExtractedPage[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text)];
  return pages
    .map((pageText, i) => ({ pageNumber: i + 1, text: normalizeTamilText(pageText) }))
    .filter((page) => page.text.length > 0);
}

/**
 * Fetches a URL and extracts text based on the served content type.
 * Supports HTML, plain text and text-layer PDFs; scanned images are Phase 6.
 */
export async function extractFromUrl(url: string): Promise<ExtractedDocument> {
  const response = await fetch(url, {
    headers: { "User-Agent": "THAMIZHARIVU-AI/1.0 (knowledge ingestion)" },
  });
  if (!response.ok) throw new Error(`Could not fetch source (${response.status}) — ${url}`);

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
    const pages = await extractFromPdf(new Uint8Array(await response.arrayBuffer()));
    return { title: null, language: null, pages, pageCount: pages.length, contentType: "pdf" };
  }

  const raw = await response.text();

  if (contentType.includes("html") || /<html[\s>]/i.test(raw)) {
    const { title, text } = extractFromHtml(raw);
    return {
      title,
      language: detectDominantLanguage(text),
      pages: [{ pageNumber: null, text }],
      pageCount: 1,
      contentType: "html",
    };
  }

  const text = normalizeTamilText(raw);
  return {
    title: null,
    language: detectDominantLanguage(text),
    pages: [{ pageNumber: null, text }],
    pageCount: 1,
    contentType: "text",
  };
}

/** Cheap script-ratio check; used only to store a language hint. */
export function detectDominantLanguage(text: string): "ta" | "en" | "mixed" {
  const tamil = (text.match(/[\u0B80-\u0BFF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (tamil === 0) return "en";
  if (latin === 0) return "ta";
  const ratio = tamil / (tamil + latin);
  return ratio > 0.7 ? "ta" : ratio < 0.2 ? "en" : "mixed";
}
