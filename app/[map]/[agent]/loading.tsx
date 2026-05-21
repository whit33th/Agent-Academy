export default function LineupLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-1 flex-col gap-6 lg:flex-row">
        <div className="flex-1 min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="skeleton h-8 w-48 rounded-sm" />
            <div className="skeleton h-8 w-28 rounded-sm" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton clip-angular aspect-video bg-val-surface border border-white/4"
              />
            ))}
          </div>
        </div>

        <aside className="w-full shrink-0 lg:w-80">
          <div className="skeleton h-4 w-24 rounded-sm mb-3" />
          <div className="skeleton h-12 w-48 rounded-sm mb-4" />
          <div className="skeleton h-9 w-32 rounded-sm mb-4" />
          <div className="skeleton h-3 w-full rounded-sm mb-2" />
          <div className="skeleton h-3 w-5/6 rounded-sm mb-2" />
          <div className="skeleton h-3 w-4/6 rounded-sm" />
          <div className="skeleton aspect-square w-42 my-4" />
        </aside>
      </div>
    </div>
  );
}
