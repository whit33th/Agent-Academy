"use client";

import { useRef, useState } from "react";
import { Camera, LogOut, Check, LoaderCircle } from "lucide-react";
import { useAppSession } from "./SessionProvider";
import AccountAvatar from "./AccountAvatar";

export default function AccountProfile({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const session = useAppSession();
  const [firstName, setFirstName] = useState(session.firstName);
  const [lastName, setLastName] = useState(session.lastName);
  const [pending, setPending] = useState<"photo" | "profile" | "logout" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const changed =
    firstName.trim() !== session.firstName ||
    lastName.trim() !== session.lastName;

  async function changePhoto(file: File | null) {
    if (pending) return;
    setError("");
    setSaved(false);
    if (
      file &&
      (!["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        !file.size ||
        file.size > 10 * 1024 * 1024)
    ) {
      setError("Choose a PNG, JPEG or WebP up to 10 MB.");
      return;
    }
    setPending("photo");
    try {
      await session.setProfileImage(file);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your photo could not be updated. Try again.",
      );
    } finally {
      setPending(null);
    }
  }

  const inputClass =
    "h-11 w-full rounded-sm border border-white/12 bg-white/4 px-3 text-sm text-white outline-none transition-colors focus:border-val-red disabled:opacity-50";
  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center gap-4 border-b border-white/8 pb-6">
        <AccountAvatar large name={session.name} imageUrl={session.imageUrl} />
        <div className="min-w-0">
          <p className="truncate font-oswald text-xl font-semibold text-white">
            {session.name}
          </p>
          <p
            className="mt-1 truncate text-xs text-white/45"
            title={session.email}
          >
            {session.email}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <button
              type="button"
              disabled={!!pending}
              onClick={() => fileInput.current?.click()}
              className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-val-red hover:text-white disabled:opacity-40"
            >
              <Camera size={14} />
              {pending === "photo" ? "Updating…" : "Change photo"}
            </button>
            {session.hasImage && (
              <button
                type="button"
                disabled={!!pending}
                onClick={() => void changePhoto(null)}
                className="min-h-8 text-xs text-white/40 hover:text-white disabled:opacity-40"
              >
                Remove photo
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Profile photo"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void changePhoto(file);
            }}
          />
        </div>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-sm border border-val-red/20 bg-val-red/10 p-3 text-sm text-val-red"
        >
          {error}
        </p>
      )}
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending || !changed) return;
          setError("");
          setSaved(false);
          setPending("profile");
          try {
            await session.updateProfile({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            });
            setSaved(true);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Your profile could not be saved. Try again.",
            );
          } finally {
            setPending(null);
          }
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-white/55">
            First name
            <input
              value={firstName}
              maxLength={64}
              autoComplete="given-name"
              disabled={!!pending}
              onChange={(event) => {
                setFirstName(event.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-white/55">
            Last name
            <input
              value={lastName}
              maxLength={64}
              autoComplete="family-name"
              disabled={!!pending}
              onChange={(event) => {
                setLastName(event.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span
            role="status"
            className="inline-flex items-center gap-1.5 text-xs text-val-teal"
          >
            {saved && (
              <>
                <Check size={14} />
                Saved
              </>
            )}
          </span>
          <button
            type="submit"
            disabled={!!pending || !changed}
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-val-red px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-val-red/85 disabled:cursor-default disabled:opacity-35"
          >
            {pending === "profile" && (
              <LoaderCircle size={14} className="animate-spin" />
            )}
            Save changes
          </button>
        </div>
      </form>
      <div className="border-t border-white/8 pt-4">
        <button
          type="button"
          disabled={!!pending}
          onClick={async () => {
            setError("");
            setPending("logout");
            try {
              await session.signOut();
              onSignOut();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Sign out failed. Try again.",
              );
            } finally {
              setPending(null);
            }
          }}
          className="inline-flex h-10 items-center gap-2 text-xs font-semibold text-white/45 transition-colors hover:text-val-red disabled:opacity-40"
        >
          <LogOut size={15} />
          {pending === "logout" ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
