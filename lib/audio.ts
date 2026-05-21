"use client";

import { SoundDef, resolvePublicUrl } from "./audio-types";
import { AUDIO_CONFIG } from "./audio-config";

class AudioManager {
  private masterVolume = 0.4;
  private ambientEnabled = true;
  private ambientAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== "undefined") this.loadSettings();
  }

  private loadSettings() {
    try {
      const vol = localStorage.getItem("vp_master_volume");
      const amb = localStorage.getItem("vp_ambient_enabled");
      if (vol !== null) this.masterVolume = parseFloat(vol);
      if (amb !== null) this.ambientEnabled = amb === "true";
    } catch (e) {
      console.warn("Audio settings load failed", e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem("vp_master_volume", this.masterVolume.toString());
      localStorage.setItem(
        "vp_ambient_enabled",
        this.ambientEnabled.toString(),
      );
    } catch (e) {
      console.warn("Audio settings save failed", e);
    }
  }

  init() {
    // No-op — ambient auto-starts on first interaction via ensureAmbient
  }

  getVolume() {
    return this.masterVolume;
  }

  getVoiceVolume() {
    return AUDIO_CONFIG.voiceLine?.volume;
  }

  setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
    this.updateAmbientVolume();
  }

  isAmbientEnabled() {
    return this.ambientEnabled;
  }

  setAmbientEnabled(enabled: boolean) {
    this.ambientEnabled = enabled;
    this.saveSettings();
    if (enabled) this.startAmbient();
    else this.stopAmbient();
  }

  private playFile(def: SoundDef) {
    if (this.masterVolume <= 0 || !def.url) return;
    try {
      const audio = new Audio(resolvePublicUrl(def.url));
      audio.volume = this.masterVolume * (def.volume ?? 1);
      audio.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  playClick() {
    const def = AUDIO_CONFIG.click;
    if (!def) return;
    this.playFile(def);
  }

  playHover() {
    const def = AUDIO_CONFIG.hover;
    if (!def) return;
    this.playFile(def);
  }

  playModalOpen() {
    const def = AUDIO_CONFIG.modalOpen;
    if (!def) return;
    this.playFile(def);
  }

  playMapFound() {
    const def = AUDIO_CONFIG.mapFound;
    if (!def) return;
    this.playFile(def);
  }

  playBack() {
    const def = AUDIO_CONFIG.back;
    if (!def) return;
    this.playFile(def);
  }

  // --- Ambient ---

  private startAmbient() {
    if (typeof window === "undefined") return;
    const def = AUDIO_CONFIG.ambient;
    if (!def?.url) return;
    if (!this.ambientAudio) {
      this.ambientAudio = new Audio(resolvePublicUrl(def.url));
      this.ambientAudio.loop = true;
    }
    this.updateAmbientVolume();
    this.ambientAudio.play().catch(() => {});
  }

  private stopAmbient() {
    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
      this.ambientAudio = null;
    }
  }

  private updateAmbientVolume() {
    const mult = AUDIO_CONFIG.ambient?.volume ?? 1;
    const vol = this.ambientEnabled ? this.masterVolume * mult : 0;
    if (this.ambientAudio) this.ambientAudio.volume = vol;
  }

  ensureAmbient() {
    if (!this.ambientEnabled || this.masterVolume <= 0) return;
    if (this.ambientAudio && this.ambientAudio.paused) {
      this.ambientAudio.play().catch(() => {});
    }
    if (!this.ambientAudio) this.startAmbient();
  }
}

export const audio = new AudioManager();
