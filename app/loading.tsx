export default function Loading() {
  return (
    <div className="min-h-screen bg-val-bg p-4 md:p-6 lg:p-8">
      {/* Row 1: Symmetrical Top Navigation Bar Skeleton */}
      <div className="flex flex-row justify-between items-center w-full mb-4">
        <div>
          <div className="flex items-center gap-3">
            {/* Custom Brand Logo */}
            <div className="flex size-9 items-center justify-center bg-foreground/7 clip-angular-sm shadow-[0_0_15px_rgba(255,70,85,0.35)] select-none"></div>
            {/* Brand Text styled like the sync badge */}
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground/70 drop-shadow-[0_0_8px_rgba(255,70,85,0.5)]">
              Agent Academy
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Page Content Title/Header Context Skeleton */}
      <div className="mb-6">
        <h1 className="font-oswald text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl">
          Select <span className="text-val-red">Map</span>
        </h1>
      </div>

      {/* Grid Skeleton (seamlessly matching MapGrid) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="relative block clip-angular bg-val-surface text-left border border-white/4"
          >
            {/* Image Skeleton */}
            <div
              className="skeleton relative w-full overflow-hidden"
              style={{ aspectRatio: "16/9" }}
            />
            {/* Bottom text block Skeleton */}
            <div className="px-4 py-3">
              <div className="skeleton h-5 w-28 rounded-sm my-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
