export const MinimapPlaceholder = () => (
  <section className="relative overflow-hidden rounded-2xl border border-border/20 bg-surface/10 shadow-inner">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-surface/20 opacity-60" aria-hidden />
    <div className="relative flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="rounded-full border border-border/40 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-muted">
        Minimap
      </span>
      <p className="max-w-[220px] text-[11px] text-muted/80">
        A live minimap will appear here in a future update to help you navigate complex canvases.
      </p>
    </div>
  </section>
);
