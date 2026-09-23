import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Explicit marker for UI-only placeholder states. Every screen that shows
 * simulated pipeline output must render this so demo viewers can tell mock
 * states from real, source-grounded output.
 */
export function MockBadge({ className, label = "Mock UI state" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-mock/40 bg-mock/15 px-2.5 py-1 text-[11px] font-medium text-mock-foreground",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      {label}
    </span>
  );
}
