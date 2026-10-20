"use client";
import { Fragment, useRef, useSyncExternalStore } from "react";
import { useDialogFocus } from "@/lib/utils/useDialogFocus";
import { createPortal } from "react-dom";
import Image from "@/components/ui/CatalogImage";
import {
  X,
  Undo2,
  Share2,
  Pencil,
  Minus,
  MoveUpRight,
  Eraser,
  Trash,
  Users,
} from "lucide-react";
import { audio } from "@/lib/audio";
import { findAbilityStats } from "@/lib/data/ability-stats";
import { findMapRecord, worldToMinimap } from "@/lib/generated/valorant-maps";
import type {
  TacticalBoardProps,
  Tool,
  PlacedAbility,
  PlacedAgent,
} from "./model";
import { COLORS, WIDTHS } from "./model";
import { formatAbilityMeta, getAbilityEndpoints } from "./geometry";
import { useTacticalBoardSession } from "./useTacticalBoardSession";
function subscribeBoardPortal() {
  return () => {};
}

function boardPortalTarget() {
  return typeof document === "undefined" ? null : document.body;
}

export default function TacticalBoard(props: TacticalBoardProps) {
  const {
    map,
    allAgents,
    onClose,
    tool,
    color,
    width,
    setTool,
    setColor,
    setWidth,
    setArmedAbility,
    setArmedAgentDrop,
    handleUndo,
    handleShare,
    handleReset,
    overlayRef,
    bgCanvasRef,
    fgCanvasRef,
    agentStripRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    placedAbilities,
    placedAgents,
    setPlacedAbilities,
    setPlacedAgents,
    rotatingAbilityId,
    startRotateAbility,
    startTokenDrag,
    startAbilityStartDrag,
    selectedAgent,
    setSelectedAgent,
    armedAbility,
    armedAgentDrop,
    bgImage,
    cursorMode,
    shareError,
  } = useTacticalBoardSession(props);
  const portalTarget = useSyncExternalStore(
    subscribeBoardPortal,
    boardPortalTarget,
    () => null,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, Boolean(portalTarget));
  if (!portalTarget) return null;
  return createPortal(
    <div
      ref={dialogRef}
      data-tactical-board
      role="dialog"
      aria-modal="true"
      aria-label="Tactical board"
      className="fixed inset-x-0 bottom-0 top-[var(--desktop-titlebar-height,0px)] z-[250] bg-black/95 backdrop-blur-sm flex flex-col"
    >
      {shareError && (
        <p
          role="alert"
          className="bg-val-surface px-4 py-2 text-sm text-val-red"
        >
          {shareError}
        </p>
      )}
      {/* Top toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-val-surface/95 border-b border-white/10">
        <h2 className="font-oswald text-base font-bold uppercase tracking-wider text-white">
          Strat Board — <span className="text-val-red">{map.name}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <Toolbar
            tool={tool}
            color={color}
            width={width}
            onToolChange={(t) => {
              setTool(t);
              setArmedAbility(null);
              setArmedAgentDrop(false);
            }}
            onColorChange={setColor}
            onWidthChange={setWidth}
          />
          <ToolIconButton onClick={handleUndo} label="Undo">
            <Undo2 size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={handleShare} label="Copy share link">
            <Share2 size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={handleReset} label="Reset board">
            <Trash size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={onClose} label="Close">
            <X size={14} />
          </ToolIconButton>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex justify-center items-center p-3 min-h-0">
          <div
            ref={overlayRef}
            className="relative aspect-square h-full max-w-full touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ cursor: cursorMode }}
          >
            <Image
              src={bgImage}
              alt={map.name}
              fill
              draggable={false}
              priority
              sizes="(max-width: 1280px) 100vw, 1400px"
              quality={95}
              className="object-contain pointer-events-none"
            />
            <canvas
              ref={bgCanvasRef}
              className="absolute inset-0 pointer-events-none"
            />
            <canvas
              ref={fgCanvasRef}
              className="absolute inset-0 pointer-events-none"
            />

            <MapCalloutLayer mapName={map.name} />

            {/* SVG layer: ability shapes (smokes, walls, cones) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              {placedAbilities.map((a) => (
                <AbilityShapeSvg key={a.id} ability={a} />
              ))}
            </svg>

            {/* Ability icon tokens (drag to move, dbl-click to delete) */}
            {placedAbilities.map((a) => (
              <Fragment key={`${a.id}-frag`}>
                <AbilityToken
                  ability={a}
                  onPointerDown={(e) =>
                    e.shiftKey
                      ? startRotateAbility(e, a.id)
                      : startTokenDrag(e, "ability", a.id)
                  }
                  onRotatePointerDown={(e) => startRotateAbility(e, a.id)}
                  onDelete={() =>
                    setPlacedAbilities((prev) =>
                      prev.filter((p) => p.id !== a.id),
                    )
                  }
                  isRotating={rotatingAbilityId === a.id}
                />
                {(a.shape === "wall" || a.shape === "cone") &&
                  (a.length != null || a.coneRange != null) && (
                    <StartHandle
                      ability={a}
                      onPointerDown={(e) => startAbilityStartDrag(e, a.id)}
                    />
                  )}
              </Fragment>
            ))}

            {/* Agent tokens */}
            {placedAgents.map((a) => (
              <AgentToken
                key={a.id}
                placed={a}
                onPointerDown={(e) => startTokenDrag(e, "agent", a.id)}
                onDelete={() =>
                  setPlacedAgents((prev) => prev.filter((p) => p.id !== a.id))
                }
              />
            ))}
          </div>
        </div>

        {/* Ability picker row (visible when an agent is selected) */}
        {selectedAgent && (
          <div className="flex items-center gap-1.5 px-4 py-2 justify-center bg-val-surface/90 border-t border-white/10 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5">
              {selectedAgent.abilities
                .filter((ab) => ab.displayIcon)
                .map((ab) => {
                  const isArmed = armedAbility?.displayName === ab.displayName;
                  const stats = findAbilityStats(ab.displayName);
                  const meta = formatAbilityMeta(ab.displayName);
                  return (
                    <button
                      key={ab.displayName}
                      type="button"
                      onClick={() => {
                        audio.playClick();
                        setArmedAbility(isArmed ? null : ab);
                        setArmedAgentDrop(false);
                      }}
                      title={`${ab.displayName}${meta ? ` — ${meta}` : ""}`}
                      className={`relative size-10 xl:size-14 rounded-sm border transition-colors cursor-pointer ${
                        isArmed
                          ? "border-val-red bg-val-red/20"
                          : "border-white/10 bg-white/5 hover:border-white/40"
                      }`}
                    >
                      <Image
                        src={ab.displayIcon!}
                        alt={ab.displayName}
                        fill
                        sizes="96px"
                        quality={90}
                        className="object-contain p-1"
                      />
                      {stats && stats.shape !== "point" && (
                        <span className="absolute -bottom-1 -right-1 rounded-xs bg-black/90 px-1 py-0.5 text-[7px] font-black uppercase leading-none text-val-teal ring-1 ring-val-teal/40">
                          {stats.shape === "circle"
                            ? "AOE"
                            : stats.shape === "wall"
                              ? "WALL"
                              : stats.shape === "cone"
                                ? "CONE"
                                : "X"}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => {
                audio.playClick();
                setArmedAgentDrop((v) => !v);
                setArmedAbility(null);
              }}
              title="Place agent token on map"
              className={`flex relative items-center gap-1.5 w-auto aspect-square justify-center h-full rounded-full border-2 border-white text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${
                armedAgentDrop
                  ? "border-val-teal bg-val-teal/20 text-val-teal"
                  : " bg-white/5 text-white/70  hover:text-white"
              }`}
            >
              {selectedAgent.displayIcon && (
                <Image
                  src={selectedAgent.displayIcon}
                  alt={selectedAgent.name}
                  fill
                  sizes="112px"
                  quality={90}
                  className="rounded-full"
                />
              )}
            </button>
          </div>
        )}

        {/* Bottom agent strip */}
        <div
          ref={agentStripRef}
          className="flex items-center gap-2 px-4 py-3 bg-val-surface/95 border-t border-white/10 overflow-x-auto custom-scrollbar"
        >
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40 font-bold mr-2 shrink-0">
            <Users size={12} /> Agents
          </span>
          {allAgents.map((agent) => {
            const isSelected = selectedAgent?._id === agent._id;
            const icon = agent.displayIcon || agent.imageUrl || "";
            return (
              <button
                key={agent._id}
                type="button"
                onClick={() => {
                  audio.playClick();
                  setSelectedAgent(isSelected ? null : agent);
                  setArmedAbility(null);
                  setArmedAgentDrop(false);
                }}
                onMouseEnter={() => audio.playHover()}
                title={agent.name}
                className={`relative shrink-0 size-12 xl:size-16 rounded-sm border overflow-hidden transition-[border-color,transform,box-shadow] cursor-pointer ${
                  isSelected
                    ? "border-val-red scale-110 ring-2 ring-val-red/40"
                    : "border-white/10 bg-white/5 hover:border-white/40"
                }`}
              >
                {icon ? (
                  <Image
                    src={icon}
                    alt={agent.name}
                    fill
                    sizes="128px"
                    quality={90}
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white/60">
                    {agent.name.slice(0, 2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers / sub-components

function AbilityShapeSvg({ ability }: { ability: PlacedAbility }) {
  const { x, y, shape, color } = ability;
  const cx = x * 100;
  const cy = y * 100;

  if (shape === "circle" && ability.radius != null) {
    const r = ability.radius * 100;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.18}
        stroke={color}
        strokeOpacity={0.8}
        strokeWidth={0.3}
        strokeDasharray="0.8,0.5"
      />
    );
  }

  if (shape === "wall" && ability.length != null) {
    const halfLen = (ability.length * 100) / 2;
    return (
      <g transform={`rotate(${ability.rotation} ${cx} ${cy})`}>
        <line
          x1={cx - halfLen}
          y1={cy}
          x2={cx + halfLen}
          y2={cy}
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <line
          x1={cx - halfLen}
          y1={cy}
          x2={cx + halfLen}
          y2={cy}
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={0.9}
          strokeLinecap="round"
        />
      </g>
    );
  }

  if (shape === "cross" && ability.length != null) {
    const halfLen = (ability.length * 100) / 2;
    const nodeR = Math.max((ability.radius ?? 0.025) * 100, 1.6);
    const nodes: [number, number][] = [
      [-halfLen, 0],
      [halfLen, 0],
      [0, -halfLen],
      [0, halfLen],
      [0, 0],
    ];

    return (
      <g transform={`rotate(${ability.rotation} ${cx} ${cy})`}>
        <line
          x1={cx - halfLen}
          y1={cy}
          x2={cx + halfLen}
          y2={cy}
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy - halfLen}
          x2={cx}
          y2={cy + halfLen}
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={0.8}
          strokeLinecap="round"
        />
        {nodes.map(([dx, dy]) => (
          <circle
            key={`${dx}-${dy}`}
            cx={cx + dx}
            cy={cy + dy}
            r={nodeR}
            fill={color}
            fillOpacity={0.22}
            stroke={color}
            strokeOpacity={0.9}
            strokeWidth={0.35}
          />
        ))}
      </g>
    );
  }

  if (
    shape === "cone" &&
    ability.coneRange != null &&
    ability.coneAngle != null
  ) {
    const range = ability.coneRange * 100;
    const half = (ability.coneAngle * Math.PI) / 360; // half angle in radians
    const x1 = cx + range * Math.cos(-half);
    const y1 = cy + range * Math.sin(-half);
    const x2 = cx + range * Math.cos(half);
    const y2 = cy + range * Math.sin(half);
    const largeArc = ability.coneAngle > 180 ? 1 : 0;
    return (
      <g transform={`rotate(${ability.rotation} ${cx} ${cy})`}>
        <path
          d={`M ${cx} ${cy} L ${x1} ${y1} A ${range} ${range} 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={color}
          fillOpacity={0.14}
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={0.3}
        />
      </g>
    );
  }

  return null;
}

function AbilityToken({
  ability,
  onPointerDown,
  onRotatePointerDown,
  onDelete,
  isRotating,
}: {
  ability: PlacedAbility;
  onPointerDown: (e: React.PointerEvent) => void;
  onRotatePointerDown: (e: React.PointerEvent) => void;
  onDelete: () => void;
  isRotating: boolean;
}) {
  const canRotate =
    ability.shape === "wall" ||
    ability.shape === "cone" ||
    ability.shape === "cross";

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${ability.x * 100}%`, top: `${ability.y * 100}%` }}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onDoubleClick={onDelete}
        className="relative w-8 h-8 rounded-full bg-black/70 border-2 backdrop-blur-sm flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
        style={{ borderColor: ability.color }}
        title={`${ability.agentName} — ${ability.abilityName}  (drag to move, drag handle to rotate, double-click to delete)`}
      >
        {ability.abilityIcon ? (
          <Image
            src={ability.abilityIcon}
            alt={ability.abilityName}
            width={20}
            height={20}
            quality={90}
            draggable={false}
          />
        ) : (
          <span className="text-[8px] font-bold text-white">
            {ability.abilityName.slice(0, 2).toUpperCase()}
          </span>
        )}
      </button>
      {canRotate && (
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={onRotatePointerDown}
          className={`absolute left-1/2 -top-9 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-white/80 bg-black/80 cursor-ew-resize before:absolute before:left-1/2 before:top-full before:h-5 before:w-px before:-translate-x-1/2 before:bg-white/40 ${
            isRotating ? "ring-2 ring-val-red" : ""
          }`}
          aria-label="Rotate ability"
        />
      )}
    </div>
  );
}

function StartHandle({
  ability,
  onPointerDown,
}: {
  ability: PlacedAbility;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const start = getAbilityEndpoints(ability).start;

  return (
    <button
      type="button"
      tabIndex={-1}
      onPointerDown={onPointerDown}
      className="absolute -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border border-white/80 bg-black/80 cursor-grab z-10"
      style={{
        left: `${start.x * 100}%`,
        top: `${start.y * 100}%`,
      }}
      aria-label="Drag ability start"
    />
  );
}

/**
 * Renders Riot's official callout names (A Site, Lobby, Heaven, ...) using the
 * exact world-to-minimap transform from valorant-api.com. Site labels (A/B/C)
 * are emphasised, every other callout is shown as a subtle text marker.
 */
function MapCalloutLayer({ mapName }: { mapName: string }) {
  const record = findMapRecord(mapName);
  if (!record) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {record.callouts.map((c, idx) => {
        const { x, y } = worldToMinimap(c.worldX, c.worldY, record);
        if (x < 0 || x > 1 || y < 0 || y > 1) return null;
        const isSite = c.regionName.toLowerCase() === "site" && c.superRegion;
        const label = isSite ? c.superRegion! : c.regionName;
        return (
          <div
            key={`${c.regionName}-${c.superRegion}-${idx}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          >
            {isSite ? (
              <span className="grid size-7 place-items-center rounded-sm border border-val-teal/60 bg-black/55 font-oswald text-base font-bold text-white shadow-[0_0_16px_rgba(0,243,255,0.2)]">
                {label}
              </span>
            ) : (
              <span className="whitespace-nowrap rounded-sm bg-black/45 px-1 py-px font-oswald text-[10px] uppercase tracking-wide text-white/70">
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgentToken({
  placed,
  onPointerDown,
  onDelete,
}: {
  placed: PlacedAgent;
  onPointerDown: (e: React.PointerEvent) => void;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onDoubleClick={onDelete}
      className="absolute -translate-x-1/2 -translate-y-1/2 size-8 xl:size-10 rounded-full border-2 border-white/85 overflow-hidden bg-black cursor-grab active:cursor-grabbing hover:scale-110 transition-transform shadow-lg"
      style={{ left: `${placed.x * 100}%`, top: `${placed.y * 100}%` }}
      title={`${placed.agentName}  (drag to move, double-click to delete)`}
    >
      {placed.iconUrl && (
        <Image
          src={placed.iconUrl}
          alt={placed.agentName}
          fill
          sizes="80px"
          quality={90}
          className="object-cover"
          draggable={false}
        />
      )}
    </button>
  );
}

function ToolIconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-2 rounded-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

function Toolbar({
  tool,
  color,
  width,
  onToolChange,
  onColorChange,
  onWidthChange,
}: {
  tool: Tool;
  color: string;
  width: number;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onWidthChange: (w: number) => void;
}) {
  const tools: { key: Tool; icon: React.ReactNode; label: string }[] = [
    { key: "select", icon: <MoveUpRight size={14} />, label: "Select" },
    { key: "pen", icon: <Pencil size={14} />, label: "Pen" },
    { key: "line", icon: <Minus size={14} />, label: "Line" },
    { key: "arrow", icon: <MoveUpRight size={14} />, label: "Arrow" },
    { key: "eraser", icon: <Eraser size={14} />, label: "Eraser" },
  ];
  return (
    <div className="flex items-center gap-2 mr-1 pr-2 border-r border-white/10">
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onToolChange(t.key)}
            title={t.label}
            aria-label={t.label}
            className={`p-2 rounded-sm transition-colors cursor-pointer ${
              tool === t.key
                ? "bg-val-red text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            title={c}
            aria-label={`Color ${c}`}
            className={`size-4 xl:size-5 rounded-full border transition-transform cursor-pointer ${
              color === c ? "scale-125 border-white" : "border-white/20"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        {WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onWidthChange(w)}
            title={`Width ${w}px`}
            aria-label={`Width ${w}`}
            className={`p-2 rounded-sm transition-colors cursor-pointer ${
              width === w ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            <span
              className="block bg-white rounded-full"
              style={{ width: w + 2, height: w + 2 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
