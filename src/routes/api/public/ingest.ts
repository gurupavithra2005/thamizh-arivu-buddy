import { createFileRoute } from "@tanstack/react-router";

/**
 * Operator-triggered ingestion endpoint.
 *
 * Runs SOURCE -> EXTRACT -> NORMALIZE -> CHUNK -> EMBED -> STORE for one
 * knowledge_sources row with the service-role client. The caller must present
 * the shared operator secret; there is no public access.
 */
export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        if (!secret || request.headers.get("x-ingest-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: { sourceId?: unknown; rawText?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        if (typeof body.sourceId !== "string" || body.sourceId.length === 0) {
          return new Response("sourceId is required", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runIngestion } = await import("@/lib/rag/ingest.server");

        const { data: source, error } = await supabaseAdmin
          .from("knowledge_sources")
          .select("id, title, url, language")
          .eq("id", body.sourceId)
          .single();
        if (error || !source) {
          return new Response(error?.message ?? "Source not found", { status: 404 });
        }

        try {
          const result = await runIngestion(supabaseAdmin, {
            sourceId: source.id,
            url: source.url,
            rawText: typeof body.rawText === "string" ? body.rawText : null,
            title: source.title,
            language: source.language,
          });
          return Response.json({ sourceId: source.id, ...result });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Ingestion failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
