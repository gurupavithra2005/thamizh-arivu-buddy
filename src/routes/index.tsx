import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Compass,
  FileUp,
  Languages,
  Layers,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import heroImage from "@/assets/hero-heritage.jpg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/common/SectionHeading";
import { HERITAGE_CATEGORIES } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "THAMIZHARIVU AI — Ask in Tamil. Verify the Source." },
      {
        name: "description",
        content:
          "A source-grounded Tamil knowledge assistant for literature, culture and digital heritage. Ask in Tamil, English or Tanglish and get answers with verifiable source links.",
      },
      { property: "og:title", content: "THAMIZHARIVU AI — Tamil Knowledge Assistant" },
      {
        property: "og:description",
        content: "Ask in Tamil. Discover the Knowledge. Verify the Source.",
      },
    ],
  }),
  component: Home,
});

const PILLARS = [
  {
    icon: Languages,
    title: "Understands how you speak",
    body: "Tamil, English, Tanglish, transliteration and mixed queries — no fixed question lists or keyword rules.",
  },
  {
    icon: Layers,
    title: "Discovers sources dynamically",
    body: "Webpages, books, e-books, PDFs and digital archives are discovered, retrieved and ranked per query.",
  },
  {
    icon: ShieldCheck,
    title: "Never invents facts",
    body: "Answers stay grounded in retrieved passages. Unverifiable claims are flagged, not guessed.",
  },
];

function Home() {
  return (
    <>
      <section className="hero-surface relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <Badge variant="outline" className="border-primary/30 bg-card text-xs">
              Aurex&apos;26 · Track 05 — Universal Knowledge Assistant
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              THAMIZHARIVU <span className="text-primary">AI</span>
            </h1>
            <p className="font-tamil mt-3 text-lg font-medium text-gradient-heritage sm:text-2xl">
              Ask in Tamil. Discover the Knowledge. Verify the Source.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              A Tamil-first, source-grounded knowledge discovery system for classical literature,
              cultural heritage and digital archives. Every answer carries its evidence: source
              title, type, link and the passage it came from.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/explorer">
                  Start Exploring <ArrowRight className="ml-1 size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/assistant">
                  <MessagesSquare className="mr-1 size-4" aria-hidden /> Ask AI
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/explorer">
                  <Compass className="mr-1 size-4" aria-hidden /> Cultural Heritage Explorer
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/upload">
                  <FileUp className="mr-1 size-4" aria-hidden /> Upload Document
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="Tamil palm-leaf manuscripts beside a Dravidian temple gopuram with kolam patterns"
              width={1600}
              height={1104}
              className="w-full rounded-2xl border border-border object-cover shadow-[var(--shadow-glow)]"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeading
          eyebrow="Why it is different"
          title="Not a generic chatbot"
          tamilTitle="வேறுபாடு"
          description="A knowledge discovery system built around retrieval, ranking and citation — not free-form generation."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PILLARS.map((p) => (
            <article key={p.title} className="panel p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface/50">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <SectionHeading
            eyebrow="Cultural Heritage Explorer"
            title="Explore Tamil knowledge by theme"
            tamilTitle="பண்பாட்டுத் தேடல்"
            action={
              <Button asChild variant="outline">
                <Link to="/explorer">Open explorer</Link>
              </Button>
            }
          />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {HERITAGE_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to="/explorer/$category"
                params={{ category: c.slug }}
                className="panel flex flex-col gap-1 p-4 transition-colors hover:border-primary/40"
              >
                <span className="font-tamil text-sm text-primary">{c.titleTamil}</span>
                <span className="text-sm font-semibold">{c.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Sparkles className="mx-auto size-6 text-gold" aria-hidden />
        <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
          Ready for the live demo walkthrough
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          The interface layer is complete and wired for the retrieval pipeline: LLM, RAG, embeddings,
          vector search, hybrid ranking, conversation memory and Tamil OCR arrive in the next phases.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/assistant">Ask AI</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/about">How it works</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
