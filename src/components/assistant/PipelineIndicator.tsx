import { cn } from "@/lib/utils";

const STAGES = [
  "Query understanding",
  "Source discovery",
  "Retrieval",
  "Hybrid + semantic search",
  "Source ranking",
  "RAG context",
  "Grounded answer",
];

/**
 * Visualises the retrieval pipeline so demo viewers can see which stage the
 * system is in. `activeStage` is -1 when idle.
 */
export function PipelineIndicator({ activeStage = -1 }: { activeStage?: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {STAGES.map((stage, i) => {
        const done = activeStage > i;
        const active = activeStage === i;
        return (
          <li
            key={stage}
            className={cn(
              "rounded-full border px-2.5 py-1 transition-colors",
              done && "border-verified/40 bg-verified/10 text-verified",
              active && "border-primary bg-primary text-primary-foreground",
              !done && !active && "border-border bg-surface/60 text-muted-foreground",
            )}
          >
            {stage}
          </li>
        );
      })}
    </ol>
  );
}
