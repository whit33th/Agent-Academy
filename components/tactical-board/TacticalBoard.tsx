"use client";
import { useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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
import Image from "@/components/ui/CatalogImage";
import { useDialogFocus } from "@/lib/utils/useDialogFocus";
import { audio } from "@/lib/audio";
import {
  ACTIVE_SLOTS,
  BOARD_LIMITS,
  COLORS,
  WIDTHS,
  type Tool,
} from "@/lib/board/types";
import { findAbilityDefinition, getAbilityDefinition } from "@/lib/board/data";
import { modeGeometry } from "@/lib/board/geometry";
import type { BoardController } from "@/lib/board/controller";
import { BoardObjects, InkLayer } from "./BoardScene";
import {
  useTacticalBoardSession,
  type TacticalBoardProps,
} from "./useTacticalBoardSession";

export default function TacticalBoard(props: TacticalBoardProps) {
  // The entry is dynamically loaded with ssr:false. Mount effects after the portal exists.
  return createPortal(<BoardSession {...props} />, document.body);
}
function BoardSession(props: TacticalBoardProps) {
  const { map: catalogMap, allAgents, onClose } = props;
  const {
    controller,
    map,
    ui,
    overlayRef,
    agentStripRef,
    selectedAgent,
    setSelectedAgent,
    handleShare,
  } = useTacticalBoardSession(props);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, true);
  const cursor =
    ui.armedAbility ||
    ui.armedAgent ||
    ui.sourceTarget ||
    ui.extraTarget ||
    ui.tool !== "select"
      ? "crosshair"
      : "default";
  return (
    <div
      ref={dialogRef}
      data-tactical-board
      role="dialog"
      aria-modal="true"
      aria-label="Tactical board"
      className="fixed inset-x-0 bottom-0 top-[var(--desktop-titlebar-height,0px)] z-[250] bg-black/95 backdrop-blur-sm flex flex-col"
    >
      {ui.error && (
        <p
          role="alert"
          className="absolute left-1/2 top-14 z-30 max-w-[90%] -translate-x-1/2 rounded-sm border border-white/10 bg-val-surface px-4 py-2 text-sm text-val-red shadow-lg pointer-events-none"
        >
          {ui.error}
        </p>
      )}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-val-surface/95 border-b border-white/10">
        <h2 className="font-oswald text-base font-bold uppercase tracking-wider text-white">
          Strat Board — <span className="text-val-red">{catalogMap.name}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <Toolbar
            tool={ui.tool}
            color={ui.color}
            width={ui.width}
            onToolChange={controller.setTool}
            onColorChange={controller.setColor}
            onWidthChange={controller.setWidth}
          />
          <ToolIconButton onClick={controller.undo} label="Undo">
            <Undo2 size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={handleShare} label="Copy share link">
            <Share2 size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={controller.reset} label="Reset board">
            <Trash size={14} />
          </ToolIconButton>
          <ToolIconButton onClick={onClose} label="Close">
            <X size={14} />
          </ToolIconButton>
        </div>
      </header>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative flex-1 flex justify-center items-center p-3 min-h-0 overflow-hidden">
          <div
            ref={overlayRef}
            data-board-map={map.mapId}
            data-board-phase={ui.phase}
            className="relative aspect-square h-full max-w-full touch-none select-none overflow-hidden"
            style={{
              cursor,
              aspectRatio: `${map.radarWidth} / ${map.radarHeight}`,
            }}
          >
            <Image
              src={map.radar}
              alt={catalogMap.name}
              fill
              draggable={false}
              priority
              sizes="(max-width: 1280px) 100vw, 1400px"
              quality={95}
              className="object-contain pointer-events-none"
            />
            <InkLayer controller={controller} />
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              {map.callouts.map((callout, index) => {
                const site =
                  callout.regionName.toLowerCase() === "site" &&
                  callout.superRegion;
                return (
                  <div
                    key={`${callout.regionName}-${index}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${callout.x * 100}%`,
                      top: `${callout.y * 100}%`,
                    }}
                  >
                    {site ? (
                      <span className="grid size-7 place-items-center rounded-sm border border-val-teal/60 bg-black/55 font-oswald text-base font-bold text-white shadow-[0_0_16px_rgba(0,243,255,0.2)]">
                        {callout.superRegion}
                      </span>
                    ) : (
                      <span className="whitespace-nowrap rounded-sm bg-black/45 px-1 py-px font-oswald text-[10px] uppercase tracking-wide text-white/70">
                        {callout.regionName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <BoardObjects controller={controller} />
          </div>
          <ObjectControls controller={controller} />
        </div>
        {selectedAgent && (
          <div className="flex items-center gap-1.5 px-4 py-2 justify-center bg-val-surface/90 border-t border-white/10 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1.5">
              {ACTIVE_SLOTS.map((slot) => {
                const definition = findAbilityDefinition(
                  selectedAgent._id,
                  slot,
                )!;
                const isArmed = ui.armedAbility === definition.id;
                const badge = {
                  circle: "AOE",
                  sector: "CONE",
                  strip: "AOE",
                  wall: "WALL",
                  path: "PATH",
                  segment: "LINE",
                  cross: "X",
                  teleport: "",
                  marker: "",
                  "global-line": "WALL",
                  "ground-volume": "AOE",
                  facing: "",
                  "compound-wall": "WALL",
                }[definition.modes[0].geometry.kind];
                return (
                  <button
                    key={slot}
                    type="button"
                    aria-label={definition.name}
                    aria-pressed={isArmed}
                    data-board-ability={definition.id}
                    onClick={() => {
                      audio.playClick();
                      controller.armAbility(isArmed ? null : definition.id);
                    }}
                    title={definition.name}
                    className={`relative size-10 xl:size-14 rounded-sm border transition-colors cursor-pointer ${isArmed ? "border-val-red bg-val-red/20" : "border-white/10 bg-white/5 hover:border-white/40"}`}
                  >
                    {definition.icon && (
                      <Image
                        src={definition.icon}
                        alt={definition.name}
                        fill
                        sizes="96px"
                        quality={90}
                        className="object-contain p-1"
                      />
                    )}
                    {badge && (
                      <span className="absolute -bottom-1 -right-1 rounded-xs bg-black/90 px-1 py-0.5 text-[7px] font-black uppercase leading-none text-val-teal ring-1 ring-val-teal/40">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Place agent token"
              aria-pressed={ui.armedAgent === selectedAgent._id}
              onClick={() => {
                audio.playClick();
                controller.armAgent(ui.armedAgent ? null : selectedAgent._id);
              }}
              title="Place agent token on map"
              className={`flex relative items-center gap-1.5 w-auto aspect-square justify-center self-stretch min-w-10 rounded-full border-2 border-white text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer ${ui.armedAgent ? "border-val-teal bg-val-teal/20 text-val-teal" : "bg-white/5 text-white/70 hover:text-white"}`}
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
        <div
          ref={agentStripRef}
          className="flex items-center gap-2 px-4 py-3 bg-val-surface/95 border-t border-white/10 overflow-x-auto custom-scrollbar"
        >
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40 font-bold mr-2 shrink-0">
            <Users size={12} /> Agents
          </span>
          {allAgents.map((agent) => {
            const isSelected = selectedAgent?._id === agent._id,
              icon = agent.displayIcon || agent.imageUrl;
            return (
              <button
                key={agent._id}
                type="button"
                title={agent.name}
                aria-label={agent.name}
                aria-pressed={isSelected}
                onClick={() => {
                  audio.playClick();
                  setSelectedAgent(isSelected ? null : agent);
                  controller.armAbility(null);
                }}
                onMouseEnter={() => audio.playHover()}
                className={`relative shrink-0 size-12 xl:size-16 rounded-sm border overflow-hidden transition-[border-color,transform,box-shadow] cursor-pointer ${isSelected ? "border-val-red scale-110 ring-2 ring-val-red/40" : "border-white/10 bg-white/5 hover:border-white/40"}`}
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
    </div>
  );
}
function ObjectControls({ controller }: { controller: BoardController }) {
  const ui = useSyncExternalStore(
    controller.subscribeUi,
    controller.getUi,
    controller.getUi,
  );
  const object = useSyncExternalStore(
    controller.store.subscribe,
    () =>
      ui.selected ? controller.store.getObject(ui.selected.id) : undefined,
    () => undefined,
  );
  if (!object) return null;
  const definition =
    object.kind === "ability"
      ? getAbilityDefinition(object.definitionId)
      : null;
  const geometry =
    object.kind === "ability" ? modeGeometry(definition!, object) : null;
  return (
    <div
      data-board-object-controls
      className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-sm border border-white/10 bg-val-surface/95 px-2 py-1.5 text-[11px] text-white/70 shadow-lg"
    >
      {definition && (
        <span className="px-1 font-bold text-white">{definition.name}</span>
      )}
      {object.kind === "ability" &&
        definition!.modes.length > 1 &&
        definition!.modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            aria-pressed={object.mode === mode.id}
            onClick={() => controller.setMode(object.id, mode.id)}
            className={`rounded-sm px-2 py-1 transition-colors ${object.mode === mode.id ? "bg-val-red/20 text-white" : "hover:bg-white/10"}`}
          >
            {mode.label}
          </button>
        ))}
      {object.kind === "ability" && geometry!.kind === "teleport" && (
        <button
          type="button"
          aria-pressed={Boolean(object.source) || ui.sourceTarget === object.id}
          onClick={() => controller.toggleSource(object.id)}
          className="rounded-sm px-2 py-1 hover:bg-white/10"
        >
          {object.source
            ? "Remove source"
            : ui.sourceTarget === object.id
              ? "Click source on map"
              : "Add source"}
        </button>
      )}
      {object.kind === "ability" && geometry!.kind === "path" && (
        <>
          <button
            type="button"
            onClick={() => controller.addPathPoint(object.id)}
            disabled={object.points.length >= BOARD_LIMITS.routePoints}
            className="rounded-sm px-2 py-1 hover:bg-white/10 disabled:opacity-30"
          >
            Add point
          </button>
          <button
            type="button"
            onClick={() => controller.removePathPoint(object.id)}
            disabled={object.points.length < 2}
            className="rounded-sm px-2 py-1 hover:bg-white/10 disabled:opacity-30"
          >
            Remove point
          </button>
        </>
      )}
      {object.kind === "ability" &&
        geometry?.kind === "path" &&
        (geometry.maxRoutes ?? 1) > 1 && (
          <>
            <button
              type="button"
              onClick={() => controller.addRoute(object.id)}
              disabled={
                (object.routes?.length ?? 0) >= (geometry.maxRoutes ?? 1) - 1
              }
              className="rounded-sm px-2 py-1 hover:bg-white/10 disabled:opacity-30"
            >
              Add route
            </button>
            <button
              type="button"
              onClick={() => controller.removeRoute(object.id)}
              disabled={!object.routes?.length}
              className="rounded-sm px-2 py-1 hover:bg-white/10 disabled:opacity-30"
            >
              Remove route
            </button>
          </>
        )}
      {object.kind === "ability" &&
        (definition!.modes.find((mode) => mode.id === object.mode)?.targets ??
          1) > 1 && (
          <>
            <button
              type="button"
              onClick={() => controller.addTarget(object.id)}
              disabled={
                object.points.length >=
                definition!.modes.find((mode) => mode.id === object.mode)!
                  .targets! -
                  1
              }
              className="rounded-sm px-2 py-1 hover:bg-white/10 disabled:opacity-30"
            >
              {ui.extraTarget === object.id
                ? "Click target on map"
                : "Add target"}
            </button>
            <button
              type="button"
              onClick={() => controller.removeTarget(object.id)}
              disabled={!object.points.length}
              className="rounded-sm px-2 py-1 hover:bg-white/10 disabled:opacity-30"
            >
              Remove target
            </button>
          </>
        )}
      {object.kind === "ability" &&
        definition!.ownerActivationRadius !== undefined && (
          <button
            type="button"
            aria-pressed={Boolean(object.showOwnerRange)}
            onClick={() => controller.toggleOwnerRange(object.id)}
            className="rounded-sm px-2 py-1 hover:bg-white/10"
          >
            Owner activation range
          </button>
        )}
      <button
        type="button"
        onClick={() => controller.remove(object.id)}
        aria-label="Delete selected object"
        title="Delete selected object"
        className="rounded-sm p-1.5 hover:bg-white/10 hover:text-white"
      >
        <Trash size={13} />
      </button>
    </div>
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
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
}) {
  const tools = [
    { key: "select", icon: <MoveUpRight size={14} />, label: "Select" },
    { key: "pen", icon: <Pencil size={14} />, label: "Pen" },
    { key: "line", icon: <Minus size={14} />, label: "Line" },
    { key: "arrow", icon: <MoveUpRight size={14} />, label: "Arrow" },
    { key: "eraser", icon: <Eraser size={14} />, label: "Eraser" },
  ] as const;
  return (
    <div className="flex items-center gap-2 mr-1 pr-2 border-r border-white/10">
      <div className="flex items-center gap-0.5">
        {tools.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onToolChange(item.key)}
            title={item.label}
            aria-label={item.label}
            aria-pressed={tool === item.key}
            className={`p-2 rounded-sm transition-colors cursor-pointer ${tool === item.key ? "bg-val-red text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {COLORS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onColorChange(value)}
            title={value}
            aria-label={`Color ${value}`}
            aria-pressed={color === value}
            className={`size-4 xl:size-5 rounded-full border transition-transform cursor-pointer ${color === value ? "scale-125 border-white" : "border-white/20"}`}
            style={{ backgroundColor: value }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        {WIDTHS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onWidthChange(value)}
            title={`Width ${value}px`}
            aria-label={`Width ${value}`}
            aria-pressed={width === value}
            className={`p-2 rounded-sm transition-colors cursor-pointer ${width === value ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <span
              className="block bg-white rounded-full"
              style={{ width: value + 2, height: value + 2 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
