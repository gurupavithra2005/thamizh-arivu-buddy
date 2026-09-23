import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-3" aria-label="THAMIZHARIVU AI home">
      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
        <span className="font-display text-lg leading-none">த</span>
        <span className="absolute -bottom-1 -right-1 size-3 rounded-full bg-gold ring-2 ring-background" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="font-display text-base font-semibold tracking-tight sm:text-lg">
            THAMIZHARIVU <span className="text-primary">AI</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Source-grounded Tamil knowledge
          </span>
        </span>
      )}
    </Link>
  );
}
