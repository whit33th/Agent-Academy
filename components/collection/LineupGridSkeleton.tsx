export const LINEUP_GRID_CLASS =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3";

export default function LineupGridSkeleton({
  feed = false,
}: {
  feed?: boolean;
}) {
  return (
    <div
      className={LINEUP_GRID_CLASS}
      aria-busy="true"
      aria-label="Loading lineups"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="val-card clip-angular bg-val-surface">
          <div className="skeleton aspect-video" />
          <div className="p-3">
            <div className="skeleton h-5 w-2/3" />
            {feed && <div className="skeleton mt-1 h-4 w-1/3" />}
          </div>
        </div>
      ))}
    </div>
  );
}
