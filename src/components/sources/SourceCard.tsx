import { ExternalLink, Quote, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelevanceMeter } from "./RelevanceMeter";
import { SOURCE_TYPE_LABEL, type KnowledgeSource } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function SourceCard({
  source,
  rank,
  compact = false,
  onSelect,
  selected,
}: {
  source: KnowledgeSource;
  rank?: number;
  compact?: boolean;
  onSelect?: (source: KnowledgeSource) => void;
  selected?: boolean;
}) {
  return (
    <article
      className={cn(
        "panel group p-4 transition-colors",
        onSelect && "cursor-pointer hover:border-primary/40",
        selected && "border-primary/60 ring-1 ring-primary/30",
      )}
      onClick={onSelect ? () => onSelect(source) : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {typeof rank === "number" && (
              <span className="grid size-5 place-items-center rounded-md bg-secondary text-[11px] font-semibold text-secondary-foreground">
                {rank}
              </span>
            )}
            <Badge variant="secondary" className="text-[11px]">
              {SOURCE_TYPE_LABEL[source.type]}
            </Badge>
            {source.verified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-verified">
                <ShieldCheck className="size-3.5" aria-hidden /> Verified source
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-mock-foreground">
                <ShieldAlert className="size-3.5" aria-hidden /> Needs verification
              </span>
            )}
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold sm:text-base">{source.title}</h3>
          {source.titleTamil && (
            <p className="font-tamil truncate text-sm text-muted-foreground">{source.titleTamil}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{source.publisher}</p>
        </div>
        <RelevanceMeter value={source.relevance} />
      </div>

      {!compact && (
        <blockquote className="mt-3 rounded-lg border-l-2 border-gold bg-surface/70 p-3 text-xs leading-relaxed text-surface-foreground">
          <Quote className="mb-1 size-3.5 text-gold" aria-hidden />
          {source.passage}
        </blockquote>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
          <a href={source.url} target="_blank" rel="noreferrer noopener">
            Open original source <ExternalLink className="ml-1 size-3" aria-hidden />
          </a>
        </Button>
      </div>
    </article>
  );
}
