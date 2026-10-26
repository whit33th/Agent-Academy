/** Permissions needed by the app and its two supported external video players. */
export function rendererPermissionAllowed(
  permission: string,
  requestingUrl: string,
  appOrigin: string,
): boolean {
  let origin: string;
  try {
    origin = new URL(requestingUrl).origin;
  } catch {
    return false;
  }
  if (permission === "pointerLock") return origin === appOrigin;
  return (
    permission === "fullscreen" &&
    [
      appOrigin,
      "https://www.youtube-nocookie.com",
      "https://iframe.videodelivery.net",
    ].includes(origin)
  );
}
