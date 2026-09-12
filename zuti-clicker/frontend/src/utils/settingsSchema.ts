import { AUTOSAVE_INTERVAL_OPTIONS, DEFAULT_AUTOSAVE_INTERVAL_SECS } from "@/utils/gameConstants";
import type { Theme, Language, PrestigeCeremony } from "@/types";

export interface PersistedSettings {
  theme: Theme;
  language: Language;
  autosaveEnabled: boolean;
  autosaveIntervalSecs: number;
  prestigeCeremony: PrestigeCeremony;
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  theme: "dark",
  language: "en",
  autosaveEnabled: true,
  autosaveIntervalSecs: DEFAULT_AUTOSAVE_INTERVAL_SECS,
  prestigeCeremony: "full"
};

const THEMES: readonly Theme[] = ["dark", "light"];
const LANGUAGES: readonly Language[] = ["en", "hu"];
const CEREMONIES: readonly PrestigeCeremony[] = ["full", "brief"];

/**
 * Validates untrusted settings data (localStorage content is user-editable,
 * and a server response could in principle be stale/malformed) field by
 * field, falling back to the default for any field that doesn't check out
 * rather than rejecting the whole object.
 */
export function sanitizeSettings(raw: unknown): PersistedSettings {
  if (raw === null || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;

  const theme = THEMES.includes(r["theme"] as Theme) ? (r["theme"] as Theme) : DEFAULT_SETTINGS.theme;
  const language = LANGUAGES.includes(r["language"] as Language)
    ? (r["language"] as Language)
    : DEFAULT_SETTINGS.language;
  const autosaveEnabled =
    typeof r["autosaveEnabled"] === "boolean" ? r["autosaveEnabled"] : DEFAULT_SETTINGS.autosaveEnabled;
  const autosaveIntervalSecs = (AUTOSAVE_INTERVAL_OPTIONS as readonly number[]).includes(
    r["autosaveIntervalSecs"] as number
  )
    ? (r["autosaveIntervalSecs"] as number)
    : DEFAULT_SETTINGS.autosaveIntervalSecs;
  const prestigeCeremony = CEREMONIES.includes(r["prestigeCeremony"] as PrestigeCeremony)
    ? (r["prestigeCeremony"] as PrestigeCeremony)
    : DEFAULT_SETTINGS.prestigeCeremony;

  return { theme, language, autosaveEnabled, autosaveIntervalSecs, prestigeCeremony };
}
