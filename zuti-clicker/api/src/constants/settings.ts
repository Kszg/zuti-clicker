export const THEMES = ["dark", "light"] as const;
export const LANGUAGES = ["en", "hu"] as const;
export const PRESTIGE_CEREMONIES = ["full", "brief"] as const;
export const AUTOSAVE_INTERVALS = [15, 30, 60, 300] as const;

export type Theme = (typeof THEMES)[number];
export type Language = (typeof LANGUAGES)[number];
export type PrestigeCeremony = (typeof PRESTIGE_CEREMONIES)[number];

// Keep in sync with frontend/src/utils/settingsSchema.ts and
// frontend/src/utils/gameConstants.ts (AUTOSAVE_INTERVAL_OPTIONS).
export const DEFAULT_SETTINGS = {
  theme: "dark",
  language: "en",
  autosaveEnabled: true,
  autosaveIntervalSecs: 30,
  prestigeCeremony: "full",
  hideFromLeaderboards: false
} as const;
