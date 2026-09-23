import { Library } from "lucide-react";
import { MockBadge } from "@/components/common/MockBadge";
import { SourceCard } from "./SourceCard";
import type { KnowledgeSource } from "@/lib/mock-data";

/**
 * Evidence / citation panel. Rendered beside answers so every claim can be
 * traced to a ranked, linkable source.
 */
export function SourceEvidencePanel({
  sources,
  isMock = false,
  title = "Source evidence",
  emptyHint = "Sources retrieved for an answer will be ranked and listed here with links and supporting passages.",
}: {
  sources: KnowledgeSource[];
  isMock?: boolean;
  title?: string;
  emptyHint?: string;
}) {
  return (
    <aside className="panel flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Library className="size-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {isMock && <MockBadge label="Mock sources" />}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          sources.map((source, i) => <SourceCard key={source.id} source={source} rank={i + 1} />)
        )}
      </div>

      <footer className="border-t border-border px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Answers are grounded in retrieved source content. When information cannot be verified from a
        source, the assistant states that explicitly instead of guessing.
      </footer>
    </aside>
  );
}
