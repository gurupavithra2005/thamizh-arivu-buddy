import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IngestionSummary = {
  sourceId: string;
  documentId: string;
  parentChunks: number;
  childChunks: number;
  embedded: number;
  failedEmbeddings: number;
  pageCount: number;
  status: "completed" | "failed";
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only administrators can ingest knowledge sources");
}

/**
 * Admin-only ingestion of an existing knowledge_sources row. The source's stored
 * URL is used unless raw text is supplied. Runs extract -> normalize -> chunk ->
 * embed -> store with the service-role client; no keys reach the browser.
 */
export const ingestKnowledgeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as { sourceId?: unknown; rawText?: unknown };
    if (typeof input.sourceId !== "string" || input.sourceId.length === 0) {
      throw new Error("sourceId is required");
    }
    return {
      sourceId: input.sourceId,
      rawText: typeof input.rawText === "string" ? input.rawText : null,
    };
  })
  .handler(async ({ data, context }): Promise<IngestionSummary> => {
    const ctx = context as unknown as { supabase: any; userId: string };
    await assertAdmin(ctx.supabase, ctx.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runIngestion } = await import("@/lib/rag/ingest.server");

    const { data: source, error } = await supabaseAdmin
      .from("knowledge_sources")
      .select("id, title, url, language")
      .eq("id", data.sourceId)
      .single();
    if (error) throw new Error(error.message);

    const result = await runIngestion(supabaseAdmin, {
      sourceId: source.id,
      url: source.url,
      rawText: data.rawText,
      title: source.title,
      language: source.language,
    });

    return { sourceId: source.id, ...result };
  });

/**
 * Signed-in users can index their own reviewed OCR / pasted Tamil text. The new
 * source is recorded as needs_review — credibility is never fabricated.
 */
export const ingestUserDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as { title?: unknown; text?: unknown; filePath?: unknown };
    if (typeof input.title !== "string" || input.title.trim().length === 0) {
      throw new Error("A document title is required");
    }
    if (typeof input.text !== "string" || input.text.trim().length < 40) {
      throw new Error("Please provide at least a short passage of text to index");
    }
    return {
      title: input.title.trim().slice(0, 200),
      text: input.text,
      filePath: typeof input.filePath === "string" ? input.filePath : null,
    };
  })
  .handler(async ({ data, context }): Promise<IngestionSummary> => {
    const ctx = context as unknown as { userId: string };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runIngestion } = await import("@/lib/rag/ingest.server");
    const { detectDominantLanguage } = await import("@/lib/rag/extract.server");

    const language = detectDominantLanguage(data.text);

    const { data: source, error } = await supabaseAdmin
      .from("knowledge_sources")
      .insert({
        title: data.title,
        source_type: "ocr_document",
        language,
        description: "User-supplied document indexed from the OCR upload page.",
        credibility_level: "needs_review",
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const result = await runIngestion(supabaseAdmin, {
      sourceId: source.id,
      rawText: data.text,
      title: data.title,
      language,
      filePath: data.filePath,
      metadata: { uploaded_by: ctx.userId },
    });

    return { sourceId: source.id, ...result };
  });
