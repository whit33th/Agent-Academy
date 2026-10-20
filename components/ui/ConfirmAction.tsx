import { AlertTriangle, LoaderCircle } from "lucide-react";
export default function ConfirmAction({
  title,
  description,
  label,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  label: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4" role="group" aria-label={title}>
      <span className="grid size-11 place-items-center rounded-sm border border-val-red/20 bg-val-red/10 text-val-red">
        <AlertTriangle size={21} />
      </span>
      <div>
        <h4 className="font-oswald text-xl font-semibold uppercase text-white">
          {title}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          {description}
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-sm border border-val-red/20 bg-val-red/10 p-3 text-sm text-val-red"
        >
          {error}
        </p>
      )}
      <div className="mt-1 flex justify-end gap-3 border-t border-white/8 pt-4">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="h-10 rounded-sm px-4 text-xs font-semibold text-white/55 hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-val-red px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-val-red/85 disabled:opacity-50"
        >
          {pending && <LoaderCircle size={14} className="animate-spin" />}
          {pending ? "Saving…" : label}
        </button>
      </div>
    </div>
  );
}
