import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpenCheck, Loader2, Quote, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/common/SectionHeading";
import { explainPassage } from "@/lib/researcher.functions";

export const Route = createFileRoute("/researcher")({
  head: () => ({ meta: [
    { title: "Researcher Passage Explainer — THAMIZHARIVU AI" },
    { name: "description", content: "Paste a Tamil source passage and ask for a plain-language explanation with passage references." },
    { property: "og:title", content: "Researcher Passage Explainer — THAMIZHARIVU AI" },
    { property: "og:description", content: "Explain Tamil source passages with AI and related references." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResearcherPage,
});

function ResearcherPage() {
  const explain = useServerFn(explainPassage);
  const [passage, setPassage] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof explainPassage>> | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try { setResult(await explain({ data: { passage, question } })); }
    catch (error) { toast.error("Explanation failed", { description: error instanceof Error ? error.message : "Please try again." }); }
    finally { setPending(false); }
  }

  return <div className="mx-auto max-w-5xl px-4 py-12">
    <SectionHeading eyebrow="Research workspace" title="Explain a Tamil passage" tamilTitle="ஆய்வாளர் விளக்கம்" description="Paste a real passage from a book, archive or field note, then ask the question you want explained." />
    <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <section className="panel p-5">
        <div className="flex items-center gap-2"><BookOpenCheck className="size-4 text-primary" aria-hidden /><h2 className="font-semibold">Source passage</h2></div>
        <Textarea value={passage} onChange={(event) => setPassage(event.target.value)} className="font-tamil mt-3 min-h-64" placeholder="Paste the exact Tamil or English passage here…" aria-label="Source passage" />
        <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="font-tamil mt-3" placeholder="What would you like explained?" aria-label="Research question" rows={3} />
        <Button className="mt-3" onClick={() => void submit()} disabled={pending || passage.trim().length < 20 || question.trim().length < 3}>
          {pending ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden /> : <Sparkles className="mr-1 size-4" aria-hidden />} Generate explanation
        </Button>
      </section>
      <section className="panel min-h-64 p-5">
        {!result ? <p className="text-sm text-muted-foreground">Your explanation and passage references will appear here.</p> : <>
          <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Plain-language explanation</h2><Badge variant="outline">AI Gateway</Badge></div>
          <p className="font-tamil mt-4 whitespace-pre-wrap text-sm leading-relaxed">{result.explanation}</p>
          {result.citations.length > 0 && <div className="mt-6 space-y-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related passage references</h3>{result.citations.map((citation) => <blockquote key={`${citation.label}-${citation.quote}`} className="border-l-2 border-primary/40 pl-3 text-sm"><Quote className="mb-1 size-3.5 text-primary" aria-hidden /> <span className="font-tamil">“{citation.quote}”</span></blockquote>)}</div>}
          {result.relatedQuestions.length > 0 && <div className="mt-6"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related questions</h3><ul className="font-tamil mt-2 list-disc pl-5 text-sm">{result.relatedQuestions.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        </>}
      </section>
    </div>
  </div>;
}