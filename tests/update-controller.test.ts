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
