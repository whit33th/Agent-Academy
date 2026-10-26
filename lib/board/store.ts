import { BOARD_LIMITS, type BoardDocumentV2, type BoardObject } from "./types";

export interface BoardCommand {
  label: string;
  before: readonly BoardObject[];
  after: readonly BoardObject[];
}

/** Only committed gestures notify React. Preview data belongs to the controller. */
export class BoardStore {
  private document: BoardDocumentV2;
  private past: BoardCommand[] = [];
  private future: BoardCommand[] = [];
  private listeners = new Set<() => void>();
  private objectListeners = new Map<string, Set<() => void>>();
  private structureListeners = new Set<() => void>();
  private ids: readonly string[];
  private byId: Map<string, BoardObject>;

  constructor(document: BoardDocumentV2) {
    this.document = document;
    this.ids = document.objects.map((object) => object.id);
    this.byId = new Map(document.objects.map((object) => [object.id, object]));
  }

  getSnapshot = () => this.document;
  getIds = () => this.ids;
  getObject = (id: string) => this.byId.get(id);
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  subscribeStructure = (listener: () => void) => {
    this.structureListeners.add(listener);
    return () => {
      this.structureListeners.delete(listener);
    };
  };
  subscribeObject = (id: string, listener: () => void) => {
    let listeners = this.objectListeners.get(id);
    if (!listeners) this.objectListeners.set(id, (listeners = new Set()));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.objectListeners.delete(id);
    };
  };

  private publish(objects: readonly BoardObject[]) {
    const previous = this.document.objects;
    this.document = { ...this.document, objects };
    const oldById = new Map(previous.map((object) => [object.id, object]));
    const newById = new Map(objects.map((object) => [object.id, object]));
    this.byId = newById;
    for (const id of new Set([...oldById.keys(), ...newById.keys()])) {
      if (oldById.get(id) !== newById.get(id))
        this.objectListeners.get(id)?.forEach((listener) => listener());
    }
    if (
      objects.length !== previous.length ||
      objects.some((object, i) => object.id !== previous[i]?.id)
    ) {
      this.ids = objects.map((object) => object.id);
      this.structureListeners.forEach((listener) => listener());
    }
    this.listeners.forEach((listener) => listener());
  }

  commit(label: string, objects: readonly BoardObject[]) {
    const before = this.document.objects;
    if (
      objects === before ||
      (objects.length === before.length &&
        objects.every((object, i) => object === before[i]))
    )
      return;
    let points = 0,
      abilities = 0,
      agents = 0,
      strokes = 0;
    for (const object of objects) {
      if (object.kind === "stroke") {
        strokes++;
        points += object.points.length;
      } else if (object.kind === "ability") {
        abilities++;
        if (
          object.points.length > BOARD_LIMITS.routePoints ||
          (object.routes?.length ?? 0) >= BOARD_LIMITS.routes ||
          object.routes?.some(
            (route) => route.length > BOARD_LIMITS.routePoints,
          )
        )
          throw new Error("This route has too many control points.");
      } else agents++;
    }
    if (
      abilities > BOARD_LIMITS.abilities ||
      agents > BOARD_LIMITS.agents ||
      strokes > BOARD_LIMITS.strokes ||
      points > BOARD_LIMITS.points
    )
      throw new Error(
        "This board is full. Remove objects or drawing points before adding more.",
      );
    this.past.push({ label, before, after: objects });
    if (this.past.length > 100) this.past.shift();
    this.future = [];
    this.publish(objects);
  }

  add(object: BoardObject) {
    this.commit("Add", [...this.document.objects, object]);
  }
  replace(object: BoardObject) {
    this.commit(
      "Edit",
      this.document.objects.map((old) => (old.id === object.id ? object : old)),
    );
  }
  remove(id: string) {
    this.commit(
      "Delete",
      this.document.objects.filter((object) => object.id !== id),
    );
  }
  reset() {
    this.commit("Reset", []);
  }
  undo() {
    const command = this.past.pop();
    if (command) {
      this.future.push(command);
      this.publish(command.before);
    }
  }
  redo() {
    const command = this.future.pop();
    if (command) {
      this.past.push(command);
      this.publish(command.after);
    }
  }
}
