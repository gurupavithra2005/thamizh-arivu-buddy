import { chunkingConfig, EMBEDDING_DIMENSION, embeddingConfig } from "@/lib/config";
import { buildParentChildChunks, type PreparedChunk } from "./chunk";
import { embedTexts } from "./embeddings.server";
import { detectDominantLanguage, extractFromUrl, type ExtractedPage } from "./extract.server";
import { normalizeTamilText } from "./normalize";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export type IngestionResult = {
  documentId: string;
  parentChunks: number;
  childChunks: number;
  embedded: number;
  failedEmbeddings: number;
  pageCount: number;
  status: "completed" | "failed";
};

/**
 * SOURCE -> EXTRACT -> CLEAN -> NORMALIZE -> CHUNK -> EMBED -> STORE -> INDEX.
 *
 * Runs entirely server-side with the service-role client; provider keys never
 * reach the browser. Progress is tracked in public.ingestion_jobs.
 */
export async function runIngestion(
  admin: Admin,
  params: {
    sourceId: string;
    url?: string | null;
    rawText?: string | null;
    title: string;
    language?: string | null;
    filePath?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<IngestionResult> {
  const { data: job, error: jobError } = await admin
    .from("ingestion_jobs")
    .insert({
      source_id: params.sourceId,
      job_type: "ingest",
      status: "running",
      progress: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (jobError) throw new Error(jobError.message);

  const failJob = async (message: string) => {
    await admin
      .from("ingestion_jobs")
      .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
      .eq("id", job.id);
  };

  let documentId: string | null = null;

  try {
    // 1. EXTRACT
    let pages: ExtractedPage[];
    let language = params.language ?? null;

    if (params.rawText && params.rawText.trim().length > 0) {
      const text = normalizeTamilText(params.rawText);
      pages = [{ pageNumber: null, text }];
      language ??= detectDominantLanguage(text);
    } else if (params.url) {
      const extracted = await extractFromUrl(params.url);
      pages = extracted.pages;
      language ??= extracted.language;
    } else {
      throw new Error("Ingestion needs either a URL or raw text");
    }

    if (pages.length === 0 || pages.every((p) => p.text.trim().length === 0)) {
      throw new Error("No extractable text layer found in this source");
    }

    // 2. DOCUMENT ROW
    const { data: document, error: documentError } = await admin
      .from("documents")
      .insert({
        source_id: params.sourceId,
        title: params.title,
        language: language ?? "ta",
        file_path: params.filePath ?? null,
        content: pages.map((p) => p.text).join("\n\n").slice(0, 200000),
        page_count: pages.length,
        processing_status: "processing",
        metadata: {
          url: params.url ?? null,
          embedding_provider: embeddingConfig().provider,
          embedding_model: embeddingConfig().model,
          embedding_dimension: EMBEDDING_DIMENSION,
          chunking: chunkingConfig,
          ...(params.metadata ?? {}),
        },
      })
      .select("id")
      .single();
    if (documentError) throw new Error(documentError.message);
    documentId = document.id;

    // 3. CHUNK (parent/child, page + section preserved)
    const parents = buildParentChildChunks(
      pages.map((page) => ({
        text: page.text,
        pageNumber: page.pageNumber ?? null,
        section: page.section ?? null,
      })),
    );
    const children = parents.flatMap((p) => p.children);
    if (children.length === 0) throw new Error("Chunking produced no retrievable text");

    await admin.from("ingestion_jobs").update({ progress: 30 }).eq("id", job.id);

    // 4. STORE parents first so children can reference them
    const parentIdByIndex = new Map<number, number>();
    for (const parent of parents) {
      const { data: row, error } = await admin
        .from("document_chunks")
        .insert(chunkRow(parent, params.sourceId, documentId, "parent", null))
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      parentIdByIndex.set(parent.chunkIndex, row.id);
    }

    // 5. EMBED children in batches, then STORE
    const { vectors, failures } = await embedTexts(
      children.map((c) => c.normalizedContent || c.content),
      "document",
    );
    await admin.from("ingestion_jobs").update({ progress: 70 }).eq("id", job.id);

    let embedded = 0;
    for (const [index, parent] of parents.entries()) {
      void index;
      const parentId = parentIdByIndex.get(parent.chunkIndex) ?? null;
      for (const child of parent.children) {
        const position = children.indexOf(child);
        const vector = vectors[position] ?? null;
        if (vector) embedded++;
        const { error } = await admin.from("document_chunks").insert({
          ...chunkRow(child, params.sourceId, documentId, "child", parentId),
          embedding: vector ? JSON.stringify(vector) : null,
        });
        if (error) throw new Error(error.message);
      }
    }

    const status = embedded > 0 ? "completed" : "failed";

    await admin
      .from("documents")
      .update({ processing_status: status === "completed" ? "completed" : "failed" })
      .eq("id", documentId);

    await admin
      .from("ingestion_jobs")
      .update({
        status: status === "completed" ? "completed" : "failed",
        progress: 100,
        error_message: failures > 0 ? `${failures} chunk embeddings failed` : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return {
      documentId,
      parentChunks: parents.length,
      childChunks: children.length,
      embedded,
      failedEmbeddings: failures,
      pageCount: pages.length,
      status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion failure";
    if (documentId) {
      await admin.from("documents").update({ processing_status: "failed" }).eq("id", documentId);
    }
    await failJob(message);
    throw new Error(message);
  }
}

function chunkRow(
  chunk: PreparedChunk,
  sourceId: string,
  documentId: string,
  chunkType: "parent" | "child",
  parentChunkId: number | null,
) {
  return {
    document_id: documentId,
    source_id: sourceId,
    parent_chunk_id: parentChunkId,
    chunk_type: chunkType,
    content: chunk.content,
    normalized_content: chunk.normalizedContent,
    page_number: chunk.pageNumber ?? null,
    chapter: chunk.chapter ?? null,
    section: chunk.section ?? null,
    chunk_index: chunk.chunkIndex,
    token_count: chunk.tokenCount,
    metadata: {},
  };
}
