import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listHeritageCategories } from "@/lib/catalogue.functions";

export const Route = createFileRoute("/explorer/")({
  loader: () => listHeritageCategories(),
  head: () => ({
    meta: [
      { title: "Cultural Heritage Explorer — THAMIZHARIVU AI" },
      {
        name: "description",
        content:
          "Browse Tamil knowledge by theme: literature, classical Tamil, festivals, traditions, arts, architecture, food, history and cultural practices.",
      },
      { property: "og:title", content: "Cultural Heritage Explorer — THAMIZHARIVU AI" },
      {
        property: "og:description",
        content: "Explore Tamil literature, culture and heritage by theme.",
      },
    ],
  }),
  errorComponent: ExplorerError,
  notFoundComponent: ExplorerError,
  component: ExplorerIndex,
});

function ExplorerError() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Themes could not be loaded</h1>
      <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
      <Button asChild className="mt-6">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}

function ExplorerIndex() {
  const categories = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <SectionHeading
        eyebrow="Cultural Heritage Explorer"
        title="Explore by theme"
        tamilTitle="பண்பாட்டுத் தேடல்"
        description="Pick a domain to see curated topics. Each topic opens a source-grounded query in the assistant."
      />

      {categories.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No themes have been published yet.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/explorer/$category"
              params={{ category: c.slug }}
              className="panel flex flex-col gap-2 p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-2">
                <Compass className="size-4 text-primary" aria-hidden />
                <span className="font-tamil text-sm text-primary">{c.titleTamil}</span>
              </div>
              <h2 className="text-lg font-semibold">{c.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{c.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.topics.slice(0, 3).map((t) => (
                  <Badge key={t.id} variant="secondary" className="text-[11px]">
                    {t.title}
                  </Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
