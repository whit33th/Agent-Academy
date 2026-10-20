import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString(),
  },
}));
import { createCollectionCache } from "../desktop/src/collection-cache";

afterEach(() => vi.restoreAllMocks());
it("keeps viewed images across restarts, rejects foreign origins and retries failed downloads", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "academy-images-"));
  const config = {
    NEXT_PUBLIC_CONVEX_URL: "https://qa.convex.cloud",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("qa.clerk.accounts.dev$").toString("base64")}`,
  };
  try {
    const cache = createCollectionCache(directory, config);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(
        new Response("image-bytes", {
          headers: { "Content-Type": "image/webp" },
        }),
      );
    const url = "https://qa.convex.cloud/api/storage/viewed-image";
    expect(await cache("image", url, false, null)).toBeNull();
    const image = await cache("image", url, false, null);
    expect(image).toBe(
      `data:image/webp;base64,${Buffer.from("image-bytes").toString("base64")}`,
    );
    fetch.mockRejectedValue(new Error("offline"));
    const restored = createCollectionCache(directory, config);
    expect(await restored("image", url, false, null)).toBe(image);
    expect(fetch).toHaveBeenCalledTimes(2);
    await expect(
      restored("image", "https://evil.example/image.webp", false, null),
    ).rejects.toThrow("Unexpected image origin");
    await expect(restored("read", "private-rows", true, null)).rejects.toThrow(
      "Sign in",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
