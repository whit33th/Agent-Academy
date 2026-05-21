export default function MapLoading() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="skeleton clip-angular border border-white/4 h-[340px]"
        />
      ))}
    </div>
  );
}
