import type { UpdateState } from "../../lib/desktop/protocol";

interface Release {
  version: string;
}
export interface UpdateDriver {
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(silent: boolean, runAfter: boolean): void;
  on(event: "checking-for-update", listener: () => void): unknown;
  on(
    event: "update-available" | "update-not-available" | "update-downloaded",
    listener: (info: Release) => void,
  ): unknown;
  on(
    event: "download-progress",
    listener: (info: { percent: number }) => void,
  ): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
}

function errorMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error ? error.code : "";
  if (
    code === "ERR_UPDATER_NO_PUBLISHED_VERSIONS" ||
    (code === "ERR_XML_MISSED_ELEMENT" &&
      error instanceof Error &&
      error.message === "No published versions on GitHub")
  )
    return {
      unpublished: true,
      text: "No Windows release has been published yet.",
    };
  return {
    unpublished: false,
    text: "Could not update the app. Check your connection and try again.",
  };
}

export function createUpdateController(
  driver: UpdateDriver,
  version: string,
  publish: (state: UpdateState) => void,
) {
  let state: UpdateState = {
    status: "idle",
    currentVersion: version,
    availableVersion: null,
    percent: 0,
    message: null,
  };
  let busy = false;
  const set = (patch: Partial<UpdateState>) => {
    state = { ...state, ...patch };
    publish(state);
  };
  const failed = (error: unknown) => {
    const message = errorMessage(error);
    set({
      status: message.unpublished ? "unpublished" : "error",
      message: message.text,
    });
  };
  driver.on("checking-for-update", () =>
    set({
      status: "checking",
      message: null,
      percent: 0,
      availableVersion: null,
    }),
  );
  driver.on("update-available", (info) =>
    set({ status: "available", availableVersion: info.version }),
  );
  driver.on("update-not-available", () =>
    set({ status: "current", availableVersion: null }),
  );
  driver.on("download-progress", (info) =>
    set({
      status: "downloading",
      percent: Number.isFinite(info.percent)
        ? Math.max(0, Math.min(100, info.percent))
        : 0,
    }),
  );
  driver.on("update-downloaded", (info) =>
    set({ status: "downloaded", availableVersion: info.version, percent: 100 }),
  );
  driver.on("error", failed);
  return {
    get: () => state,
    async check() {
      if (
        busy ||
        state.status === "downloaded" ||
        state.status === "installing"
      )
        return state;
      busy = true;
      set({
        status: "checking",
        message: null,
        availableVersion: null,
        percent: 0,
      });
      try {
        await driver.checkForUpdates();
      } catch (error) {
        failed(error);
      } finally {
        busy = false;
      }
      return state;
    },
    async download() {
      if (busy || state.status !== "available") return state;
      busy = true;
      set({ status: "downloading", percent: 0, message: null });
      try {
        await driver.downloadUpdate();
      } catch (error) {
        failed(error);
      } finally {
        busy = false;
      }
      return state;
    },
    install() {
      if (state.status !== "downloaded" || busy)
        throw new Error("Download the update before installing it.");
      set({ status: "installing" });
      try {
        driver.quitAndInstall(true, true);
      } catch (error) {
        failed(error);
        throw error;
      }
    },
  };
}
