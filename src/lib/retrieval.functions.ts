import { createServerFn } from "@tanstack/react-start";
import { retrievalConfig } from "@/lib/config";

export type RetrievedChunk = {
  chunkId: number;
  documentId: string;
  sourceId: string;
  content: string;
  pageNumber: number | null;
  chapter: string | null;
  section: string | null;
  score: number;
  semanticScore: number | null;
  keywordScore: number | null;
  sourceTitle: string;
  sourceUrl: string | null;
  publisher: string | null;
  sourceType: string;
  credibility: string;
  language: string;
};

/**
 * Hybrid retrieval: pgvector semantic search (match_document_chunks) fused with
 * Postgres full-text search (search_document_chunks) using reciprocal rank
 * fusion. No answer is generated here — this is the retrieval layer only.
 */
export async function retrieveChunks(
  query: string,
  options: { matchCount?: number; sourceIds?: string[] } = {},
): Promise<RetrievedChunk[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { embedQuery } = await import("@/lib/rag/embeddings.server");

  const matchCount = options.matchCount ?? retrievalConfig.childMatchCount;
  const embedding = await embedQuery(query);

  const [semantic, keyword] = await Promise.all([
    supabaseAdmin.rpc("match_document_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_count: matchCount,
      similarity_threshold: retrievalConfig.similarityThreshold,
      ...(options.sourceIds?.length ? { filter_source_ids: options.sourceIds } : {}),
    }),
    supabaseAdmin.rpc("search_document_chunks", {
      query_text: query,
      match_count: retrievalConfig.keywordMatchCount,
    }),
  ]);

  if (semantic.error) throw new Error(semantic.error.message);
  if (keyword.error) console.error("[retrieval] keyword search failed", keyword.error);

  const fused = new Map<number, RetrievedChunk & { rrf: number }>();
  const K = 60;

  (semantic.data ?? []).forEach((row, rank) => {
    fused.set(row.id, {
      chunkId: row.id,
      documentId: row.document_id,
      sourceId: row.source_id,
      content: row.content,
      pageNumber: row.page_number ?? null,
      chapter: row.chapter ?? null,
      section: row.section ?? null,
      semanticScore: row.similarity,
      keywordScore: null,
      score: row.similarity,
      rrf: 1 / (K + rank + 1),
      sourceTitle: "",
      sourceUrl: null,
      publisher: null,
      sourceType: "document",
      credibility: "unknown",
      language: "ta",
    });
  });

  (keyword.data ?? []).forEach((row, rank) => {
    const existing = fused.get(row.id);
    if (existing) {
      existing.keywordScore = row.rank;
      existing.rrf += 1 / (K + rank + 1);
    } else {
      fused.set(row.id, {
        chunkId: row.id,
        documentId: row.document_id,
        sourceId: row.source_id,
        content: row.content,
        pageNumber: row.page_number ?? null,
        chapter: row.chapter ?? null,
        section: row.section ?? null,
        semanticScore: null,
        keywordScore: row.rank,
        score: row.rank,
        rrf: 1 / (K + rank + 1),
        sourceTitle: "",
        sourceUrl: null,
        publisher: null,
        sourceType: "document",
        credibility: "unknown",
        language: "ta",
      });
    }
  });

  const ranked = [...fused.values()].sort((a, b) => b.rrf - a.rrf).slice(0, matchCount);
  if (ranked.length === 0) return [];

  const { data: sources, error } = await supabaseAdmin
    .from("knowledge_sources")
    .select("id, title, url, publisher, author, source_type, credibility_level, language")
    .in("id", [...new Set(ranked.map((r) => r.sourceId))]);
  if (error) throw new Error(error.message);

  const bySource = new Map((sources ?? []).map((s) => [s.id, s]));
  const maxRrf = ranked[0]!.rrf || 1;

  return ranked.map((chunk) => {
    const source = bySource.get(chunk.sourceId);
    return {
      ...chunk,
      score: Number((chunk.rrf / maxRrf).toFixed(4)),
      sourceTitle: source?.title ?? "Unknown source",
      sourceUrl: source?.url ?? null,
      publisher: source?.publisher ?? source?.author ?? null,
      sourceType: source?.source_type ?? "document",
      credibility: source?.credibility_level ?? "unknown",
      language: source?.language ?? "ta",
    };
  });
}

/** Public semantic + keyword search used by the Search Results page. */
export const searchKnowledge = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const query = (data as { query?: unknown })?.query;
    if (typeof query !== "string" || query.trim().length === 0) {
      throw new Error("A search query is required");
    }
    return { query: query.trim().slice(0, 500) };
  })
  .handler(async ({ data }): Promise<RetrievedChunk[]> => retrieveChunks(data.query));
