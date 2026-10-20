import { findMap } from "../catalog/catalog";
import { AUTH_SCHEME } from "./protocol";

export function boardDestination(link: string): string | null {
  try {
    const url = new URL(link);
    const map = findMap(decodeURIComponent(url.pathname.slice(1)));
    const payload = url.searchParams.get("strat");
    if (
      url.protocol !== `${AUTH_SCHEME}:` ||
      url.hostname !== "board" ||
      !map ||
      !payload ||
      payload.length > 24000 ||
      !/^[A-Za-z0-9+/=]+$/.test(payload)
    )
      return null;
    return `/${map._id}?${new URLSearchParams({ strat: payload })}`;
  } catch {
    return null;
  }
}

export function createBoardLink(mapSlug: string, payload: string): string {
  const url = `${AUTH_SCHEME}://board/${mapSlug}?${new URLSearchParams({ strat: payload })}`;
  if (!boardDestination(url))
    throw new Error("This drawing is too large to share as a link.");
  return url;
}
