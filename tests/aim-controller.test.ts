import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AIM_SETTINGS } from "../lib/aim/settings";
import { aimedTarget } from "../lib/aim/range";
import type { ValorantAimSettings } from "../lib/aim/game-settings";
import type { AimViewState } from "../components/aim/controller";
import { importedCrosshair } from "./fixtures/aim-game";

const scene = vi.hoisted(() => ({
  ready: Promise.resolve(),
  render: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("../components/aim/scene", () => ({
  AimScene: class {
    get ready() {
      return scene.ready;
    }
    render = scene.render;
    resize = scene.resize;
    dispose = scene.dispose;
  },
}));
import { AimController } from "../components/aim/controller";

class FakeStage extends EventTarget {
  style = {};
  parentElement = {
    getBoundingClientRect: () => ({ width: 1920, height: 1080 }),
  };
  requestPointerLock = vi.fn(
    async (_options: { unadjustedMovement: boolean }) => {
      fakeDocument.pointerLockElement = this;
      fakeDocument.dispatchEvent(new Event("pointerlockchange"));
    },
  );
  setAttribute = vi.fn();
  removeAttribute = vi.fn();
  querySelector = () => canvas;
}
const canvas = new EventTarget();
let fakeDocument: EventTarget & {
  hidden: boolean;
  pointerLockElement: FakeStage | null;
  hasFocus: () => boolean;
  exitPointerLock: () => void;
  documentElement: {
    classList: {
      add: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
  };
};
let fakeWindow: EventTarget & {
  agentAcademy: {
    aim: {
      settings: ReturnType<typeof vi.fn>;
      fullscreen: ReturnType<typeof vi.fn>;
      onSuspend: ReturnType<typeof vi.fn>;
    };
  };
};
let controller: AimController | undefined;
let last: AimViewState | undefined;
const ready: ValorantAimSettings = {
  status: "ready",
  sensitivity: 0.485000014,
  profileKey: "current",
  modifiedAt: "2026-10-22",
  crosshair: importedCrosshair,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  scene.ready = Promise.resolve();
  fakeDocument = Object.assign(new EventTarget(), {
    hidden: false,
    pointerLockElement: null as FakeStage | null,
    hasFocus: () => true,
    exitPointerLock: () => {
      fakeDocument.pointerLockElement = null;
      fakeDocument.dispatchEvent(new Event("pointerlockchange"));
    },
    documentElement: { classList: { add: vi.fn(), remove: vi.fn() } },
  });
  fakeWindow = Object.assign(new EventTarget(), {
    agentAcademy: {
      aim: {
        settings: vi.fn(async () => ready),
        fullscreen: vi.fn(async () => {}),
        onSuspend: vi.fn(() => () => {}),
      },
    },
  });
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("document", fakeDocument);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => {
  controller?.dispose();
  controller = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function create() {
  const stage = new FakeStage();
  controller = new AimController(
    stage as unknown as HTMLDivElement,
    canvas as HTMLCanvasElement,
    DEFAULT_AIM_SETTINGS,
    (view) => {
      last = view;
    },
  );
  return stage;
}
describe("Aim input lifecycle at the real controller boundary", () => {
  it("does not capture or start until all target artwork has decoded", async () => {
    let resolve!: () => void;
    scene.ready = new Promise<void>((done) => {
      resolve = done;
    });
    const stage = create();
    const starting = controller!.start();
    await Promise.resolve();
    expect(last?.prepared).toBe(false);
    expect(stage.requestPointerLock).not.toHaveBeenCalled();
    resolve();
    await starting;
    expect(last?.prepared).toBe(true);
    expect(last?.phase).toBe("running");
  });
  it("blocks training with a visible error if artwork preparation fails", async () => {
    scene.ready = Promise.reject(new Error("Decode failed"));
    const stage = create();
    await controller!.start();
    expect(last?.phase).toBe("error");
    expect(last?.error).toContain("targets");
    expect(stage.requestPointerLock).not.toHaveBeenCalled();
    controller!.configure(DEFAULT_AIM_SETTINGS);
    expect(last?.error).toContain("targets");
    expect(last?.phase).toBe("error");
  });
  it("can aim at every easy target after movement well beyond the window edges", async () => {
    create();
    controller!.configure({
      ...DEFAULT_AIM_SETTINGS,
      diameter: 3,
      difficulty: "easy",
      speed: 8,
    });
    await controller!.start();
    const session = controller!.session;
    const move = (x: number, y: number) => {
      const event = new Event("mousemove");
      Object.assign(event, { movementX: x, movementY: y });
      fakeWindow.dispatchEvent(event);
      session.flushLook(ready.sensitivity);
    };
    for (let index = 0; index < 100; index++) {
      move(10000, 0);
      const ball = session.state.balls[0];
      move(
        (ball.yaw - session.state.yaw) / (ready.sensitivity * 0.07),
        -(ball.pitch - session.state.pitch) / (ready.sensitivity * 0.07),
      );
      expect(aimedTarget(session.state, 3)).toBe(ball);
      expect(session.fire(ready.sensitivity)).toBe(true);
    }
  });
  it("caps rendering at 120 FPS even when callbacks arrive at 1000 Hz", async () => {
    let tick: FrameRequestCallback = () => {};
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        tick = callback;
        return 1;
      }),
    );
    create();
    await controller!.start();
    scene.render.mockClear();
    for (let now = 1; now <= 1000; now++) tick(now);
    expect(scene.render.mock.calls.length).toBeGreaterThanOrEqual(119);
    expect(scene.render.mock.calls.length).toBeLessThanOrEqual(122);
    expect(controller!.session.state.elapsed).toBeCloseTo(1, 1);
    fakeWindow.dispatchEvent(new Event("blur"));
    scene.render.mockClear();
    for (let now = 1001; now <= 2000; now++) tick(now);
    expect(scene.render).not.toHaveBeenCalled();
  });
  it("starts only with raw lock confirmed and never issues an accelerated fallback", async () => {
    const stage = create();
    await controller!.refresh();
    await controller!.start();
    expect(last?.phase).toBe("running");
    expect(stage.requestPointerLock).toHaveBeenCalledExactlyOnceWith({
      unadjustedMovement: true,
    });
    fakeDocument.exitPointerLock();
    expect(last?.phase).toBe("paused");
  });
  it("does not rerender the React toolbar on every frame during free training", async () => {
    let tick: FrameRequestCallback = () => {};
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        tick = callback;
        return 1;
      }),
    );
    create();
    await controller!.start();
    const before = last;
    for (let now = 1; now <= 1000; now++) tick(now);
    expect(last).toBe(before);
  });
  it("turns raw lock rejection into a visible error without another lock attempt", async () => {
    const stage = create();
    stage.requestPointerLock.mockRejectedValue(
      new DOMException("Raw unsupported", "NotSupportedError"),
    );
    await controller!.start();
    expect(last?.phase).toBe("error");
    expect(last?.error).toContain("NotSupportedError");
    expect(stage.requestPointerLock).toHaveBeenCalledTimes(1);
  });
  it("never starts if the current game config is unavailable", async () => {
    fakeWindow.agentAcademy.aim.settings.mockResolvedValue({
      status: "missing",
      message: "Settings unavailable",
    });
    const stage = create();
    await controller!.refresh();
    await controller!.start();
    expect(last?.phase).toBe("error");
    expect(stage.requestPointerLock).not.toHaveBeenCalled();
    expect(fakeWindow.agentAcademy.aim.fullscreen).not.toHaveBeenCalled();
  });
  it("cancels a pending raw request on focus loss, including a late lock grant", async () => {
    const stage = create();
    let grant: () => void = () => {};
    stage.requestPointerLock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          grant = () => {
            fakeDocument.pointerLockElement = stage;
            resolve();
          };
        }),
    );
    const starting = controller!.start();
    await vi.waitFor(() => expect(stage.requestPointerLock).toHaveBeenCalled());
    fakeWindow.dispatchEvent(new Event("blur"));
    grant();
    await starting;
    expect(last?.phase).toBe("paused");
    expect(fakeDocument.pointerLockElement).toBeNull();
  });
  it("keeps the app header and window mode untouched during capture and disposal", async () => {
    create();
    await controller!.start();
    controller!.dispose();
    controller = undefined;
    expect(fakeWindow.agentAcademy.aim.fullscreen).not.toHaveBeenCalled();
    expect(fakeDocument.documentElement.classList.add).not.toHaveBeenCalled();
    expect(
      fakeDocument.documentElement.classList.remove,
    ).not.toHaveBeenCalled();
  });
  it("shows tracking feedback only for the currently aimed target, and clears it on pause", async () => {
    let tick: FrameRequestCallback = () => {};
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        tick = callback;
        return 1;
      }),
    );
    create();
    controller!.configure({
      ...DEFAULT_AIM_SETTINGS,
      mode: "tracking",
      speed: 0,
    });
    await controller!.start();
    const state = controller!.session.state,
      ball = state.balls[0];
    state.yaw = ball.yaw;
    state.pitch = ball.pitch;
    tick(20);
    expect(scene.render).toHaveBeenLastCalledWith(
      state,
      DEFAULT_AIM_SETTINGS.diameter,
      ball.id,
    );
    state.yaw += 20;
    tick(40);
    expect(scene.render).toHaveBeenLastCalledWith(
      state,
      DEFAULT_AIM_SETTINGS.diameter,
      null,
    );
    state.yaw = ball.yaw;
    tick(60);
    controller!.pause();
    expect(scene.render).toHaveBeenLastCalledWith(
      state,
      DEFAULT_AIM_SETTINGS.diameter,
      null,
    );
  });
  it("pauses when the imported sensitivity or profile changes", async () => {
    create();
    await controller!.start();
    controller!.session.held = true;
    fakeWindow.agentAcademy.aim.settings.mockResolvedValue({
      ...ready,
      sensitivity: 0.3,
    });
    await controller!.refresh();
    expect(last?.phase).toBe("paused");
    expect(controller!.session.held).toBe(false);
    expect(fakeDocument.pointerLockElement).toBeNull();
  });
  it("restoring focus never resumes fire or schedules a game loop", async () => {
    const stage = create();
    await controller!.start();
    fakeWindow.dispatchEvent(new Event("blur"));
    const requests = stage.requestPointerLock.mock.calls.length;
    fakeWindow.dispatchEvent(new Event("focus"));
    await controller!.refresh();
    expect(last?.phase).toBe("paused");
    expect(stage.requestPointerLock).toHaveBeenCalledTimes(requests);
    expect(controller!.session.held).toBe(false);
  });
  it("pauses and clears held fire when the selected crosshair changes", async () => {
    create();
    await controller!.start();
    controller!.session.held = true;
    fakeWindow.agentAcademy.aim.settings.mockResolvedValue({
      ...ready,
      crosshair: { ...ready.crosshair, color: "#00ffff" },
    });
    await controller!.refresh();
    expect(last?.phase).toBe("paused");
    expect(controller!.session.held).toBe(false);
    expect(fakeDocument.pointerLockElement).toBeNull();
    expect(last?.game).toMatchObject({ crosshair: { color: "#00ffff" } });
  });
  it("preserves capture and crosshair identity when rereading identical settings", async () => {
    create();
    await controller!.start();
    const previous = last!.game;
    fakeWindow.agentAcademy.aim.settings.mockResolvedValue(
      structuredClone(ready),
    );
    await controller!.refresh();
    expect(last?.phase).toBe("running");
    expect(
      last?.game?.status === "ready" &&
        previous?.status === "ready" &&
        last.game.crosshair === previous.crosshair,
    ).toBe(true);
  });
  it("does not issue relock requests during Chromium's escape cooldown", async () => {
    const stage = create();
    await controller!.start();
    fakeDocument.exitPointerLock();
    await controller!.start();
    expect(stage.requestPointerLock).toHaveBeenCalledTimes(1);
    expect(last?.releasing).toBe(true);
    await vi.advanceTimersByTimeAsync(1300);
    await controller!.start();
    expect(stage.requestPointerLock).toHaveBeenCalledTimes(2);
    expect(last?.phase).toBe("running");
  });
});
