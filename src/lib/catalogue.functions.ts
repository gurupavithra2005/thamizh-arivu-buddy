import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { splitCategoryName, type HeritageCategoryView } from "@/lib/catalogue";
import { toUiSource } from "@/lib/knowledge";
import type { KnowledgeSource } from "@/lib/mock-data";

/**
 * Public, read-only catalogue reads. These run with the publishable key so they
 * are safe in public route loaders during SSR/prerender (no bearer token), and
 * they are still constrained by the anon SELECT policies on these tables.
 */
function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listKnowledgeSources = createServerFn({ method: "GET" }).handler(
  async (): Promise<KnowledgeSource[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("knowledge_sources")
      .select("*")
      .eq("status", "active")
      .order("credibility_level", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => toUiSource(row));
  },
);

export const listHeritageCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<HeritageCategoryView[]> => {
    const supabase = publicClient();
    const [{ data: cats, error: catError }, { data: items, error: itemError }] = await Promise.all([
      supabase.from("cultural_categories").select("*").order("created_at"),
      supabase.from("cultural_items").select("*").order("created_at"),
    ]);
    if (catError) throw new Error(catError.message);
    if (itemError) throw new Error(itemError.message);

    return (cats ?? []).map((c) => {
      const { title, titleTamil } = splitCategoryName(c.name);
      return {
        id: c.id,
        slug: c.slug,
        title,
        titleTamil,
        description: c.description ?? "",
        topics: (items ?? [])
          .filter((i) => i.category_id === c.id)
          .map((i) => ({
            id: i.id,
            title: i.title,
            description: i.description ?? "",
            query: i.query_text ?? i.title,
          })),
      };
    });
  },
);

export const getHeritageCategory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const slug = (data as { slug?: unknown })?.slug;
    if (typeof slug !== "string" || slug.length === 0) throw new Error("slug is required");
    return { slug };
  })
  .handler(
    async ({
      data,
    }): Promise<{ category: HeritageCategoryView; sources: KnowledgeSource[] } | null> => {
      const supabase = publicClient();
      const { data: cat, error } = await supabase
        .from("cultural_categories")
        .select("*")
        .eq("slug", data.slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!cat) return null;

      const [{ data: items, error: itemError }, { data: sources, error: sourceError }] =
        await Promise.all([
          supabase.from("cultural_items").select("*").eq("category_id", cat.id).order("created_at"),
          supabase
            .from("knowledge_sources")
            .select("*")
            .eq("status", "active")
            .order("title")
            .limit(4),
        ]);
      if (itemError) throw new Error(itemError.message);
      if (sourceError) throw new Error(sourceError.message);

      const { title, titleTamil } = splitCategoryName(cat.name);
      return {
        category: {
          id: cat.id,
          slug: cat.slug,
          title,
          titleTamil,
          description: cat.description ?? "",
          topics: (items ?? []).map((i) => ({
            id: i.id,
            title: i.title,
            description: i.description ?? "",
            query: i.query_text ?? i.title,
          })),
        },
        sources: (sources ?? []).map((row) => toUiSource(row)),
      };
    },
  );

export type SourceLibraryStat = {
  sourceId: string;
  documentCount: number;
  processingStatus: string;
  pageCount: number;
  chunkCount: number;
  embeddedCount: number;
};

/** Real indexing state per source, for the Knowledge Sources page. */
export const listSourceLibraryStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<SourceLibraryStat[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase.rpc("source_library_stats");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      sourceId: row.source_id as string,
      documentCount: row.document_count as number,
      processingStatus: row.processing_status as string,
      pageCount: row.page_count as number,
      chunkCount: row.chunk_count as number,
      embeddedCount: row.embedded_count as number,
    }));
  },
);
