import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseLastKnownUser,
  parseValorantSensitivity,
} from "../lib/aim/game-settings";
import {
  aimedTarget,
  createRange,
  look,
  shoot,
  targetPosition,
  targetRadius,
  projectTarget,
} from "../lib/aim/range";
import { AimSession } from "../lib/aim/session";
import {
  AIM_SETTINGS_KEY,
  DEFAULT_AIM_SETTINGS,
  clampAimSettings,
  loadAimSettings,
  type AimSettings,
} from "../lib/aim/settings";
import {
  countsToDegrees,
  fitAimView,
  normalizeYaw,
  verticalFov,
} from "../lib/aim/sensitivity";

const defaults = { ...DEFAULT_AIM_SETTINGS };
afterEach(() => vi.unstubAllGlobals());
describe("VALORANT config parsing", () => {
  it("preserves hipfire precision and never substitutes ADS", () => {
    expect(
      parseValorantSensitivity(
        "EAresFloatSettingName::MouseSensitivityADS=2\r\nEAresFloatSettingName::MouseSensitivity=0.485000014\r\n",
      ),
    ).toBe(0.485000014);
    expect(
      parseValorantSensitivity(
        "EAresFloatSettingName::MouseSensitivityADS=0.5",
      ),
    ).toBeNull();
  });
  it.each(["", "NaN", "Infinity", "0", "-0.1", "0,45", "2garbage"])(
    "rejects invalid sensitivity %s",
    (value) => {
      expect(
        parseValorantSensitivity(
          `EAresFloatSettingName::MouseSensitivity=${value}`,
        ),
      ).toBeNull();
    },
  );
  it("refuses conflicting values and unsafe profile paths", () => {
    expect(
      parseValorantSensitivity(
        "EAresFloatSettingName::MouseSensitivity=0.4\nEAresFloatSettingName::MouseSensitivity=0.5",
      ),
    ).toBeNull();
    expect(parseLastKnownUser("LastKnownUser=../../somewhere")).toBeNull();
    expect(
      parseLastKnownUser(
        "LastKnownUser=56BFDA8C-840A-5015-B52C-45BB1FB17BCF\r\n",
      ),
    ).toBe("56bfda8c-840a-5015-b52c-45bb1fb17bcf");
  });
});
describe("camera and hit geometry", () => {
  it("preserves sprite proportions near every viewport edge", () => {
    const state = createRange(defaults),
      ball = state.balls[0];
    for (const yaw of [-48, 0, 48])
      for (const pitch of [-28, 0, 28]) {
        ball.yaw = yaw;
        ball.pitch = pitch;
        const projected = projectTarget(state, ball, 3, 1920, 1080);
        if (!projected) continue;
        expect(projected.major).toBe(projected.minor);
        expect(projected.rotation).toBe(0);
      }
  });
  it("keeps the visible circular core under the crosshair consistent with the unchanged ray hit test", () => {
    const state = createRange(defaults),
      ball = state.balls[0];
    for (const diameter of [0.6, 1, 3, 6])
      for (const yaw of [-50, -1.51, -0.49, 0, 0.49, 1.51, 50])
        for (const pitch of [-20, -1, 0, 1, 20]) {
          ball.yaw = 29;
          ball.pitch = 13;
          state.yaw = ball.yaw + yaw;
          state.pitch = ball.pitch + pitch;
          const projected = projectTarget(state, ball, diameter, 1920, 1080);
          const containsCrosshair = projected
            ? Math.hypot(projected.x - 960, projected.y - 540) <=
              projected.major
            : false;
          expect(containsCrosshair).toBe(aimedTarget(state, diameter) === ball);
        }
  });
  it("uses raw counts with the imported sensitivity, without pixel scaling", () => {
    expect(countsToDegrees(100, 1)).toBeCloseTo(7, 12);
    const state = createRange(defaults);
    look(state, 1000, -200, 0.485000014);
    expect(state.yaw).toBeCloseTo(33.95000098, 9);
    expect(state.pitch).toBeCloseTo(6.790000196, 9);
  });
  it.each([1, -1, 20, -20])("still hits after %s complete turns", (turns) => {
    const state = createRange(defaults);
    const ball = state.balls[0];
    state.yaw = ball.yaw;
    state.pitch = ball.pitch;
    expect(aimedTarget(state, 2)?.id).toBe(ball.id);
    look(state, (turns * 360) / 0.07, 0, 1);
    expect(aimedTarget(state, 2)?.id).toBe(ball.id);
    expect(state.yaw).toBeGreaterThanOrEqual(-180);
    expect(state.yaw).toBeLessThan(180);
  });
  it("hits at combined high yaw and pitch and excludes spheres behind the camera", () => {
    const state = createRange(defaults);
    const ball = state.balls[0];
    ball.yaw = 29;
    ball.pitch = 13;
    state.yaw = 29;
    state.pitch = 13;
    expect(aimedTarget(state, 0.6)).toBe(ball);
    state.yaw = normalizeYaw(29 + 180);
    expect(aimedTarget(state, 0.6)).toBeNull();
  });
  it("keeps target centers and radii in one world coordinate system", () => {
    const state = createRange(defaults);
    const ball = state.balls[0];
    ball.yaw = 0;
    ball.pitch = 0;
    expect(targetPosition(ball)).toEqual({ x: 0, y: 1.6, z: -15 });
    expect(targetRadius(2)).toBeCloseTo(Math.tan(Math.PI / 180) * 15);
    state.yaw = 0;
    state.pitch = 0;
    expect(shoot(state, defaults, () => 0.5)).toBe(true);
    expect(aimedTarget(state, 2)).toBeNull();
  });
  it("spawns separated targets even with adversarial randomness", () => {
    const state = createRange({ ...defaults, mode: "moving" }, () => 0.5);
    expect(state.balls).toHaveLength(3);
    expect(new Set(state.balls.map((ball) => ball.style)).size).toBe(3);
    for (const a of state.balls)
      for (const b of state.balls)
        if (a !== b)
          expect(
            Math.hypot(a.yaw - b.yaw, a.pitch - b.pitch),
          ).toBeGreaterThanOrEqual(4);
  });
  it("spawns flick targets sequentially and changes the artwork after every hit", () => {
    const state = createRange(defaults);
    expect(state.balls).toHaveLength(1);
    for (let index = 0; index < 30; index++) {
      const ball = state.balls[0],
        previous = ball.style;
      state.yaw = ball.yaw;
      state.pitch = ball.pitch;
      expect(shoot(state, defaults)).toBe(true);
      expect(ball.style).not.toBe(previous);
      expect(state.balls).toHaveLength(1);
    }
  });
  it("keeps the next flick target in view after aiming at an edge target", () => {
    const settings = { ...defaults, diameter: 3 };
    const state = createRange(settings);
    state.yaw = state.balls[0].yaw = -29;
    state.pitch = state.balls[0].pitch = 0;
    expect(shoot(state, settings, () => 0.99)).toBe(true);
    expect(projectTarget(state, state.balls[0], 3, 1920, 1080)).not.toBeNull();
  });
  it("fits 16:9 without stretching on wide and tall screens", () => {
    expect(fitAimView(2560, 1080)).toEqual({
      width: 1920,
      height: 1080,
      left: 320,
      top: 0,
    });
    const tall = fitAimView(1000, 1000);
    expect(tall.width / tall.height).toBeCloseTo(16 / 9);
    expect(verticalFov(103, 16 / 9)).toBeCloseTo(70.53, 1);
  });
});
describe("session lifecycle", () => {
  it("counts active wall time through a slow frame without teleporting targets", () => {
    const session = new AimSession(
      { ...defaults, mode: "moving", duration: 30 },
      () => 0.2,
    );
    session.resume();
    const yaw = session.state.balls[0].yaw;
    session.advance(10, 1);
    expect(session.state.elapsed).toBe(10);
    expect(Math.abs(session.state.balls[0].yaw - yaw)).toBeLessThan(1);
    session.advance(20, 1);
    expect(session.phase).toBe("results");
    expect(session.state.elapsed).toBe(30);
  });
  it("does not move, shoot, hold or advance before running", () => {
    const session = new AimSession(defaults);
    session.move(1000, 1000);
    session.fire(1);
    session.advance(1, 1);
    expect(session.state.yaw).toBe(0);
    expect(session.state.shots).toBe(0);
    expect(session.state.elapsed).toBe(0);
    expect(session.held).toBe(false);
  });
  it("flushes movement before the shot rather than shooting at the previous frame", () => {
    const session = new AimSession(defaults);
    const ball = session.state.balls[0];
    session.resume();
    session.move(ball.yaw / 0.07, -ball.pitch / 0.07);
    expect(session.fire(1)).toBe(true);
    expect(session.state.hits).toBe(1);
  });
  it("freezes clock and targets and clears movement and held fire on pause", () => {
    const session = new AimSession({ ...defaults, mode: "tracking" });
    session.resume();
    session.fire(1);
    session.move(200, 300);
    session.pause();
    const before = structuredClone(session.state);
    session.advance(10, 1);
    expect(session.state).toEqual(before);
    expect(session.held).toBe(false);
    session.resume();
    session.advance(1 / 120, 1);
    expect(session.state.yaw).toBe(before.yaw);
    expect(session.state.heldTime).toBe(0);
  });
  it("requires a fresh resume after interruption during acquisition", () => {
    const session = new AimSession(defaults);
    session.phase = "acquiring";
    session.pause();
    session.fire(1);
    session.advance(1, 1);
    expect(session.phase).toBe("paused");
    expect(session.state.shots).toBe(0);
    expect(session.state.elapsed).toBe(0);
  });
  it("finishes exactly at 30 seconds and never counts paused wall time", () => {
    const session = new AimSession({ ...defaults, duration: 30 });
    session.resume();
    for (let i = 0; i < 300; i++) session.advance(1 / 60, 1);
    session.pause();
    for (let i = 0; i < 200; i++) session.advance(1, 1);
    expect(session.state.elapsed).toBeCloseTo(5, 8);
    session.resume();
    for (let i = 0; i < 1800; i++) session.advance(1 / 60, 1);
    expect(session.phase).toBe("results");
    expect(session.state.elapsed).toBe(30);
    expect(session.held).toBe(false);
  });
  it("produces the same motion at different rendering rates", () => {
    const settings: AimSettings = { ...defaults, mode: "moving" };
    const slow = new AimSession(settings, () => 0.2),
      fast = new AimSession(settings, () => 0.2);
    slow.resume();
    fast.resume();
    for (let i = 0; i < 600; i++) slow.advance(1 / 60, 1);
    for (let i = 0; i < 1440; i++) fast.advance(1 / 144, 1);
    expect(slow.state.balls[0].yaw).toBeCloseTo(fast.state.balls[0].yaw, 7);
    expect(slow.state.elapsed).toBeCloseTo(fast.state.elapsed, 7);
  });
  it("measures tracking only while held and never scores click hits", () => {
    const session = new AimSession({ ...defaults, mode: "tracking", speed: 0 });
    const ball = session.state.balls[0];
    session.resume();
    session.state.yaw = ball.yaw;
    session.state.pitch = ball.pitch;
    session.advance(0.05, 1);
    expect(session.state.heldTime).toBe(0);
    session.fire(1);
    session.advance(0.05, 1);
    expect(session.stats().accuracy).toBeCloseTo(1);
    session.state.yaw += 30;
    session.advance(0.05, 1);
    expect(session.stats().accuracy).toBeCloseTo(0.5);
    expect(session.state.shots).toBe(0);
    expect(session.state.hits).toBe(0);
  });
  it("keeps flick targets still regardless of saved speed", () => {
    const session = new AimSession(defaults);
    const before = structuredClone(session.state.balls);
    session.resume();
    session.advance(0.05, 1);
    expect(session.state.balls).toEqual(before);
  });
});
describe("local exercise preferences", () => {
  it("migrates only size/speed and removes the legacy manual sensitivity", () => {
    const storage = new Map([
      [
        "agent-academy:aim:v1",
        JSON.stringify({ sensitivity: 0.1, diameter: 3, speed: 20 }),
      ],
    ]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    expect(loadAimSettings()).toEqual({
      mode: "flicks",
      difficulty: "custom",
      diameter: 3,
      speed: 20,
      duration: 0,
    });
    expect(storage.has("agent-academy:aim:v1")).toBe(false);
    expect(storage.get(AIM_SETTINGS_KEY)).not.toContain("sensitivity");
  });
  it("validates saved values without admitting manual sensitivity", () => {
    expect(
      clampAimSettings({
        mode: "tracking",
        difficulty: "hard",
        diameter: 1,
        speed: 20,
        duration: 30,
        sensitivity: 100,
        targetStyle: "rift-4",
      }),
    ).toEqual({
      mode: "tracking",
      difficulty: "hard",
      diameter: 1,
      speed: 20,
      duration: 30,
    });
    expect(clampAimSettings({ diameter: null, speed: Infinity })).toEqual({
      ...defaults,
      difficulty: "custom",
    });
  });
});
