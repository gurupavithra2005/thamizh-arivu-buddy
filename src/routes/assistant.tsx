import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Brain, History, Loader2, LogIn, SearchCheck } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { ChatMessageBubble } from "@/components/assistant/ChatMessageBubble";
import { PipelineIndicator } from "@/components/assistant/PipelineIndicator";
import { SourceEvidencePanel } from "@/components/sources/SourceEvidencePanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { askAssistant } from "@/lib/answer.functions";
import { detectLanguage } from "@/lib/language-detect";
import type { ChatMessage, KnowledgeSource, SourceType } from "@/lib/mock-data";

export const Route = createFileRoute("/assistant")({
  validateSearch: (search: Record<string, unknown>): { q?: string; c?: string } => ({
    ...(typeof search["q"] === "string" && search["q"] ? { q: search["q"] as string } : {}),
    ...(typeof search["c"] === "string" && search["c"] ? { c: search["c"] as string } : {}),
  }),
  head: () => ({
    meta: [
      { title: "AI Knowledge Assistant — THAMIZHARIVU AI" },
      {
        name: "description",
        content:
          "Ask natural questions in Tamil, English or Tanglish and get source-grounded answers with citations and evidence passages.",
      },
      { property: "og:title", content: "AI Knowledge Assistant — THAMIZHARIVU AI" },
      {
        property: "og:description",
        content: "Source-grounded Tamil answers with citations and evidence passages.",
      },
    ],
  }),
  component: AssistantPage,
});

type StoredCitation = {
  chunk_id: number | null;
  source_id: string | null;
  source_title: string | null;
  source_url: string | null;
  snippet: string | null;
  page_number: number | null;
  citation_order: number;
};

/** Maps a stored citation row onto the shape the source cards render. */
function citationToSource(c: StoredCitation, type: SourceType = "document"): KnowledgeSource {
  return {
    id: `citation-${c.citation_order}-${c.chunk_id ?? "x"}`,
    title: c.source_title ?? "Stored source",
    type,
    url: c.source_url ?? "#",
    publisher: "Indexed source",
    relevance: 0,
    passage: c.page_number ? `p.${c.page_number} — ${c.snippet ?? ""}` : (c.snippet ?? ""),
    language: "ta",
    verified: false,
  };
}

function AssistantPage() {
  const { q = "", c = "" } = Route.useSearch();
  const { isSignedIn, loading: authLoading } = useAuth();
  const ask = useServerFn(askAssistant);

  const [input, setInput] = useState(q);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>(c);
  const [stage, setStage] = useState(-1);
  const [pending, setPending] = useState(false);
  const autoAsked = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Loads a previous conversation with its stored answers and citations. */
  const historyQuery = useQuery({
    queryKey: ["conversation", c],
    enabled: !!c && isSignedIn,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("messages")
        .select("id, role, content, language, metadata, created_at")
        .eq("conversation_id", c)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);

      const assistantIds = (rows ?? []).filter((m) => m.role === "assistant").map((m) => m.id);
      let citations: (StoredCitation & { message_id: string })[] = [];
      if (assistantIds.length > 0) {
        const { data: cits, error: citError } = await supabase
          .from("citations")
          .select(
            "message_id, chunk_id, source_id, source_title, source_url, snippet, page_number, citation_order",
          )
          .in("message_id", assistantIds)
          .order("citation_order", { ascending: true });
        if (citError) throw new Error(citError.message);
        citations = (cits ?? []) as typeof citations;
      }

      return (rows ?? []).map((m): ChatMessage => {
        const meta = (m.metadata ?? {}) as {
          answer_status?: string;
          related_questions?: string[];
        };
        const sources = citations
          .filter((cit) => cit.message_id === m.id)
          .map((cit) => citationToSource(cit));
        return {
          id: m.id,
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
          detectedLanguage: detectLanguage(m.content),
          ...(m.role === "assistant"
            ? {
                grounded: meta.answer_status === "grounded",
                unverified: meta.answer_status === "unverified",
                sources,
                relatedQuestions: meta.related_questions ?? [],
              }
            : {}),
        };
      });
    },
  });

  useEffect(() => {
    if (historyQuery.data) setMessages(historyQuery.data);
  }, [historyQuery.data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const sources = lastAssistant?.sources ?? [];

  /** Real pipeline: retrieve -> rank -> RAG -> grounded answer -> persisted with citations. */
  async function handleSubmit(text?: string) {
    const question = (text ?? input).trim();
    if (!question || pending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: question,
        detectedLanguage: detectLanguage(question),
      },
    ]);
    setInput("");
    setPending(true);

    let step = 0;
    setStage(0);
    const timer = window.setInterval(() => {
      step = Math.min(step + 1, 5);
      setStage(step);
    }, 700);

    try {
      const result = await ask({
        data: { question, conversationId: conversationId || undefined },
      });
      setConversationId(result.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: result.messageId,
          role: "assistant",
          content: result.answer,
          grounded: result.grounded,
          unverified: !result.grounded,
          relatedQuestions: result.relatedQuestions,
          sources: result.citations.map((cit) => ({
            id: `chunk-${cit.chunkId}`,
            title: cit.sourceTitle,
            type: (cit.sourceType === "digital_archive"
              ? "archive"
              : cit.sourceType === "ocr_document"
                ? "ocr"
                : (cit.sourceType as SourceType)) satisfies SourceType,
            url: cit.sourceUrl ?? "#",
            publisher: cit.publisher ?? "Unknown publisher",
            relevance: cit.score,
            passage: cit.pageNumber ? `p.${cit.pageNumber} — ${cit.snippet}` : cit.snippet,
            language: cit.language === "en" ? "en" : cit.language === "ta" ? "ta" : "mixed",
            verified: cit.credibility === "trusted" || cit.credibility === "verified",
          })),
        },
      ]);
    } catch (error) {
      toast.error("The answer could not be generated", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      window.clearInterval(timer);
      setStage(-1);
      setPending(false);
    }
  }

  // A question arriving from Explorer/Search is asked once, automatically.
  useEffect(() => {
    if (autoAsked.current || !q || !isSignedIn || c) return;
    autoAsked.current = true;
    void handleSubmit(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isSignedIn, c]);

  if (!authLoading && !isSignedIn) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Sign in to use the assistant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Answers, citations and conversation history are saved to your own account, so the
          assistant needs you signed in.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth">
            <LogIn className="mr-1 size-4" aria-hidden /> Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">AI Knowledge Assistant</h1>
          <p className="font-tamil text-sm text-muted-foreground">
            அறிவுத் துணை — தமிழ், English, Tanglish
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Brain className="size-3.5" aria-hidden /> {messages.length} turns
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <History className="size-3.5" aria-hidden />
            {conversationId ? "Saved conversation" : "New conversation"}
          </Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="panel flex min-h-[560px] flex-col overflow-hidden">
          <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface/60 px-4 py-3">
            <PipelineIndicator activeStage={stage} />
          </header>

          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-4">
            {historyQuery.isLoading ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Loading this conversation…
              </p>
            ) : messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5">
                <h2 className="text-base font-semibold">Ask anything about Tamil heritage</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                   Indexed passages are cited when available. Questions outside the library still receive a useful AI answer, clearly marked when it is not verified in the indexed sources.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link to="/explorer">Browse heritage themes</Link>
                </Button>
              </div>
            ) : (
              messages.map((m) => (
                <ChatMessageBubble key={m.id} message={m} onAskRelated={(next) => handleSubmit(next)} />
              ))
            )}

            {pending && (
              <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                 <Loader2 className="size-3.5 animate-spin" aria-hidden /> <Shimmer>Understanding your question and writing an answer…</Shimmer>
              </p>
            )}
          </div>

          <div className="border-t border-border p-3">
            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={() => handleSubmit()}
              pending={pending}
            />
          </div>
        </section>

        <div className="space-y-4">
          <SourceEvidencePanel
            sources={sources}
            emptyHint="Passages retrieved for the answer will be listed here with their source, page and link."
          />
          {lastAssistant?.unverified && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/researcher"><SearchCheck className="mr-1 size-4" aria-hidden /> Explain a source passage</Link>
            </Button>
          )}
          {messages.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setMessages([]);
                setConversationId("");
              }}
            >
              Start a new conversation
            </Button>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link to="/history">View saved history</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
