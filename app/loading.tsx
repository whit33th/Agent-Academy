export default function Loading() {
  return (
    <div className="min-h-screen bg-val-bg">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 lg:px-12">
        {/* Header Skeleton */}
        <div className="mb-10 pt-8 md:pt-12">
          {/* Badge Skeleton */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-sm bg-white/[0.03] px-4 py-1.5 ring-1 ring-white/[0.06]">
            <div className="h-1.5 w-1.5 rounded-full bg-val-red/30 animate-pulse" />
            <div className="skeleton h-3 w-28 rounded-sm" />
          </div>
          {/* Main Title Skeleton */}
          <div className="skeleton h-14 w-80 md:w-96 rounded-sm mb-3" />
          {/* Description Skeleton */}
          <div className="skeleton h-4 w-72 rounded-sm mt-3" />
        </div>

        {/* Grid Skeleton (seamlessly matching MapGrid / AgentGrid) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="group block clip-angular bg-val-surface border border-white/[0.02]"
            >
              {/* Image Skeleton */}
              <div
                className="skeleton relative w-full"
                style={{ aspectRatio: "16/9" }}
              />
              {/* Bottom text block Skeleton */}
              <div className="px-4 pb-4 pt-4 flex flex-col gap-2">
                <div className="skeleton h-5 w-32 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
