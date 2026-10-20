"use client";

interface LineupEmptyStateProps {
  variant: "no-setups" | "no-filter-match";
  favoritesOnly?: boolean;
}

export default function LineupEmptyState({
  variant,
  favoritesOnly,
}: LineupEmptyStateProps) {
  const empty = variant === "no-setups";
  return (
    <div
      data-onboarding="lineup-card"
      className="flex min-h-56 flex-col items-center justify-center border border-white/5 bg-white/[0.015] px-6 py-12 text-center"
    >
      <h2 className="mb-2 font-oswald text-2xl font-bold uppercase tracking-wide text-white">
        {empty
          ? "No setups yet"
          : favoritesOnly
            ? "No favorites here"
            : "Nothing matches"}
      </h2>
      <p className="max-w-sm text-sm leading-relaxed text-white/45">
        {empty
          ? "Save your first setup using Add Setup above."
          : favoritesOnly
            ? "Star a setup to save it here, or turn off the favorites filter."
            : "Try another side, site or ability, or clear the filters."}
      </p>
    </div>
  );
}
