/** Normalize a display name to a comparable lowercase alphanumeric token. */
export function normalizeName(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
