import { projectTarget, type RangeState } from "@/lib/aim/range";
import { AIM_TARGETS } from "@/lib/aim/targets";

const IMAGE_SIZE = 1024;
interface TargetView {
  target: (typeof AIM_TARGETS)[number];
  image: HTMLImageElement;
  feedback: HTMLDivElement;
  transform: string;
  feedbackShape: string;
  tracked: boolean;
  visible: boolean;
}

/** One permanently sourced image per variant; active targets always have distinct artwork. */
export class AimScene {
  readonly ready: Promise<void>;
  private prepared = false;
  private width = 1;
  private height = 1;
  private views: TargetView[] = [];
  private disposed = false;
  constructor(private anchor: HTMLCanvasElement) {
    anchor.width = anchor.height = 1;
    for (const target of AIM_TARGETS) {
      const image = new Image();
      image.className = "aim-target";
      image.width = image.height = IMAGE_SIZE;
      image.draggable = false;
      image.decoding = "sync";
      image.alt = "";
      image.setAttribute("aria-hidden", "true");
      image.style.display = "none";
      image.src = target.src;
      const feedback = document.createElement("div");
      feedback.className = "aim-target-feedback";
      feedback.setAttribute("aria-hidden", "true");
      feedback.style.display = "none";
      anchor.parentElement!.append(image, feedback);
      this.views.push({
        target,
        image,
        feedback,
        transform: "",
        feedbackShape: "",
        tracked: false,
        visible: false,
      });
    }
    this.ready = Promise.all(
      this.views.map((view) => view.image.decode()),
    ).then(() => {
      if (!this.disposed) this.prepared = true;
    });
  }
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  render(state: RangeState, diameter: number, trackedId: number | null = null) {
    if (this.disposed || !this.prepared) return;
    for (const view of this.views) {
      const ball = state.balls.find((ball) => ball.style === view.target.id);
      const projection =
        ball && projectTarget(state, ball, diameter, this.width, this.height);
      if (!projection) {
        if (view.visible) {
          view.image.style.display = "none";
          view.visible = false;
        }
        if (view.tracked) {
          view.feedback.style.display = "none";
          view.image.classList.remove("is-tracked");
          view.tracked = false;
        }
        continue;
      }
      const { x, y, major: radius } = projection;
      const scale = radius / view.target.coreRadius / IMAGE_SIZE;
      const ox = view.target.centerX * IMAGE_SIZE,
        oy = view.target.centerY * IMAGE_SIZE;
      // Uniform scaling preserves the artwork; center position still uses the perspective camera.
      const transform = `matrix(${scale},0,0,${scale},${x - scale * ox},${y - scale * oy})`;
      if (transform !== view.transform) {
        view.image.style.transform = transform;
        view.transform = transform;
      }
      if (!view.visible) {
        view.image.style.display = "block";
        view.visible = true;
      }
      const tracked = trackedId === ball.id;
      if (view.tracked !== tracked) {
        view.image.classList.toggle("is-tracked", tracked);
        view.feedback.style.display = tracked ? "block" : "none";
        view.tracked = tracked;
      }
      const feedbackShape = `${x},${y},${radius}`;
      if (tracked && feedbackShape !== view.feedbackShape) {
        Object.assign(view.feedback.style, {
          width: `${radius * 2}px`,
          height: `${radius * 2}px`,
          transform: `translate(${x - radius}px,${y - radius}px)`,
        });
        view.feedbackShape = feedbackShape;
      }
    }
  }
  dispose() {
    this.disposed = true;
    for (const view of this.views) {
      view.image.remove();
      view.feedback.remove();
    }
    this.views.length = 0;
    this.anchor.width = this.anchor.height = 1;
  }
}
