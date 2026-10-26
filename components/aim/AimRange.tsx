"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  Crosshair,
  Focus,
  MoveHorizontal,
  Palette,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import {
  AIM_PRESETS,
  DEFAULT_AIM_SETTINGS,
  loadAimSettings,
  type AimSettings,
} from "@/lib/aim/settings";
import type { AimController, AimViewState } from "./controller";
import { ImportedCrosshair } from "./ImportedCrosshair";
import {
  DEFAULT_AIM_BACKGROUND,
  loadAimBackground,
  saveAimBackground,
} from "@/lib/aim/appearance";

const MODES = [
  { id: "flicks", name: "Flicks", icon: Crosshair },
  { id: "moving", name: "Moving", icon: MoveHorizontal },
  { id: "tracking", name: "Tracking", icon: Focus },
] as const;
const DIFFICULTIES = [
  { id: "easy", label: "Easy", bars: 1 },
  { id: "medium", label: "Medium", bars: 2 },
  { id: "hard", label: "Hard", bars: 3 },
] as const;
const initialView: AimViewState = {
  phase: "ready",
  stats: {
    hits: 0,
    shots: 0,
    elapsed: 0,
    accuracy: null,
    heldTime: 0,
    onTargetTime: 0,
    averageInterval: null,
  },
  game: null,
  error: null,
  releasing: false,
  prepared: false,
};

export default function AimRange() {
  const stageRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<AimController | null>(null);
  const [settings, setSettings] = useState<AimSettings>(DEFAULT_AIM_SETTINGS);
  const [background, setBackground] = useState(DEFAULT_AIM_BACKGROUND);
  const [view, setView] = useState(initialView);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const saved = loadAimSettings();
    const savedBackground = loadAimBackground();
    import("./controller")
      .then(({ AimController }) => {
        if (cancelled || !stageRef.current || !anchorRef.current) return;
        try {
          controller.current = new AimController(
            stageRef.current,
            anchorRef.current,
            saved,
            setView,
          );
          setSettings(saved);
          setBackground(savedBackground);
          setLoaded(true);
        } catch {
          setView({
            ...initialView,
            phase: "error",
            error: "Could not open Aim. Reopen the tab.",
          });
        }
      })
      .catch(() => {
        if (!cancelled)
          setView({
            ...initialView,
            phase: "error",
            error: "Could not load Aim. Reopen the tab.",
          });
      });
    return () => {
      cancelled = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  const running = view.phase === "running";
  const busy = view.phase === "acquiring";
  const ready =
    loaded &&
    view.prepared &&
    view.game?.status === "ready" &&
    !busy &&
    !view.releasing;
  const issue =
    view.error ??
    (view.game && view.game.status !== "ready" ? view.game.message : null);
  const change = (next: AimSettings) => {
    controller.current?.pause();
    controller.current?.configure(next);
    setSettings(next);
  };
  const capture = () => {
    if (ready && !running) void controller.current?.start();
  };
  return (
    <div
      className="aim-range"
      data-phase={view.phase}
      style={{ "--aim-background": background } as CSSProperties}
    >
      <div className="aim-toolbar" role="toolbar" aria-label="Aim settings">
        <div
          className="aim-mode-switch"
          role="group"
          aria-label="Training mode"
        >
          {MODES.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={settings.mode === id}
              disabled={busy}
              onClick={() => change({ ...settings, mode: id })}
            >
              <Icon size={14} aria-hidden />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <div className="aim-square-switch" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map(({ id, label, bars }) => (
            <button
              key={id}
              type="button"
              className="aim-square-button"
              aria-label={label}
              title={label}
              aria-pressed={settings.difficulty === id}
              disabled={busy}
              onClick={() =>
                change({ ...settings, ...AIM_PRESETS[id], difficulty: id })
              }
            >
              <span className="aim-difficulty-bars" aria-hidden>
                {Array.from({ length: bars }, (_, index) => (
                  <i key={index} style={{ height: 6 + index * 5 }} />
                ))}
              </span>
            </button>
          ))}
        </div>
        <label className="aim-tuning">
          <span className="aim-tuning-caption">
            <span>Size</span>
            <output>{Math.round((settings.diameter / 6) * 100)}%</output>
          </span>
          <input
            aria-label="Target size"
            type="range"
            min={0.6}
            max={6}
            step={0.1}
            value={settings.diameter}
            disabled={busy}
            style={
              {
                "--aim-fill": `${((settings.diameter - 0.6) / 5.4) * 100}%`,
              } as CSSProperties
            }
            onChange={(event) =>
              change({
                ...settings,
                diameter: Number(event.target.value),
                difficulty: "custom",
              })
            }
          />
        </label>
        <label
          className="aim-tuning"
          data-disabled={settings.mode === "flicks" || undefined}
        >
          <span className="aim-tuning-caption">
            <span>Speed</span>
            <output>
              {settings.mode === "flicks"
                ? 0
                : Math.round((settings.speed / 40) * 100)}
              %
            </output>
          </span>
          <input
            aria-label="Target speed"
            type="range"
            min={0}
            max={40}
            step={1}
            value={settings.mode === "flicks" ? 0 : settings.speed}
            disabled={busy || settings.mode === "flicks"}
            style={
              {
                "--aim-fill": `${settings.mode === "flicks" ? 0 : (settings.speed / 40) * 100}%`,
              } as CSSProperties
            }
            onChange={(event) =>
              change({
                ...settings,
                speed: Number(event.target.value),
                difficulty: "custom",
              })
            }
          />
        </label>
        <div className="aim-square-switch" role="group" aria-label="Duration">
          {([0, 30, 60] as const).map((duration) => (
            <button
              key={duration}
              type="button"
              className="aim-square-button"
              aria-label={duration ? `${duration} seconds` : "No timer"}
              title={duration ? `${duration} seconds` : "No timer"}
              aria-pressed={settings.duration === duration}
              disabled={busy}
              onClick={() => change({ ...settings, duration })}
            >
              {duration ? (
                <span className="aim-duration-value">
                  {duration}
                  <small>S</small>
                </span>
              ) : (
                <X size={16} aria-hidden />
              )}
            </button>
          ))}
        </div>
        <label className="aim-color-control" title="Background color">
          <Palette size={15} aria-hidden />
          <i style={{ backgroundColor: background }} aria-hidden />
          <input
            type="color"
            aria-label="Background color"
            value={background}
            disabled={!loaded || busy}
            onChange={(event) => {
              const color = event.target.value;
              setBackground(color);
              saveAimBackground(color);
            }}
          />
        </label>
        <div className="aim-toolbar-actions">
          {settings.duration > 0 ? (
            <output className="aim-timer" aria-label="Time remaining">
              {Math.max(0, Math.ceil(settings.duration - view.stats.elapsed))}
            </output>
          ) : null}
          {issue ? (
            <button
              className="aim-icon-button aim-issue"
              type="button"
              title={issue}
              aria-label={issue}
              onClick={() => void controller.current?.refresh()}
            >
              <AlertCircle size={16} />
              <span className="sr-only" role="alert">
                {issue}
              </span>
            </button>
          ) : null}
          <button
            className="aim-icon-button"
            type="button"
            aria-label={running ? "Pause" : "Start training"}
            title={running ? "Pause · Esc" : "Start training"}
            disabled={!running && !ready}
            onClick={() => (running ? controller.current?.pause() : capture())}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            className="aim-icon-button"
            type="button"
            aria-label="Restart"
            title="Restart"
            disabled={!loaded || busy}
            onClick={() => {
              controller.current?.pause();
              controller.current?.configure(settings);
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <div className="aim-viewport">
        <div
          ref={stageRef}
          className="aim-stage"
          role="application"
          aria-label="Aim training field"
          onContextMenu={(event) => event.preventDefault()}
          onMouseDown={(event) => {
            if (event.button === 0) capture();
          }}
        >
          <canvas ref={anchorRef} className="aim-scene-anchor" aria-hidden />
          <ImportedCrosshair
            profile={view.game?.status === "ready" ? view.game.crosshair : null}
          />
        </div>
      </div>
    </div>
  );
}
