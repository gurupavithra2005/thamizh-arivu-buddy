export function RelevanceMeter({ value }: { value: number }) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div className="shrink-0 text-right" title={`Ranking score placeholder: ${pct}%`}>
      <div className="text-sm font-semibold tabular-nums">{pct}%</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">relevance</div>
      <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
