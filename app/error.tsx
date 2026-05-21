"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-val-bg">
      <div className="mb-6 flex size-20 items-center justify-center clip-diamond bg-val-red/20">
        <span className="text-3xl" aria-hidden>
          ⚠
        </span>
      </div>
      <h1 className="font-oswald text-4xl font-bold uppercase text-white">
        Connection Error
      </h1>
      <p className="mt-4 max-w-md text-sm text-white/40">
        Could not connect to data sources. Make sure your Sanity project ID and
        dataset are correct.
      </p>
      {error.digest && (
        <p className="mt-2 text-[10px] text-white/20 font-mono">
          digest: {error.digest}
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 px-4 py-2 rounded-sm bg-val-red text-white text-xs font-bold uppercase tracking-wider hover:bg-val-red/90 transition-colors"
      >
        Try again
      </button>
    </main>
  );
}
