import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/common/SectionHeading";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Conversation History — THAMIZHARIVU AI" },
      {
        name: "description",
        content:
          "Review your earlier Tamil, English and Tanglish conversations. Context memory lets follow-up questions build on previous turns.",
      },
      { property: "og:title", content: "Conversation History — THAMIZHARIVU AI" },
      {
        property: "og:description",
        content: "Your saved conversations with context-aware follow-up support.",
      },
    ],
  }),
  component: HistoryPage,
});

function relativeDay(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function HistoryPage() {
  const { isSignedIn, loading } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["conversations"],
    enabled: isSignedIn,
    queryFn: async () => {
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, messages(id, role, content, language)")
        .order("updated_at", { ascending: false });
      if (convError) throw new Error(convError.message);
      return conversations ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <SectionHeading
        eyebrow="Conversation memory"
        title="History"
        tamilTitle="உரையாடல் வரலாறு"
        description="Follow-up questions reuse prior context, so you can keep refining a topic naturally."
      />

      {!loading && !isSignedIn && (
        <div className="panel mt-8 p-6">
          <h2 className="text-base font-semibold">Sign in to see your conversations</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Conversations are stored privately against your account, so only you can read them.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      )}

      {isSignedIn && (isLoading || loading) && (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {isSignedIn && error && (
        <p className="mt-8 text-sm text-destructive">
          Your history could not be loaded. Please refresh and try again.
        </p>
      )}

      {isSignedIn && data && data.length === 0 && (
        <div className="panel mt-8 p-6">
          <h2 className="text-base font-semibold">No conversations yet</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ask your first question and it will be saved here automatically.
          </p>
          <Button asChild className="mt-4">
            <Link to="/assistant">Open the assistant</Link>
          </Button>
        </div>
      )}

      {isSignedIn && data && data.length > 0 && (
        <ul className="mt-8 space-y-3">
          {data.map((c) => {
            const messages = c.messages ?? [];
            const lastUser = [...messages].reverse().find((m) => m.role === "user");
            const language = messages.find((m) => m.language)?.language ?? "auto";
            return (
              <li key={c.id} className="panel p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">
                    {language}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="size-3.5" aria-hidden /> {messages.length} turns
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden /> {relativeDay(c.updated_at)}
                  </span>
                </div>
                <h2 className="font-tamil mt-2 text-base font-semibold">
                  {c.title ?? "Untitled conversation"}
                </h2>
                <p className="font-tamil mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {lastUser?.content ?? "No messages yet."}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to="/assistant" search={{ c: c.id }}>
                    Continue conversation
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
