import { defineStore } from "pinia";
import { ref } from "vue";
import { api, type LeaderboardEntry, type LeaderboardViewer } from "@/lib/api";
import type { LeaderboardMetric } from "@/types";

export const useLeaderboardStore = defineStore("leaderboard", () => {
  const metric = ref<LeaderboardMetric>("tokens");
  const entries = ref<LeaderboardEntry[]>([]);
  const viewer = ref<LeaderboardViewer | null>(null);
  const loading = ref(false);
  const error = ref(false);

  // A monotonic counter rather than comparing against `metric` — two
  // in-flight fetches for the *same* metric (e.g. the modal closing and
  // reopening before the first request resolves) would both pass a
  // metric-equality check, letting whichever response lands last win even
  // if it isn't the most recently issued request.
  let requestId = 0;

  async function fetch(nextMetric: LeaderboardMetric): Promise<void> {
    const id = ++requestId;
    metric.value = nextMetric;
    loading.value = true;
    error.value = false;
    try {
      const res = await api.leaderboard.get(nextMetric);
      if (id !== requestId) return;
      entries.value = res.entries;
      viewer.value = res.viewer;
    } catch {
      if (id !== requestId) return;
      entries.value = [];
      viewer.value = null;
      error.value = true;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  return { metric, entries, viewer, loading, error, fetch };
});
