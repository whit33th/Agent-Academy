"use client";
import { type SoundDef, resolvePublicUrl } from "./audio-types";
import { AUDIO_CONFIG } from "./audio-config";
import { DEFAULT_PREFERENCES, type AppPreferences } from "./settings/model";

class AudioManager {
  private settings: AppPreferences = DEFAULT_PREFERENCES;
  private ambientAudio: HTMLAudioElement | null = null;
  configure(settings: AppPreferences) {
    this.settings = settings;
    if (settings.musicEnabled && settings.musicVolume > 0) this.ensureAmbient();
    else this.stopAmbient();
    if (this.ambientAudio)
      this.ambientAudio.volume =
        settings.musicVolume * (AUDIO_CONFIG.ambient?.volume ?? 1);
  }
  private playFile(def: SoundDef) {
    if (
      !this.settings.effectsEnabled ||
      this.settings.effectsVolume <= 0 ||
      !def.url
    )
      return;
    try {
      const sound = new Audio(resolvePublicUrl(def.url));
      sound.volume = Math.max(
        0,
        Math.min(1, this.settings.effectsVolume * (def.volume ?? 1)),
      );
      void sound.play().catch(() => {});
    } catch {
      /* Audio can be unavailable until a user gesture. */
    }
  }
  playClick() {
    const def = AUDIO_CONFIG.click;
    if (def) this.playFile(def);
  }
  playHover() {
    const def = AUDIO_CONFIG.hover;
    if (def) this.playFile(def);
  }
  playModalOpen() {
    const def = AUDIO_CONFIG.modalOpen;
    if (def) this.playFile(def);
  }
  playMapFound() {
    const def = AUDIO_CONFIG.mapFound;
    if (def) this.playFile(def);
  }
  playBack() {
    const def = AUDIO_CONFIG.back;
    if (def) this.playFile(def);
  }
  private stopAmbient() {
    if (!this.ambientAudio) return;
    this.ambientAudio.pause();
    this.ambientAudio.currentTime = 0;
    this.ambientAudio = null;
  }
  ensureAmbient() {
    if (
      typeof window === "undefined" ||
      !this.settings.musicEnabled ||
      this.settings.musicVolume <= 0
    )
      return;
    const def = AUDIO_CONFIG.ambient;
    if (!def?.url) return;
    if (!this.ambientAudio) {
      this.ambientAudio = new Audio(resolvePublicUrl(def.url));
      this.ambientAudio.loop = true;
      this.ambientAudio.volume = this.settings.musicVolume * (def.volume ?? 1);
    }
    if (this.ambientAudio.paused) void this.ambientAudio.play().catch(() => {});
  }
}
export const audio = new AudioManager();
