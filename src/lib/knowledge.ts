import type { Tables } from "@/integrations/supabase/types";
import type { KnowledgeSource, SourceType } from "@/lib/mock-data";

export type KnowledgeSourceRow = Tables<"knowledge_sources">;
export type ConversationRow = Tables<"conversations">;
export type MessageRow = Tables<"messages">;
export type CitationRow = Tables<"citations">;
export type OcrDocumentRow = Tables<"ocr_documents">;

const SOURCE_TYPE_MAP: Record<string, SourceType> = {
  webpage: "webpage",
  book: "book",
  ebook: "ebook",
  pdf: "pdf",
  document: "document",
  digital_archive: "archive",
  ocr_document: "ocr",
};

/**
 * Maps a stored knowledge_sources row onto the shape the existing UI cards use.
 * `relevance` is only meaningful for ranked retrieval results (Phase 2); for a
 * plain catalogue listing it is passed in explicitly or left at 0.
 */
export function toUiSource(row: KnowledgeSourceRow, relevance = 0): KnowledgeSource {
  return {
    id: row.id,
    title: row.title,
    type: SOURCE_TYPE_MAP[row.source_type] ?? "document",
    url: row.url ?? "#",
    publisher: row.publisher ?? row.author ?? "Unknown publisher",
    relevance,
    passage: row.description ?? "",
    language: row.language === "en" ? "en" : row.language === "ta" ? "ta" : "mixed",
    verified: row.credibility_level === "trusted" || row.credibility_level === "verified",
  };
}

/** A retrieved chunk or stored citation, as the source cards need it. */
export type RetrievedLike = {
  chunkId: number;
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string | null;
  publisher: string | null;
  sourceType: string;
  credibility: string;
  language: string;
  score: number;
  pageNumber: number | null;
} & ({ content: string } | { snippet: string });

/** Maps a real retrieved passage onto the existing source-card shape. */
export function retrievedToUiSource(item: RetrievedLike): KnowledgeSource {
  const passage = "content" in item ? item.content : item.snippet;
  return {
    id: `chunk-${item.chunkId}`,
    title: item.sourceTitle,
    type: SOURCE_TYPE_MAP[item.sourceType] ?? "document",
    url: item.sourceUrl ?? "#",
    publisher: item.publisher ?? "Unknown publisher",
    relevance: item.score,
    passage: item.pageNumber ? `p.${item.pageNumber} — ${passage}` : passage,
    language: item.language === "en" ? "en" : item.language === "ta" ? "ta" : "mixed",
    verified: item.credibility === "trusted" || item.credibility === "verified",
  };
}
