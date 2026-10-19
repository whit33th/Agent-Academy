import { headers } from "next/headers";
import { DESKTOP_REQUEST_HEADER } from "./protocol";

export async function isDesktopRequest() {
  return (await headers()).get(DESKTOP_REQUEST_HEADER) === "1";
}
