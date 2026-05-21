export default function BrandBadge() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-9 items-center justify-center bg-foreground/7 clip-angular-sm shadow-[0_0_15px_rgba(255,70,85,0.35)] select-none"
      />
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground/70 drop-shadow-[0_0_8px_rgba(255,70,85,0.5)]">
        Agent Academy
      </span>
    </div>
  );
}
