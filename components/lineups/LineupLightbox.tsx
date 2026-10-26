"use client";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { Screenshot } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import { getYouTubeEmbedUrl, isSafeSourceUrl } from "@/lib/lineups/media";
import LineupImage from "./LineupImage";
import LineupMetadataBadges from "./LineupMetadataBadges";
interface Props {
  screenshots: Screenshot[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}
export default function LineupLightbox(props: Props) {
  const current = props.screenshots[props.currentIndex];
  return props.isOpen && current ? (
    <Gallery key={current._id} current={current} {...props} />
  ) : null;
}
function Gallery({
  current,
  screenshots,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}: Props & { current: Screenshot }) {
  const images = current.images?.length
    ? current.images
    : current.image
      ? [{ imageUrl: current.tempPreview ?? current.image, caption: "" }]
      : [];
  const [index, setIndex] = useState(
    Math.min(current.coverIndex ?? 0, Math.max(images.length - 1, 0)),
  );
  const embed = current.videoUrl ? getYouTubeEmbedUrl(current.videoUrl) : null;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input,textarea,select,[contenteditable=true]")
      )
        return;
      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        if (images.length < 2) {
          if (event.key === "ArrowRight") onNext();
          else onPrev();
          return;
        }
        setIndex(
          (value) =>
            (value + (event.key === "ArrowRight" ? 1 : images.length - 1)) %
            images.length,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onNext, onPrev]);
  const activeIndex = Math.min(index, Math.max(0, images.length - 1));
  const image = images[activeIndex];
  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="lineup-detail-title"
      className="w-full max-w-5xl bg-val-bg border border-white/10 my-4 text-white clip-angular shadow-2xl"
    >
      <header className="flex justify-between items-center p-4 gap-3">
        <h2 id="lineup-detail-title" className="font-oswald text-xl uppercase">
          {current.title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {current.videoUrl && isSafeSourceUrl(current.videoUrl) ? (
            <a
              href={current.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open original video"
              title="Open original video"
              className="flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ExternalLink size={18} />
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lineup details"
            className="flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-val-red/30 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </header>
      {image ? (
        <figure>
          <div className="relative aspect-video max-h-[60vh] bg-black/40">
            <LineupMetadataBadges metadata={current.metadata} />
            <LineupImage
              src={image.imageUrl}
              alt={image.caption || current.title}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-contain"
              priority
            />
          </div>
          <figcaption className="px-4 py-2 text-sm whitespace-pre-wrap">
            {image.caption}
          </figcaption>
          {images.length > 1 ? (
            <div className="px-4 flex items-center gap-3 text-sm">
              <button
                type="button"
                className="flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                onClick={() =>
                  setIndex((activeIndex + images.length - 1) % images.length)
                }
                aria-label="Previous image"
              >
                <ChevronLeft size={18} />
              </button>
              <span aria-live="polite">
                {activeIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                className="flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                onClick={() => setIndex((activeIndex + 1) % images.length)}
                aria-label="Next image"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : null}
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto p-4">
              {images.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={i === activeIndex}
                  onClick={() => setIndex(i)}
                  className={`relative h-16 w-24 shrink-0 border ${i === activeIndex ? "border-val-red" : "border-white/15"}`}
                >
                  <LineupImage
                    src={item.imageUrl}
                    alt={item.caption || `Step ${i + 1}`}
                    fill
                    sizes="96px"
                    className="object-contain"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </figure>
      ) : null}
      <div className="p-4 space-y-4">
        {!image ? (
          <LineupMetadataBadges metadata={current.metadata} inline />
        ) : null}
        <p className="text-xs uppercase text-val-teal">
          {current.map?.name} / {current.agent?.name}
        </p>
        {current.description ? (
          <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
            {current.description}
          </p>
        ) : null}
        {embed ? (
          <iframe
            src={embed}
            title={`${current.title} video guide`}
            className="aspect-video w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : null}
        {screenshots.length > 1 ? (
          <nav
            aria-label="Lineup navigation"
            className="flex flex-wrap justify-between items-center gap-2 border-t border-white/10 pt-3 text-sm"
          >
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous lineup"
              className="flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {currentIndex + 1} / {screenshots.length}
            </span>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next lineup"
              className="flex size-10 items-center justify-center clip-angular-sm bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        ) : null}
      </div>
    </Modal>
  );
}
