import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  tamilTitle,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  tamilTitle?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        )}
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
          {title}
          {tamilTitle && (
            <span className="font-tamil ml-2 text-lg text-muted-foreground">{tamilTitle}</span>
          )}
        </h2>
        {description && <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}
