import { AimSession, type AimPhase } from "@/lib/aim/session";
import { fitAimView } from "@/lib/aim/sensitivity";
import { saveAimSettings, type AimSettings } from "@/lib/aim/settings";
import type { ValorantAimSettings } from "@/lib/aim/game-settings";
import { aimedTarget, type AimStats } from "@/lib/aim/range";
import { AimScene } from "./scene";

export interface AimViewState {
  phase: AimPhase;
  stats: AimStats;
  game: ValorantAimSettings | null;
  error: string | null;
  releasing: boolean;
  prepared: boolean;
}
const unavailable: ValorantAimSettings = {
  status: "unsupported",
  message:
    "Open Aim in the Agent Academy Windows app. The browser cannot read your VALORANT sensitivity or crosshair.",
};
export class AimController {
  readonly session: AimSession;
  private scene: AimScene;
  private frame = 0;
  private last = 0;
  private hudSecond = -1;
  private nextFrameAt = 0;
  private game: ValorantAimSettings | null = null;
  private error: string | null = null;
  private generation = 0;
  private disposed = false;
  private refreshing: Promise<ValorantAimSettings> | null = null;
  private observer: ResizeObserver;
  private timer: ReturnType<typeof setInterval>;
  private unsubscribe: (() => void) | undefined;
  private releasing = false;
  private hadLock = false;
  private prepared = false;
  private preparation: Promise<void>;
  private releaseTimer: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private stage: HTMLDivElement,
    canvas: HTMLCanvasElement,
    settings: AimSettings,
    private update: (view: AimViewState) => void,
  ) {
    this.session = new AimSession(settings);
    this.scene = new AimScene(canvas);
    this.preparation = this.scene.ready
      .then(() => {
        if (this.disposed) return;
        this.prepared = true;
        this.draw();
        this.publish();
      })
      .catch(() => {
        if (this.disposed) return;
        this.error = "Could not load the targets. Reopen the Aim tab.";
        this.session.phase = "error";
        this.publish();
      });
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(stage.parentElement!);
    this.resize();
    window.addEventListener("mousemove", this.move);
    window.addEventListener("mousedown", this.down, true);
    window.addEventListener("mouseup", this.up);
    window.addEventListener("keydown", this.key, true);
    window.addEventListener("blur", this.blur);
    window.addEventListener("focus", this.focus);
    document.addEventListener("visibilitychange", this.visibility);
    document.addEventListener("pointerlockchange", this.lockChanged);
    this.unsubscribe = window.agentAcademy?.aim.onSuspend(this.blur);
    this.timer = setInterval(() => {
      if (!document.hidden && this.session.phase === "running")
        void this.refresh();
    }, 2000);
    void this.refresh();
  }
  private publish() {
    if (!this.disposed)
      this.update({
        phase: this.session.phase,
        stats: this.session.stats(),
        game: this.game,
        error: this.error,
        releasing: this.releasing,
        prepared: this.prepared,
      });
  }
  async refresh(): Promise<ValorantAimSettings> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      let next: ValorantAimSettings;
      try {
        next = (await window.agentAcademy?.aim.settings()) ?? unavailable;
      } catch {
        next = {
          status: "missing",
          message: "Could not read the game settings. Try again.",
        };
      }
      if (this.disposed) return next;
      const sameCrosshair =
        this.game?.status === "ready" &&
        next.status === "ready" &&
        JSON.stringify(this.game.crosshair) === JSON.stringify(next.crosshair);
      if (
        sameCrosshair &&
        next.status === "ready" &&
        this.game?.status === "ready"
      )
        next.crosshair = this.game.crosshair;
      const changed =
        this.game?.status === "ready" &&
        (next.status !== "ready" ||
          this.game.sensitivity !== next.sensitivity ||
          this.game.profileKey !== next.profileKey ||
          !sameCrosshair);
      this.game = next;
      if (
        changed &&
        (this.session.phase === "running" || this.session.phase === "acquiring")
      )
        this.pause();
      this.publish();
      return next;
    })();
    try {
      return await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }
  configure(settings: AimSettings) {
    if (this.session.phase === "running" || this.session.phase === "acquiring")
      return;
    this.generation++;
    this.session.reset(settings);
    saveAimSettings(settings);
    if (this.prepared) this.error = null;
    else if (this.error) this.session.phase = "error";
    this.draw();
    this.publish();
  }
  async start(restart = false) {
    if (
      this.disposed ||
      this.releasing ||
      this.session.phase === "running" ||
      this.session.phase === "acquiring"
    )
      return;
    if (restart || this.session.phase === "results")
      this.session.reset(this.session.settings);
    const attempt = ++this.generation;
    this.session.phase = "acquiring";
    this.error = null;
    this.publish();
    try {
      await this.preparation;
      if (attempt !== this.generation || this.disposed) return;
      if (!this.prepared)
        throw new Error(this.error ?? "Targets are not ready yet.");
      const game = await this.refresh();
      if (attempt !== this.generation || this.disposed) return;
      if (game.status !== "ready") throw new Error(game.message);
      if (!window.agentAcademy)
        throw new Error(
          unavailable.status !== "ready"
            ? unavailable.message
            : "Open the Windows app.",
        );
      // Never request regular/accelerated pointer lock as a fallback.
      const result = this.stage.requestPointerLock({
        unadjustedMovement: true,
      });
      if (!result || typeof result.then !== "function")
        throw new Error(
          "This app version cannot confirm raw mouse input. Update the app.",
        );
      await result;
      if (attempt !== this.generation || this.disposed) {
        if (document.pointerLockElement === this.stage)
          document.exitPointerLock();
        return;
      }
      if (
        document.pointerLockElement !== this.stage ||
        !document.hasFocus() ||
        document.hidden
      )
        throw new Error(
          "Mouse capture was interrupted. Return to the window and press Play.",
        );
      this.session.resume();
      this.last = performance.now();
      this.nextFrameAt = this.last;
      this.hudSecond = -1;
      this.publish();
      this.frame = requestAnimationFrame(this.tick);
    } catch (error) {
      if (attempt !== this.generation || this.disposed) return;
      this.session.pause();
      this.session.phase = "error";
      this.error =
        error instanceof DOMException
          ? `Could not enable raw mouse input (${error.name}). Return to the window and press Play to try again.`
          : error instanceof Error
            ? error.message
            : "Could not start training.";
      if (document.pointerLockElement === this.stage)
        document.exitPointerLock();
      this.stopFrame();
      this.publish();
    }
  }
  pause() {
    if (this.session.phase !== "running" && this.session.phase !== "acquiring")
      return;
    this.generation++;
    this.session.pause();
    this.stopFrame();
    if (document.pointerLockElement === this.stage) {
      this.releaseCooldown();
      document.exitPointerLock();
    }
    this.draw();
    this.publish();
  }
  private stopFrame() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.last = 0;
  }
  private draw() {
    if (!document.hidden && !this.disposed)
      this.scene.render(
        this.session.state,
        this.session.settings.diameter,
        this.session.phase === "running" &&
          this.session.settings.mode === "tracking"
          ? (aimedTarget(this.session.state, this.session.settings.diameter)
              ?.id ?? null)
          : null,
      );
  }
  private tick = (now: number) => {
    this.frame = 0;
    if (this.disposed || this.session.phase !== "running") return;
    if (
      document.hidden ||
      document.pointerLockElement !== this.stage ||
      this.game?.status !== "ready"
    ) {
      this.pause();
      return;
    }
    if (now + 0.25 < this.nextFrameAt) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    const interval = 1000 / 120;
    this.nextFrameAt = Math.max(this.nextFrameAt + interval, now - interval);
    this.session.advance((now - this.last) / 1000, this.game.sensitivity);
    this.last = now;
    this.draw();
    if (this.session.isComplete()) {
      document.exitPointerLock();
      this.publish();
      return;
    }
    const second = Math.floor(this.session.state.elapsed);
    if (this.session.settings.duration && second !== this.hudSecond) {
      this.hudSecond = second;
      this.publish();
    }
    this.frame = requestAnimationFrame(this.tick);
  };
  private resize = () => {
    if (this.disposed) return;
    const parent = this.stage.parentElement!.getBoundingClientRect();
    const view = fitAimView(parent.width, parent.height);
    Object.assign(this.stage.style, {
      width: `${view.width}px`,
      height: `${view.height}px`,
      left: `${view.left}px`,
      top: `${view.top}px`,
    });
    this.scene.resize(view.width, view.height);
    this.draw();
  };
  private move = (event: MouseEvent) => {
    if (document.pointerLockElement === this.stage)
      this.session.move(event.movementX, event.movementY);
  };
  private down = (event: MouseEvent) => {
    if (
      event.button !== 0 ||
      document.pointerLockElement !== this.stage ||
      this.session.phase !== "running" ||
      this.game?.status !== "ready"
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    this.session.fire(this.game.sensitivity);
    this.draw();
  };
  private up = () => {
    this.session.held = false;
  };
  private key = (event: KeyboardEvent) => {
    if (
      event.key === "Escape" &&
      (this.session.phase === "running" || this.session.phase === "acquiring")
    ) {
      event.preventDefault();
      this.pause();
    }
  };
  private blur = () => {
    this.pause();
  };
  private focus = () => {
    void this.refresh();
    this.draw();
  };
  private visibility = () => {
    if (document.hidden) this.blur();
    else this.focus();
  };
  private releaseCooldown() {
    // Chromium briefly rejects relocking after an escape. Keep the action explicit
    // and available only after that cooldown; never silently retry a capture.
    this.releasing = true;
    clearTimeout(this.releaseTimer);
    this.releaseTimer = setTimeout(() => {
      this.releasing = false;
      this.publish();
    }, 1300);
  }
  private lockChanged = () => {
    if (document.pointerLockElement === this.stage) {
      this.hadLock = true;
      return;
    }
    if (this.hadLock) {
      this.hadLock = false;
      this.releaseCooldown();
      this.publish();
    }
    if (this.session.phase === "running") this.pause();
  };
  dispose() {
    this.disposed = true;
    this.generation++;
    this.session.pause();
    this.stopFrame();
    clearInterval(this.timer);
    clearTimeout(this.releaseTimer);
    this.observer.disconnect();
    this.unsubscribe?.();
    window.removeEventListener("mousemove", this.move);
    window.removeEventListener("mousedown", this.down, true);
    window.removeEventListener("mouseup", this.up);
    window.removeEventListener("keydown", this.key, true);
    window.removeEventListener("blur", this.blur);
    window.removeEventListener("focus", this.focus);
    document.removeEventListener("visibilitychange", this.visibility);
    document.removeEventListener("pointerlockchange", this.lockChanged);
    if (document.pointerLockElement === this.stage) document.exitPointerLock();
    this.scene.dispose();
  }
}
