import { v } from "convex/values";
export const preferences = v.object({
  musicEnabled: v.boolean(),
  musicVolume: v.number(),
  effectsEnabled: v.boolean(),
  effectsVolume: v.number(),
  voiceVolume: v.number(),
  backgroundVideo: v.boolean(),
  autoStart: v.boolean(),
  closeToTray: v.boolean(),
});
