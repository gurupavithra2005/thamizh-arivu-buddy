import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How THAMIZHARIVU AI Works — Architecture & Grounding" },
      {
        name: "description",
        content:
          "How the pipeline works: query understanding, dynamic source discovery, retrieval, hybrid and semantic ranking, RAG grounding and citation-first answers.",
      },
      { property: "og:title", content: "How THAMIZHARIVU AI Works" },
      {
        property: "og:description",
        content: "Query understanding, source discovery, hybrid ranking, RAG grounding, citations.",
      },
    ],
  }),
  component: AboutPage,
});

const STEPS = [
  {
    title: "Query understanding",
    body: "Detects Tamil, English, Tanglish, transliteration and mixed script, then normalises intent — no fixed question lists.",
  },
  {
    title: "Dynamic source discovery",
    body: "Finds candidate webpages, books, e-books, PDFs, uploaded documents and digital archives per query.",
  },
  {
    title: "Retrieval & chunking",
    body: "Fetches source content, segments it into passages and prepares embeddings for semantic matching.",
  },
  {
    title: "Hybrid ranking",
    body: "Combines keyword and vector similarity to rank passages by genuine relevance, not popularity.",
  },
  {
    title: "RAG grounding",
    body: "The language model may only answer from retrieved passages, in simple modern Tamil and English.",
  },
  {
    title: "Citation & verification",
    body: "Each answer carries source title, type, link, relevance and supporting passage. Unverifiable claims are flagged.",
  },
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <SectionHeading
        eyebrow="About the project"
        title="How it works"
        tamilTitle="எப்படி வேலை செய்கிறது"
        description="THAMIZHARIVU AI is a source-grounded knowledge discovery system for Tamil literature, culture and digital heritage — built for Aurex'26, Track 05."
      />

      <ol className="mt-8 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="panel flex gap-4 p-5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
              {i + 1}
            </span>
            <div>
              <h2 className="text-base font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="panel mt-10 p-6">
        <h2 className="text-lg font-semibold">Current build status</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The interface layer is complete and clearly marks every simulated state. The LLM, RAG,
          embeddings, vector search, hybrid ranking, conversation memory and Tamil OCR services are
          integrated in the following phases — the component and route architecture is already shaped
          around them.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/assistant">Try the assistant</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/sources">See source transparency</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
