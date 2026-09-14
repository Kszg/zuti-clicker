// Keep the metric key set in sync with frontend/src/lib/api.ts's
// LeaderboardMetric type — both list the same four keys.
export const LEADERBOARD_METRICS = {
  tokens: { field: "totalTokensEarned" },
  clicks: { field: "totalClicks" },
  phd: { field: "phdCount" },
  playtime: { field: "elapsedSeconds" }
} as const;

export type LeaderboardMetric = keyof typeof LEADERBOARD_METRICS;
export type LeaderboardField = (typeof LEADERBOARD_METRICS)[LeaderboardMetric]["field"];

export const DEFAULT_LEADERBOARD_METRIC: LeaderboardMetric = "tokens";
export const DEFAULT_LEADERBOARD_LIMIT = 50;
export const MAX_LEADERBOARD_LIMIT = 100;

export function isLeaderboardMetric(value: unknown): value is LeaderboardMetric {
  return typeof value === "string" && value in LEADERBOARD_METRICS;
}
