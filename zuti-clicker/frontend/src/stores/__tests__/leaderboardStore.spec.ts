import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useLeaderboardStore } from "@/stores/leaderboardStore";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    leaderboard: {
      get: vi.fn()
    }
  },
  ApiError: class ApiError extends Error {}
}));

describe("leaderboardStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api.leaderboard.get).mockReset();
  });

  it("starts with no entries, no viewer, and not loading", () => {
    const store = useLeaderboardStore();
    expect(store.entries).toEqual([]);
    expect(store.viewer).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.error).toBe(false);
  });

  it("fetch populates entries and viewer on success", async () => {
    vi.mocked(api.leaderboard.get).mockResolvedValue({
      metric: "tokens",
      entries: [{ rank: 1, username: "alice", value: 100 }],
      viewer: { rank: 1, value: 100, hidden: false }
    });

    const store = useLeaderboardStore();
    await store.fetch("tokens");

    expect(store.metric).toBe("tokens");
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]!.username).toBe("alice");
    expect(store.viewer?.rank).toBe(1);
    expect(store.loading).toBe(false);
    expect(store.error).toBe(false);
    expect(api.leaderboard.get).toHaveBeenCalledWith("tokens");
  });

  it("sets loading true while the request is in flight", async () => {
    let resolveGet!: (v: {
      metric: "clicks";
      entries: never[];
      viewer: null;
    }) => void;
    vi.mocked(api.leaderboard.get).mockReturnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      }) as ReturnType<typeof api.leaderboard.get>
    );

    const store = useLeaderboardStore();
    const promise = store.fetch("clicks");
    expect(store.loading).toBe(true);

    resolveGet({ metric: "clicks", entries: [], viewer: null });
    await promise;
    expect(store.loading).toBe(false);
  });

  it("clears entries/viewer and sets error on a failed fetch", async () => {
    vi.mocked(api.leaderboard.get).mockRejectedValue(new Error("network down"));

    const store = useLeaderboardStore();
    await store.fetch("phd");

    expect(store.entries).toEqual([]);
    expect(store.viewer).toBeNull();
    expect(store.error).toBe(true);
    expect(store.loading).toBe(false);
  });

  it("a stale in-flight response does not overwrite a newer metric switch", async () => {
    let resolveFirst!: (v: {
      metric: "tokens";
      entries: { rank: number; username: string; value: number }[];
      viewer: null;
    }) => void;
    vi.mocked(api.leaderboard.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }) as ReturnType<typeof api.leaderboard.get>
    );

    const store = useLeaderboardStore();
    const firstFetch = store.fetch("tokens");

    vi.mocked(api.leaderboard.get).mockResolvedValueOnce({
      metric: "clicks",
      entries: [{ rank: 1, username: "bob", value: 5 }],
      viewer: null
    });
    await store.fetch("clicks");

    // The stale "tokens" response arrives after "clicks" has already landed.
    resolveFirst({ metric: "tokens", entries: [{ rank: 1, username: "alice", value: 1 }], viewer: null });
    await firstFetch;

    expect(store.metric).toBe("clicks");
    expect(store.entries[0]!.username).toBe("bob");
  });
});
