import { defineStore } from "pinia";
import { ref, watch, nextTick } from "vue";
import { api, ApiError } from "@/lib/api";
import { i18n } from "@/i18n";
import { useAuthStore } from "./authStore";
import { DEFAULT_SETTINGS, sanitizeSettings } from "@/utils/settingsSchema";
import type { Theme, Language, PrestigeCeremony } from "@/types";

const STORAGE_KEY = "zuti-clicker:settings";
const PUSH_DEBOUNCE_MS = 800;

export interface SettingsSnapshot {
  theme: Theme;
  language: Language;
  autosaveEnabled: boolean;
  autosaveIntervalSecs: number;
  prestigeCeremony: PrestigeCeremony;
  hideFromLeaderboards: boolean;
}

export type FlushPushResult =
  | { ok: true; local: true } // guest: only localStorage was written
  | { ok: true; local: false } // logged in, server accepted the write
  | { ok: false; local: false }; // logged in, server push failed

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
  const hideFromLeaderboards = ref<boolean>(initial.hideFromLeaderboards);

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

  // Cancel/Esc support for the settings modal's live-preview model: snapshot
  // on open, restore() on cancel. restore() intentionally does NOT set
  // `_applying` — it goes through the normal persistence watcher below, so a
  // cancel also corrects any stray debounced push that already fired for a
  // previewed-then-abandoned change.
  function snapshot(): SettingsSnapshot {
    return {
      theme: theme.value,
      language: language.value,
      autosaveEnabled: autosaveEnabled.value,
      autosaveIntervalSecs: autosaveIntervalSecs.value,
      prestigeCeremony: prestigeCeremony.value,
      hideFromLeaderboards: hideFromLeaderboards.value
    };
  }

  function restore(snap: SettingsSnapshot) {
    theme.value = snap.theme;
    language.value = snap.language;
    autosaveEnabled.value = snap.autosaveEnabled;
    autosaveIntervalSecs.value = snap.autosaveIntervalSecs;
    prestigeCeremony.value = snap.prestigeCeremony;
    hideFromLeaderboards.value = snap.hideFromLeaderboards;
  }

  // Used by the settings modal's "Done" button: unlike the normal debounced
  // push (fire-and-forget, errors swallowed — fine for an incidental change
  // like the header's theme toggle), Done needs to know whether the save
  // actually landed so it can report it.
  async function flushPush(): Promise<FlushPushResult> {
    if (_pushTimer) {
      clearTimeout(_pushTimer);
      _pushTimer = null;
    }
    if (!auth.isLoggedIn) return { ok: true, local: true };
    try {
      await api.settings.store({
        theme: theme.value,
        language: language.value,
        autosaveEnabled: autosaveEnabled.value,
        autosaveIntervalSecs: autosaveIntervalSecs.value,
        prestigeCeremony: prestigeCeremony.value,
        hideFromLeaderboards: hideFromLeaderboards.value
      });
      return { ok: true, local: false };
    } catch {
      return { ok: false, local: false };
    }
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
          prestigeCeremony: prestigeCeremony.value,
          hideFromLeaderboards: hideFromLeaderboards.value
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
          prestigeCeremony: prestigeCeremony.value,
          hideFromLeaderboards: hideFromLeaderboards.value
        })
        .catch(() => {
          // Settings are not critical enough to surface a sync error for.
        });
    }, PUSH_DEBOUNCE_MS);
  }

  watch(theme, (t) => document.documentElement.setAttribute("data-theme", t), { immediate: true });
  watch(language, (l) => {
    i18n.global.locale.value = l;
    document.documentElement.lang = l; // was left at index.html's empty default
  }, { immediate: true });

  // A pending debounced push must not survive a logout: on a shared browser,
  // a push that fires after a different account has since logged in would
  // silently overwrite that account's settings with the previous user's.
  watch(
    () => auth.isLoggedIn,
    (loggedIn) => {
      if (!loggedIn && _pushTimer) {
        clearTimeout(_pushTimer);
        _pushTimer = null;
      }
    }
  );

  watch(
    [theme, language, autosaveEnabled, autosaveIntervalSecs, prestigeCeremony, hideFromLeaderboards],
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
      hideFromLeaderboards.value = sanitized.hideFromLeaderboards;
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
    hideFromLeaderboards,
    toggleTheme,
    setLanguage,
    setPrestigeCeremony,
    snapshot,
    restore,
    flushPush,
    loadFromServer
  };
});
