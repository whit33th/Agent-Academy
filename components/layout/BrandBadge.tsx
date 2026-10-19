import TourLink from "./TourLink";

export default function BrandBadge() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-9 items-center justify-center bg-foreground/7 clip-angular-sm  select-none"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground/70 ">
          Agent Academy
        </span>
        <TourLink />
      </div>
    </div>
  );
}
