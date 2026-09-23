import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SourceCard } from "@/components/sources/SourceCard";
import { getHeritageCategory } from "@/lib/catalogue.functions";

export const Route = createFileRoute("/explorer/$category")({
  loader: async ({ params }) => {
    const result = await getHeritageCategory({ data: { slug: params.category } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Unavailable — THAMIZHARIVU AI" }, { name: "robots", content: "noindex" }],
      };
    }
    const { category } = loaderData;
    const title = `${category.title} (${category.titleTamil}) — Heritage Explorer`;
    return {
      meta: [
        { title },
        { name: "description", content: category.description },
        { property: "og:title", content: title },
        { property: "og:description", content: category.description },
      ],
    };
  },
  notFoundComponent: CategoryNotFound,
  errorComponent: CategoryNotFound,
  component: CategoryPage,
});

function CategoryNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Theme not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That heritage theme does not exist. Browse all themes instead.
      </p>
      <Button asChild className="mt-6">
        <Link to="/explorer">Back to explorer</Link>
      </Button>
    </div>
  );
}

function CategoryPage() {
  const { category, sources } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Link
        to="/explorer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> All themes
      </Link>

      <div className="mt-4">
        <SectionHeading
          eyebrow="Heritage theme"
          title={category.title}
          tamilTitle={category.titleTamil}
          description={category.description}
          action={
            <Button asChild>
              <Link to="/assistant" search={{ q: category.topics[0]?.query ?? category.title }}>
                <MessagesSquare className="mr-1 size-4" aria-hidden /> Ask about this theme
              </Link>
            </Button>
          }
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold">Topics</h2>
      {category.topics.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No topics published for this theme yet.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {category.topics.map((topic) => (
            <Link
              key={topic.id}
              to="/assistant"
              search={{ q: topic.query }}
              className="panel p-4 text-left transition-colors hover:border-primary/40"
            >
              <p className="text-sm font-medium">{topic.title}</p>
              {topic.description && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {topic.description}
                </p>
              )}
              <p className="font-tamil mt-2 text-xs text-primary">{topic.query}</p>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mt-12 text-lg font-semibold">Sources available for this theme</h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {sources.map((s, i) => (
          <SourceCard key={s.id} source={s} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
