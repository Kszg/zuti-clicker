import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { setActivePinia, createPinia } from "pinia";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/utils/settingsSchema";

vi.mock("@/lib/api", () => ({
  api: {
    settings: {
      load: vi.fn(),
      store: vi.fn()
    }
  },
  ApiError: class ApiError extends Error {}
}));

const STORAGE_KEY = "zuti-clicker:settings";

function loginAs(id = 1) {
  const auth = useAuthStore();
  auth.user = { id, username: "u", email: "u@example.com" };
}

describe("settingsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.mocked(api.settings.load).mockReset();
    vi.mocked(api.settings.store).mockReset();
    vi.mocked(api.settings.store).mockResolvedValue({
      message: "ok",
      settings: { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() }
    });
  });

  describe("defaults and localStorage sanitization", () => {
    it("uses the defaults when storage is empty", () => {
      const settings = useSettingsStore();
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(settings.language).toBe(DEFAULT_SETTINGS.language);
      expect(settings.autosaveEnabled).toBe(DEFAULT_SETTINGS.autosaveEnabled);
      expect(settings.autosaveIntervalSecs).toBe(DEFAULT_SETTINGS.autosaveIntervalSecs);
      expect(settings.prestigeCeremony).toBe(DEFAULT_SETTINGS.prestigeCeremony);
    });

    it("reads a valid persisted blob", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          theme: "light",
          language: "hu",
          autosaveEnabled: false,
          autosaveIntervalSecs: 300,
          prestigeCeremony: "brief"
        })
      );
      const settings = useSettingsStore();
      expect(settings.theme).toBe("light");
      expect(settings.language).toBe("hu");
      expect(settings.autosaveEnabled).toBe(false);
      expect(settings.autosaveIntervalSecs).toBe(300);
      expect(settings.prestigeCeremony).toBe("brief");
    });

    it.each([
      "{",
      "null",
      JSON.stringify({ theme: "purple" }),
      JSON.stringify({ autosaveIntervalSecs: "fast" }),
      JSON.stringify({ autosaveIntervalSecs: 7 }),
      JSON.stringify({ prestigeCeremony: "loud" })
    ])("never throws on corrupt/invalid storage content: %s", (raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      expect(() => useSettingsStore()).not.toThrow();
      const settings = useSettingsStore();
      // Every invalid field falls back to its own default independently.
      expect(settings.theme === "dark" || settings.theme === "light").toBe(true);
    });
  });

  describe("mutators persist to localStorage", () => {
    it("toggleTheme, setLanguage, setPrestigeCeremony, and the autosave refs all write through", async () => {
      const settings = useSettingsStore();
      settings.toggleTheme();
      settings.setLanguage("hu");
      settings.setPrestigeCeremony("brief");
      settings.autosaveEnabled = false;
      settings.autosaveIntervalSecs = 60;
      await nextTick();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.theme).toBe("light");
      expect(stored.language).toBe("hu");
      expect(stored.prestigeCeremony).toBe("brief");
      expect(stored.autosaveEnabled).toBe(false);
      expect(stored.autosaveIntervalSecs).toBe(60);
    });

    it("the theme watcher sets the document's data-theme attribute", async () => {
      const settings = useSettingsStore();
      settings.toggleTheme();
      await nextTick();
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });

  describe("server sync", () => {
    it("loadFromServer applies server values (server wins over different local values)", async () => {
      loginAs();
      vi.mocked(api.settings.load).mockResolvedValue({
        settings: {
          theme: "light",
          language: "hu",
          autosaveEnabled: false,
          autosaveIntervalSecs: 300,
          prestigeCeremony: "brief",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      });

      const settings = useSettingsStore();
      settings.toggleTheme(); // local: light already (from dark) -> just a baseline mutation
      await settings.loadFromServer();

      expect(settings.theme).toBe("light");
      expect(settings.language).toBe("hu");
      expect(settings.autosaveEnabled).toBe(false);
      expect(settings.autosaveIntervalSecs).toBe(300);
      expect(settings.prestigeCeremony).toBe("brief");
    });

    it("applying a server value does not push it right back (write-back-loop guard)", async () => {
      loginAs();
      vi.mocked(api.settings.load).mockResolvedValue({
        settings: {
          theme: "light",
          language: "hu",
          autosaveEnabled: false,
          autosaveIntervalSecs: 300,
          prestigeCeremony: "brief",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      });

      const settings = useSettingsStore();
      await settings.loadFromServer();

      expect(api.settings.store).not.toHaveBeenCalled();
    });

    it("no server row yet (updatedAt null) pushes local values up instead of discarding them", async () => {
      loginAs();
      vi.mocked(api.settings.load).mockResolvedValue({
        settings: { ...DEFAULT_SETTINGS, updatedAt: null }
      });

      vi.useFakeTimers();
      const settings = useSettingsStore();
      settings.setLanguage("hu");
      vi.mocked(api.settings.store).mockClear(); // ignore the push from setLanguage itself
      await settings.loadFromServer();
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      expect(api.settings.store).toHaveBeenCalled();
    });

    it("a server error leaves local settings untouched and does not throw", async () => {
      loginAs();
      vi.mocked(api.settings.load).mockRejectedValue(new Error("network down"));

      const settings = useSettingsStore();
      settings.setLanguage("hu");
      await expect(settings.loadFromServer()).resolves.toBeUndefined();
      expect(settings.language).toBe("hu");
    });

    it("guests never call the settings API", () => {
      const settings = useSettingsStore();
      settings.toggleTheme();
      expect(api.settings.store).not.toHaveBeenCalled();
    });

    it("a pending debounced push is cancelled on logout (shared-browser regression)", async () => {
      loginAs();
      vi.useFakeTimers();
      const settings = useSettingsStore();
      const auth = useAuthStore();

      settings.setLanguage("hu"); // schedules a push ~800ms out
      auth.user = null; // logout before the debounce fires

      await vi.advanceTimersByTimeAsync(2000);
      vi.useRealTimers();

      expect(api.settings.store).not.toHaveBeenCalled();
    });

    it("debounces rapid changes into a single push", async () => {
      loginAs();
      vi.useFakeTimers();
      const settings = useSettingsStore();

      settings.toggleTheme();
      settings.setLanguage("hu");
      settings.setPrestigeCeremony("brief");

      await vi.runAllTimersAsync();
      vi.useRealTimers();

      expect(api.settings.store).toHaveBeenCalledTimes(1);
    });
  });

  describe("snapshot/restore (settings modal Cancel)", () => {
    it("restore() reverts every field back to the snapshot", () => {
      const settings = useSettingsStore();
      const snap = settings.snapshot();

      settings.toggleTheme();
      settings.setLanguage("hu");
      settings.setPrestigeCeremony("brief");
      settings.autosaveEnabled = false;
      settings.autosaveIntervalSecs = 300;

      settings.restore(snap);

      expect(settings.theme).toBe(snap.theme);
      expect(settings.language).toBe(snap.language);
      expect(settings.prestigeCeremony).toBe(snap.prestigeCeremony);
      expect(settings.autosaveEnabled).toBe(snap.autosaveEnabled);
      expect(settings.autosaveIntervalSecs).toBe(snap.autosaveIntervalSecs);
    });

    it("restore() also corrects a stray push that already fired for the abandoned change", async () => {
      loginAs();
      vi.useFakeTimers();
      const settings = useSettingsStore();
      const snap = settings.snapshot();

      settings.setLanguage("hu");
      await vi.runAllTimersAsync(); // the stray push for "hu" lands

      settings.restore(snap);
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      expect(api.settings.store).toHaveBeenLastCalledWith(
        expect.objectContaining({ language: snap.language })
      );
    });
  });

  describe("flushPush (settings modal Done)", () => {
    it("resolves { ok: true, local: true } for a guest without calling the API", async () => {
      const settings = useSettingsStore();
      const result = await settings.flushPush();
      expect(result).toEqual({ ok: true, local: true });
      expect(api.settings.store).not.toHaveBeenCalled();
    });

    it("awaits the API and resolves { ok: true, local: false } when it succeeds", async () => {
      loginAs();
      const settings = useSettingsStore();
      const result = await settings.flushPush();
      expect(result).toEqual({ ok: true, local: false });
      expect(api.settings.store).toHaveBeenCalledTimes(1);
    });

    it("resolves { ok: false, local: false } when the API rejects", async () => {
      loginAs();
      vi.mocked(api.settings.store).mockRejectedValueOnce(new Error("network down"));
      const settings = useSettingsStore();
      const result = await settings.flushPush();
      expect(result).toEqual({ ok: false, local: false });
    });

    it("cancels any pending debounced push instead of double-sending", async () => {
      loginAs();
      vi.useFakeTimers();
      const settings = useSettingsStore();

      settings.setLanguage("hu");
      await vi.advanceTimersByTimeAsync(0); // let the persistence watcher schedule its debounce
      await settings.flushPush(); // flushes immediately instead, cancelling that timer

      await vi.runAllTimersAsync();
      vi.useRealTimers();

      expect(api.settings.store).toHaveBeenCalledTimes(1);
    });
  });
});
