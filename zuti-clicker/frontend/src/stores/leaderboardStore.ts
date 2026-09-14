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

  async function fetch(nextMetric: LeaderboardMetric): Promise<void> {
    metric.value = nextMetric;
    loading.value = true;
    error.value = false;
    try {
      const res = await api.leaderboard.get(nextMetric);
      // A metric switch that fires a second fetch before the first resolves
      // must not let the stale response overwrite the newer one's data.
      if (metric.value !== nextMetric) return;
      entries.value = res.entries;
      viewer.value = res.viewer;
    } catch {
      if (metric.value !== nextMetric) return;
      entries.value = [];
      viewer.value = null;
      error.value = true;
    } finally {
      if (metric.value === nextMetric) loading.value = false;
    }
  }

  return { metric, entries, viewer, loading, error, fetch };
});
