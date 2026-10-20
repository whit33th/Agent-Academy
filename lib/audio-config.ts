import { SoundDef } from "./audio-types";
export const AUDIO_CONFIG: Record<string, SoundDef> = {
  click: { url: "/sounds/effects/choose.mp3", volume: 1 },
  modalOpen: { url: "/sounds/effects/modal-opened(1).mp3", volume: 0.17 },
  mapFound: { url: "/sounds/effects/map-found.mp3", volume: 0.15 },
  ambient: { url: "/sounds/effects/wind.mp3", volume: 0.8 },
  voiceLine: { url: "", volume: 0.1 },
};
