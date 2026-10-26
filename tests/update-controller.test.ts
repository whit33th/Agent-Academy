import { EventEmitter } from "node:events";
import { expect, it, vi } from "vitest";
import { createUpdateController } from "../desktop/src/update-controller";

it("requires explicit check/download/install, blocks duplicates and reports progress without installing on quit", async () => {
  const events = new EventEmitter();
  let finish: (() => void) | undefined;
  const driver = {
    on: events.on.bind(events),
    checkForUpdates: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            events.emit("update-available", { version: "0.8.0" });
            resolve();
          };
        }),
    ),
    downloadUpdate: vi.fn(async () => {
      events.emit("download-progress", { percent: 120 });
      events.emit("update-downloaded", { version: "0.8.0" });
    }),
    quitAndInstall: vi.fn(),
  };
  const controller = createUpdateController(driver, "0.7.0", () => {});
  expect(() => controller.install()).toThrow("Download");
  const checking = controller.check();
  await controller.check();
  expect(driver.checkForUpdates).toHaveBeenCalledTimes(1);
  expect(controller.get().status).toBe("checking");
  finish?.();
  await checking;
  expect(controller.get().status).toBe("available");
  expect(driver.downloadUpdate).not.toHaveBeenCalled();
  await controller.download();
  expect(controller.get()).toMatchObject({
    status: "downloaded",
    percent: 100,
  });
  expect(driver.quitAndInstall).not.toHaveBeenCalled();
  controller.install();
  expect(driver.quitAndInstall).toHaveBeenCalledWith(true, true);
});

it("distinguishes no published release from network failure and permits retry", async () => {
  const events = new EventEmitter();
  const driver = {
    on: events.on.bind(events),
    checkForUpdates: vi.fn(async () => {
      throw Object.assign(new Error("no version"), {
        code: "ERR_UPDATER_NO_PUBLISHED_VERSIONS",
      });
    }),
    downloadUpdate: vi.fn(async () => {}),
    quitAndInstall: vi.fn(),
  };
  const controller = createUpdateController(driver, "0.7.0", () => {});
  await controller.check();
  expect(controller.get().status).toBe("unpublished");
  driver.checkForUpdates.mockRejectedValue(
    Object.assign(new Error("No published versions on GitHub"), {
      code: "ERR_XML_MISSED_ELEMENT",
    }),
  );
  await controller.check();
  expect(controller.get().status).toBe("unpublished");
  driver.checkForUpdates.mockRejectedValue(
    Object.assign(new Error("network offline"), {
      code: "ERR_UPDATER_LATEST_VERSION_NOT_FOUND",
    }),
  );
  await controller.check();
  expect(controller.get().status).toBe("error");
  driver.checkForUpdates.mockRejectedValue(new Error("network offline"));
  await controller.check();
  expect(controller.get()).toMatchObject({
    status: "error",
    message: expect.stringContaining("connection"),
  });
  await controller.download();
  expect(driver.downloadUpdate).not.toHaveBeenCalled();
});

it.each([
  ["ERR_UPDATER_CHANNEL_FILE_NOT_FOUND", "release is incomplete"],
  ["ERR_UPDATER_INVALID_SIGNATURE", "signature"],
  ["ERR_CHECKSUM_MISMATCH", "verification"],
  ["ENOSPC", "disk space"],
  ["EACCES", "permission"],
])(
  "reports an actionable %s failure and records its cause",
  async (code, message) => {
    const events = new EventEmitter();
    const cause = Object.assign(new Error("diagnostic detail"), { code });
    const diagnose = vi.fn();
    const driver = {
      on: events.on.bind(events),
      checkForUpdates: vi.fn(async () => {
        throw cause;
      }),
      downloadUpdate: vi.fn(async () => {}),
      quitAndInstall: vi.fn(),
    };
    const controller = createUpdateController(
      driver,
      "0.7.1",
      () => {},
      diagnose,
    );
    await controller.check();
    expect(controller.get()).toMatchObject({
      status: "error",
      message: expect.stringContaining(message),
    });
    expect(diagnose).toHaveBeenCalledWith(
      cause,
      expect.objectContaining({ status: "checking", currentVersion: "0.7.1" }),
    );
  },
);

it("recovers from a failed download and completes a repeated check, download and install", async () => {
  const events = new EventEmitter();
  const driver = {
    on: events.on.bind(events),
    checkForUpdates: vi.fn(async () => {
      events.emit("update-available", { version: "0.7.3" });
    }),
    downloadUpdate: vi
      .fn()
      .mockRejectedValueOnce(new Error("net::ERR_INTERNET_DISCONNECTED"))
      .mockImplementationOnce(async () => {
        events.emit("update-downloaded", { version: "0.7.3" });
      }),
    quitAndInstall: vi.fn(),
  };
  const controller = createUpdateController(driver, "0.7.1", () => {});
  await controller.check();
  await controller.download();
  expect(controller.get().status).toBe("error");
  await controller.check();
  expect(controller.get()).toMatchObject({
    status: "available",
    message: null,
  });
  await controller.download();
  controller.install();
  expect(driver.quitAndInstall).toHaveBeenCalledExactlyOnceWith(true, true);
});
