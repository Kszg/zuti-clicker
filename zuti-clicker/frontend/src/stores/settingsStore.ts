import { defineStore } from "pinia";
import { ref, watch, nextTick } from "vue";
import { api, ApiError } from "@/lib/api";
import { i18n } from "@/i18n";
import { useAuthStore } from "./authStore";
import { DEFAULT_SETTINGS, sanitizeSettings } from "@/utils/settingsSchema";
import type { Theme, Language, PrestigeCeremony } from "@/types";

const STORAGE_KEY = "zuti-clicker:settings";
const PUSH_DEBOUNCE_MS = 800;

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ...DEFAULT_SETTINGS };
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    // Private browsing, quota exceeded, or corrupted JSON — fall back rather
    // than let a storage quirk break the app.
    return { ...DEFAULT_SETTINGS };
  }
}

export const useSettingsStore = defineStore("settings", () => {
  const auth = useAuthStore();
  const initial = readStoredSettings();

  const theme = ref<Theme>(initial.theme);
  const language = ref<Language>(initial.language);
  const autosaveEnabled = ref<boolean>(initial.autosaveEnabled);
  const autosaveIntervalSecs = ref<number>(initial.autosaveIntervalSecs);
  const prestigeCeremony = ref<PrestigeCeremony>(initial.prestigeCeremony);

  // Set while a server value is being applied locally, so the persistence
  // watcher below doesn't immediately push it right back to the server.
  let _applying = false;
  let _pushTimer: ReturnType<typeof setTimeout> | null = null;

  function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }

  function setLanguage(lang: Language) {
    language.value = lang;
  }

  function setPrestigeCeremony(mode: PrestigeCeremony) {
    prestigeCeremony.value = mode;
  }

  function _writeLocalStorage() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          theme: theme.value,
          language: language.value,
          autosaveEnabled: autosaveEnabled.value,
          autosaveIntervalSecs: autosaveIntervalSecs.value,
          prestigeCeremony: prestigeCeremony.value
        })
      );
    } catch {
      // Ignore storage failures — localStorage is a convenience cache here,
      // not the source of truth for a logged-in player.
    }
  }

  function _schedulePush() {
    if (!auth.isLoggedIn) return;
    if (_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(() => {
      void api.settings
        .store({
          theme: theme.value,
          language: language.value,
          autosaveEnabled: autosaveEnabled.value,
          autosaveIntervalSecs: autosaveIntervalSecs.value,
          prestigeCeremony: prestigeCeremony.value
        })
        .catch(() => {
          // Settings are not critical enough to surface a sync error for.
        });
    }, PUSH_DEBOUNCE_MS);
  }

  watch(theme, (t) => document.documentElement.setAttribute("data-theme", t), { immediate: true });
  watch(language, (l) => {
    i18n.global.locale.value = l;
  }, { immediate: true });

  watch(
    [theme, language, autosaveEnabled, autosaveIntervalSecs, prestigeCeremony],
    () => {
      _writeLocalStorage();
      if (!_applying) _schedulePush();
    }
  );

  /**
   * Called on login. Server wins over whatever the guest/local session had —
   * consistent with how the game save itself is loaded — except when no
   * settings have ever been saved for this account (updatedAt === null), in
   * which case the local values are pushed up to seed the account instead of
   * being silently discarded.
   */
  async function loadFromServer(): Promise<void> {
    if (!auth.isLoggedIn) return;
    try {
      const { settings } = await api.settings.load();
      if (settings.updatedAt === null) {
        _schedulePush();
        return;
      }
      _applying = true;
      const sanitized = sanitizeSettings(settings);
      theme.value = sanitized.theme;
      language.value = sanitized.language;
      autosaveEnabled.value = sanitized.autosaveEnabled;
      autosaveIntervalSecs.value = sanitized.autosaveIntervalSecs;
      prestigeCeremony.value = sanitized.prestigeCeremony;
      _writeLocalStorage();
    } catch (e) {
      void (e as ApiError | Error);
      // Keep local settings; this is not critical enough to surface an error.
    } finally {
      // The persistence watcher below is scheduled (not run synchronously) on
      // a ref mutation, so `_applying` must still be true when it flushes —
      // otherwise applying a server value would immediately push it right
      // back. `nextTick()` waits for that flush before clearing the guard.
      await nextTick();
      _applying = false;
    }
  }

  return {
    theme,
    language,
    autosaveEnabled,
    autosaveIntervalSecs,
    prestigeCeremony,
    toggleTheme,
    setLanguage,
    setPrestigeCeremony,
    loadFromServer
  };
});
