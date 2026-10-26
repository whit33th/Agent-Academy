import {
  createRange,
  aimedTarget,
  FIXED_STEP,
  look,
  rangeStats,
  shoot,
  step,
  type RangeState,
} from "./range";
import type { AimSettings } from "./settings";
export type AimPhase =
  "ready" | "acquiring" | "running" | "paused" | "results" | "error";
/** Input and clock state live outside React. All interruptions share one reset. */
export class AimSession {
  phase: AimPhase = "ready";
  state: RangeState;
  settings: AimSettings;
  held = false;
  private x = 0;
  private y = 0;
  private accumulator = 0;
  constructor(
    settings: AimSettings,
    private random: () => number = Math.random,
  ) {
    this.settings = { ...settings };
    this.state = createRange(settings, random);
  }
  reset(settings: AimSettings) {
    this.clearInput();
    this.settings = { ...settings };
    this.state = createRange(settings, this.random);
    this.phase = "ready";
  }
  move(x: number, y: number) {
    if (this.phase !== "running" || !Number.isFinite(x) || !Number.isFinite(y))
      return;
    this.x += x;
    this.y += y;
  }
  flushLook(sensitivity: number) {
    if (this.phase === "running") look(this.state, this.x, this.y, sensitivity);
    this.x = this.y = 0;
  }
  fire(sensitivity: number) {
    if (this.phase !== "running") return false;
    this.flushLook(sensitivity);
    this.held = true;
    return shoot(this.state, this.settings, this.random);
  }
  pause() {
    if (this.phase === "running" || this.phase === "acquiring")
      this.phase = "paused";
    this.clearInput();
  }
  resume() {
    this.clearInput();
    this.phase = "running";
  }
  clearInput() {
    this.x = this.y = this.accumulator = 0;
    this.held = false;
  }
  advance(dt: number, sensitivity: number) {
    if (this.phase !== "running") return;
    this.flushLook(sensitivity);
    const remaining = this.settings.duration
      ? Math.max(0, this.settings.duration - this.state.elapsed)
      : Infinity;
    const activeSeconds = Number.isFinite(dt)
      ? Math.min(Math.max(dt, 0), remaining)
      : 0;
    const elapsed = this.state.elapsed;
    this.accumulator += Math.min(activeSeconds, 0.05);
    while (this.accumulator + 1e-10 >= FIXED_STEP) {
      step(this.state, FIXED_STEP, this.settings, false);
      this.accumulator -= FIXED_STEP;
    }
    // The timer counts focused wall time; limiting a long simulation frame must not slow the clock.
    this.state.elapsed = elapsed + activeSeconds;
    if (this.settings.mode === "tracking" && this.held) {
      this.state.heldTime += activeSeconds;
      if (aimedTarget(this.state, this.settings.diameter))
        this.state.onTargetTime += activeSeconds;
    }
    if (
      this.settings.duration &&
      this.state.elapsed >= this.settings.duration - 1e-8
    ) {
      this.state.elapsed = this.settings.duration;
      this.phase = "results";
      this.clearInput();
    }
  }
  stats() {
    return rangeStats(this.state, this.settings);
  }
  isComplete() {
    return this.phase === "results";
  }
}
