import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-val-bg">
      <div className="mb-6 flex size-20 items-center justify-center clip-diamond bg-val-red/20">
        <span className="text-3xl" aria-hidden>
          404
        </span>
      </div>
      <h1 className="font-oswald text-4xl font-bold uppercase text-white">
        Not Found
      </h1>
      <p className="mt-4 max-w-md text-sm text-white/40">
        The map or agent you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-6 px-4 py-2 rounded-sm bg-val-red text-white text-xs font-bold uppercase tracking-wider hover:bg-val-red/90 transition-colors"
      >
        Back to maps
      </Link>
    </main>
  );
}
