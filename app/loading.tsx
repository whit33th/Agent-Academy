import BrandBadge from "@/components/layout/BrandBadge";

export default function Loading() {
  return (
    <main className="min-h-screen bg-val-bg p-4 md:p-6 lg:p-8">
      <header className="flex flex-row justify-between items-center w-full mb-4">
        <BrandBadge />
      </header>

      <section className="mb-6">
        <h1 className="font-oswald text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-7xl">
          Select <span className="text-val-red">Map</span>
        </h1>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <article
            key={i}
            className="relative block clip-angular bg-val-surface text-left border border-white/4"
          >
            <div
              className="skeleton relative w-full overflow-hidden"
              style={{ aspectRatio: "16/9" }}
            />
            <div className="px-4 py-3">
              <div className="skeleton h-5 w-28 rounded-sm my-0.5" />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
