import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSaveStore } from "@/stores/saveStore";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    save: {
      load: vi.fn(),
      store: vi.fn(),
      reset: vi.fn()
    },
    settings: {
      load: vi.fn(),
      store: vi.fn()
    }
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
}));

function loginAs(id = 1) {
  const auth = useAuthStore();
  auth.user = { id, username: "u", email: "u@example.com" };
}

describe("saveStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.mocked(api.save.load).mockReset();
    vi.mocked(api.save.store).mockReset();
    vi.mocked(api.save.reset).mockReset();
    vi.mocked(api.settings.store).mockReset().mockResolvedValue({
      message: "ok",
      settings: {
        theme: "dark",
        language: "en",
        autosaveEnabled: true,
        autosaveIntervalSecs: 30,
        prestigeCeremony: "full",
        updatedAt: new Date().toISOString()
      }
    });
  });

  describe("resetSave()", () => {
    it("calls both the API delete and game.hardReset()", async () => {
      loginAs();
      const game = useGameStore();
      game.tokens = 500;
      game.phdCount = 3;
      vi.mocked(api.save.reset).mockResolvedValue({ message: "ok" });

      const save = useSaveStore();
      await save.resetSave();

      expect(api.save.reset).toHaveBeenCalledTimes(1);
      expect(game.tokens).toBe(0);
      expect(game.phdCount).toBe(0);
      expect(save.lastSyncedAt).toBeNull();
    });

    it("a failed delete leaves local game state untouched and propagates", async () => {
      loginAs();
      const game = useGameStore();
      game.tokens = 500;
      vi.mocked(api.save.reset).mockRejectedValue(new Error("network down"));

      const save = useSaveStore();
      await expect(save.resetSave()).rejects.toThrow("network down");
      expect(game.tokens).toBe(500);
      // Surfaced via the existing sync-status indicator rather than silently
      // discarded — see the App.vue confirm-delete handler.
      expect(save.syncError).toBe("network down");
    });

    it("regression: after a reset, the next sync sends an all-zero payload (not the pre-reset data)", async () => {
      loginAs();
      const game = useGameStore();
      game.tokens = 999;
      game.totalTokensEarned = 999;
      game.phdCount = 5;
      vi.mocked(api.save.reset).mockResolvedValue({ message: "ok" });
      vi.mocked(api.save.store).mockResolvedValue({
        message: "ok",
        savedAt: new Date().toISOString()
      });

      const save = useSaveStore();
      await save.resetSave();
      await save.sync();

      expect(api.save.store).toHaveBeenCalledTimes(1);
      const payload = vi.mocked(api.save.store).mock.calls[0]![0];
      expect(payload.tokens).toBe(0);
      expect(payload.totalTokensEarned).toBe(0);
      expect(payload.phdCount).toBe(0);
    });
  });

  describe("sync()", () => {
    it("is a no-op for guests", async () => {
      const save = useSaveStore();
      await save.sync();
      expect(api.save.store).not.toHaveBeenCalled();
    });

    it("a sync requested while one is in flight is queued and runs once more with the newer payload", async () => {
      loginAs();
      const game = useGameStore();
      game.tokens = 1;

      let resolveFirst!: (v: { message: string; savedAt: string }) => void;
      const firstCall = new Promise<{ message: string; savedAt: string }>((resolve) => {
        resolveFirst = resolve;
      });
      vi.mocked(api.save.store)
        .mockReturnValueOnce(firstCall)
        .mockResolvedValueOnce({ message: "ok", savedAt: new Date().toISOString() });

      const save = useSaveStore();
      const firstSync = save.sync(); // starts, awaiting firstCall
      game.tokens = 2; // mutate before the second sync request
      const secondSync = save.sync(); // queued, since isSyncing is true

      resolveFirst({ message: "ok", savedAt: new Date().toISOString() });
      await firstSync;
      await secondSync;
      // give the queued re-run (fired from `finally`) a chance to complete
      await new Promise((r) => setTimeout(r, 0));

      expect(api.save.store).toHaveBeenCalledTimes(2);
      const secondPayload = vi.mocked(api.save.store).mock.calls[1]![0];
      expect(secondPayload.tokens).toBe(2);
    });
  });

  describe("load()", () => {
    it("forwards the server save into game.loadFromSave", async () => {
      loginAs();
      vi.mocked(api.save.load).mockResolvedValue({
        save: {
          tokens: 42,
          totalTokensEarned: 100,
          totalClicks: 5,
          elapsedSeconds: 60,
          phdCount: 2,
          prestigeCount: 1,
          runTokensEarned: 10,
          runClicks: 1,
          runSeconds: 5,
          savedAt: "2026-01-01T00:00:00.000Z",
          units: [{ unitId: "alpha", owned: 3 }]
        }
      });

      const game = useGameStore();
      const save = useSaveStore();
      await save.load();

      expect(game.tokens).toBe(42);
      expect(game.phdCount).toBe(2);
      expect(save.lastSyncedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    });
  });

  describe("autosave timer", () => {
    it("restarts when settings.autosaveEnabled or autosaveIntervalSecs change", async () => {
      vi.useFakeTimers();
      loginAs();
      vi.mocked(api.save.store).mockResolvedValue({
        message: "ok",
        savedAt: new Date().toISOString()
      });

      const settings = useSettingsStore();
      useSaveStore();

      settings.autosaveIntervalSecs = 15;
      await vi.advanceTimersByTimeAsync(15_000);
      expect(api.save.store).toHaveBeenCalledTimes(1);

      settings.autosaveEnabled = false;
      await vi.advanceTimersByTimeAsync(30_000);
      expect(api.save.store).toHaveBeenCalledTimes(1); // no further calls once disabled

      vi.useRealTimers();
    });
  });
});
