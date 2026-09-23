import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SourceCard } from "@/components/sources/SourceCard";
import { detectLanguage } from "@/lib/language-detect";
import { retrievedToUiSource } from "@/lib/knowledge";
import { searchKnowledge } from "@/lib/retrieval.functions";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ deps }) => {
    if (!deps.q.trim()) return [];
    return searchKnowledge({ data: { query: deps.q } });
  },
  head: () => ({
    meta: [
      { title: "Search Results — THAMIZHARIVU AI" },
      {
        name: "description",
        content:
          "Hybrid semantic and keyword search across indexed Tamil books, e-texts, PDFs and digital archives, each result showing its supporting passage.",
      },
      { property: "og:title", content: "Search Results — THAMIZHARIVU AI" },
      {
        property: "og:description",
        content: "Ranked, source-grounded Tamil search results with evidence passages.",
      },
    ],
  }),
  errorComponent: SearchError,
  component: SearchPage,
});

function SearchError() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Search is unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The retrieval service could not be reached. Please try again in a moment.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}

function SearchPage() {
  const { q } = Route.useSearch();
  const chunks = Route.useLoaderData();
  const navigate = useNavigate();
  const [value, setValue] = useState(q);
  const language = detectLanguage(q);

  const results = chunks.map((chunk) => retrievedToUiSource(chunk));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <SectionHeading
        eyebrow="Retrieval & ranking"
        title="Search results"
        tamilTitle="தேடல் முடிவுகள்"
        description="Hybrid keyword plus vector ranking over the indexed passages of real Tamil sources."
      />

      <form
        className="mt-6 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search", search: { q: value.trim() } });
        }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="தமிழில் அல்லது ஆங்கிலத்தில் தேடுங்கள்…"
          aria-label="Search query"
          className="max-w-md"
        />
        <Button type="submit">
          <SearchIcon className="mr-1 size-4" aria-hidden /> Search
        </Button>
      </form>

      {q ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              Results for <span className="font-medium text-foreground">“{q}”</span>
            </span>
            <Badge variant="outline">Detected: {language.label}</Badge>
            <Badge variant="secondary">
              {results.length} passage{results.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {results.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No indexed passage matched this query. Add or index a source on the{" "}
              <Link to="/sources" className="text-primary underline-offset-4 hover:underline">
                Knowledge Sources
              </Link>{" "}
              page, or upload your own document.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {results.map((s, i) => (
                <SourceCard key={s.id} source={s} rank={i + 1} />
              ))}
            </div>
          )}

          <div className="panel mt-8 p-5">
            <p className="text-sm text-muted-foreground">
              Want a grounded answer instead of a passage list?
            </p>
            <Button asChild className="mt-3">
              <Link to="/assistant" search={{ q, c: "" }}>
                Ask the AI assistant
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Enter a query above, or open a topic from the{" "}
          <Link to="/explorer" className="text-primary underline-offset-4 hover:underline">
            Cultural Heritage Explorer
          </Link>
          .
        </p>
      )}
    </div>
  );
}
