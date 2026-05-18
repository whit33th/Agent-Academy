export default function Loading() {
  return (
    <div className="min-h-screen bg-val-bg p-4 md:p-6 lg:p-8">
      {/* Header Skeleton */}
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-sm bg-white/3 px-4 py-1.5 ring-1 ring-white/6">
          <div className="size-1.5 rounded-full bg-val-red animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">
            Tactical Reference
          </span>
        </div>
        <h1 className="font-oswald mb-5.5 text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl">
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
