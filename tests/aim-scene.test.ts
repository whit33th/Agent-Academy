import { afterEach, describe, expect, it, vi } from "vitest";
import { AimScene } from "../components/aim/scene";
import { createRange } from "../lib/aim/range";
import { AIM_TARGETS } from "../lib/aim/targets";
import { DEFAULT_AIM_SETTINGS } from "../lib/aim/settings";

afterEach(() => vi.unstubAllGlobals());
class Layer {
  writes = vi.fn();
  style = new Proxy({} as Record<string, string>, {
    set: (target, key: string, value: string) => {
      this.writes(key, value);
      target[key] = value;
      return true;
    },
  });
  classList = { toggle: vi.fn(), remove: vi.fn() };
  setAttribute = vi.fn();
  remove = vi.fn();
  sources: string[] = [];
  get src() {
    return this.sources.at(-1) ?? "";
  }
  set src(value: string) {
    this.sources.push(value);
  }
  decode = vi.fn(() => Promise.resolve());
}
function fixture(decoding: Promise<void> = Promise.resolve()) {
  const layers: Layer[] = [];
  vi.stubGlobal("document", { createElement: () => new Layer() });
  vi.stubGlobal(
    "Image",
    class extends Layer {
      override decode = vi.fn(() => decoding);
    },
  );
  const anchor = {
    width: 0,
    height: 0,
    parentElement: { append: (...items: Layer[]) => layers.push(...items) },
  };
  const scene = new AimScene(anchor as unknown as HTMLCanvasElement);
  const state = createRange(DEFAULT_AIM_SETTINGS);
  state.balls[0].yaw = state.balls[0].pitch = 0;
  state.balls[0].style = AIM_TARGETS[0].id;
  scene.resize(1920, 1080);
  return { scene, state, layers, anchor };
}
describe("native-resolution target layers", () => {
  it("waits for decode before showing images and reuses prepared nodes without swapping sources", async () => {
    let resolve!: () => void;
    const decoding = new Promise<void>((done) => {
      resolve = done;
    });
    const { scene, state, layers } = fixture(decoding);
    scene.render(state, 3);
    expect(layers.some((layer) => layer.style.display === "block")).toBe(false);
    resolve();
    await scene.ready;
    const images = layers.filter((layer) => layer.src);
    expect(images).toHaveLength(4);
    for (let index = 0; index < 40; index++) {
      state.balls[0].style = AIM_TARGETS[index % 4].id;
      scene.render(state, 3);
      expect(
        images.filter((image) => image.style.display === "block"),
      ).toHaveLength(1);
    }
    for (const image of images) {
      expect(image.sources).toHaveLength(1);
      expect(image.decode).toHaveBeenCalledOnce();
    }
    scene.dispose();
  });
  it("does not revive removed image layers after delayed decode completes", async () => {
    let resolve!: () => void;
    const decoding = new Promise<void>((done) => {
      resolve = done;
    });
    const { scene, state, layers } = fixture(decoding);
    scene.dispose();
    resolve();
    await scene.ready;
    scene.render(state, 3);
    expect(layers.some((layer) => layer.style.display === "block")).toBe(false);
    for (const layer of layers) expect(layer.remove).toHaveBeenCalledOnce();
  });
  it("does not repaint or mutate unchanged targets across 120 repeated frames", async () => {
    const { scene, state, layers } = fixture();
    await scene.ready;
    scene.render(state, 2, state.balls[0].id);
    layers.forEach((layer) => layer.writes.mockClear());
    for (let index = 0; index < 120; index++)
      scene.render(state, 2, state.balls[0].id);
    for (const layer of layers) expect(layer.writes).not.toHaveBeenCalled();
    state.yaw = 1;
    scene.render(state, 2);
    expect(layers[0].writes).toHaveBeenCalledWith(
      "transform",
      expect.stringContaining("matrix("),
    );
    scene.dispose();
  });
  it("uses HD sources and releases image layers without allocating a screen-sized buffer on 4K", async () => {
    const { scene, state, layers, anchor } = fixture();
    await scene.ready;
    scene.resize(3840, 2160);
    scene.render(state, 6);
    expect(layers[0].src).toMatch(/-hd\.webp$/);
    expect(anchor.width * anchor.height).toBe(1);
    scene.dispose();
    for (const layer of layers) expect(layer.remove).toHaveBeenCalledOnce();
  });
  it("clears the tracking outline when aim leaves the target or the target is offscreen", async () => {
    const { scene, state, layers } = fixture();
    await scene.ready;
    const target = state.balls[0];
    scene.render(state, 2, target.id);
    expect(layers[1].style.display).toBe("block");
    scene.render(state, 2, null);
    expect(layers[1].style.display).toBe("none");
    scene.render(state, 2, target.id);
    state.yaw = 180;
    scene.render(state, 2, target.id);
    expect(layers[0].style.display).toBe("none");
    expect(layers[1].style.display).toBe("none");
    scene.dispose();
  });
});
