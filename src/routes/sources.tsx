import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SourceCard } from "@/components/sources/SourceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listKnowledgeSources, listSourceLibraryStats } from "@/lib/catalogue.functions";
import { SOURCE_TYPE_LABEL, type SourceType } from "@/lib/mock-data";

export const Route = createFileRoute("/sources")({
  loader: async () => {
    const [sources, stats] = await Promise.all([listKnowledgeSources(), listSourceLibraryStats()]);
    return { sources, stats };
  },
  head: () => ({
    meta: [
      { title: "Knowledge Sources — THAMIZHARIVU AI" },
      {
        name: "description",
        content:
          "Every answer is traceable. Review the webpages, books, e-books, PDFs and digital archives available to the assistant.",
      },
      { property: "og:title", content: "Knowledge Sources — THAMIZHARIVU AI" },
      {
        property: "og:description",
        content: "Linkable Tamil knowledge sources with publisher and credibility details.",
      },
    ],
  }),
  errorComponent: SourcesError,
  notFoundComponent: SourcesError,
  component: SourcesPage,
});

function SourcesError() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Sources could not be loaded</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The source library is temporarily unavailable. Please try again.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}

const FILTERS: (SourceType | "all")[] = ["all", "webpage", "book", "ebook", "pdf", "archive", "ocr"];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

function SourcesPage() {
  const { sources, stats } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SourceType | "all">("all");

  const statBySource = useMemo(
    () => new Map(stats.map((s) => [s.sourceId, s])),
    [stats],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter(
      (s) =>
        (type === "all" || s.type === type) &&
        (q === "" ||
          s.title.toLowerCase().includes(q) ||
          s.publisher.toLowerCase().includes(q) ||
          s.passage.toLowerCase().includes(q)),
    );
  }, [query, type, sources]);

  const indexed = stats.filter((s) => s.embeddedCount > 0).length;
  const passages = stats.reduce((sum, s) => sum + s.embeddedCount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading
        eyebrow="Transparency layer"
        title="Knowledge sources"
        tamilTitle="மூலங்கள்"
        description="These are the real archives, e-texts and reference works the assistant is allowed to cite."
      />

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title or publisher"
          aria-label="Filter sources"
          className="max-w-xs"
        />
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={type === f ? "default" : "outline"}
            onClick={() => setType(f)}
          >
            {f === "all" ? "All types" : SOURCE_TYPE_LABEL[f]}
          </Button>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {sources.length} source{sources.length === 1 ? "" : "s"} in the library — {indexed} indexed,{" "}
        {passages.toLocaleString()} searchable passage{passages === 1 ? "" : "s"}
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sources match this filter.</p>
        ) : (
          results.map((s, i) => {
            const stat = statBySource.get(s.id);
            const status = stat?.processingStatus ?? "pending";
            return (
              <div key={s.id} className="space-y-1.5">
                <SourceCard source={s} rank={i + 1} />
                <div className="flex flex-wrap items-center gap-1.5 px-1">
                  <Badge
                    variant={
                      status === "completed"
                        ? "secondary"
                        : status === "failed"
                          ? "destructive"
                          : "outline"
                    }
                    className="text-[11px]"
                  >
                    {STATUS_LABEL[status] ?? status}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {stat?.chunkCount ?? 0} passages
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {stat?.embeddedCount ?? 0} embedded
                  </Badge>
                  {(stat?.pageCount ?? 0) > 0 && (
                    <Badge variant="outline" className="text-[11px]">
                      {stat?.pageCount} page{stat?.pageCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
