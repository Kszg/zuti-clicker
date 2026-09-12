import {
  PHD_TOKEN_SCALE,
  PHD_PRODUCTION_BONUS,
  PHD_COST_REDUCTION,
  PHD_COST_REDUCTION_CAP
} from "@/utils/gameConstants";

/**
 * PhDs awarded for prestiging right now: floor(sqrt(runTokensEarned / SCALE)).
 *
 * The naive expression is not exact above ~9e15 tokens (2^53): `t / SCALE` can
 * round onto a perfect square, reporting one PhD too many. The correction step
 * below (same shape as costCalculator's float correction) makes it exact
 * across the whole float64-representable range.
 */
export function getPhdGain(runTokensEarned: number): number {
  if (!isFinite(runTokensEarned) || runTokensEarned < PHD_TOKEN_SCALE) return 0;
  let g = Math.floor(Math.sqrt(runTokensEarned / PHD_TOKEN_SCALE));
  if (g > 0 && g * g * PHD_TOKEN_SCALE > runTokensEarned) g--;
  else if ((g + 1) * (g + 1) * PHD_TOKEN_SCALE <= runTokensEarned) g++;
  return Math.max(0, g);
}

/** Tokens a run must reach to be worth `phd` PhDs. Inverse of getPhdGain. */
export function getPhdThreshold(phd: number): number {
  return phd * phd * PHD_TOKEN_SCALE;
}

/** Prestige is available once the run is worth at least one PhD. */
export function isPrestigeAvailable(runTokensEarned: number): boolean {
  return getPhdGain(runTokensEarned) >= 1;
}

/** Production multiplier applied to BOTH tokensPerSecond and tokensPerClick. */
export function getProductionMultiplier(phd: number): number {
  if (!isFinite(phd) || phd <= 0) return 1;
  return 1 + PHD_PRODUCTION_BONUS * phd;
}

/** Unit cost multiplier; never below 1 - CAP, never above 1. */
export function getCostMultiplier(phd: number): number {
  if (!isFinite(phd) || phd <= 0) return 1;
  return 1 - Math.min(PHD_COST_REDUCTION_CAP, PHD_COST_REDUCTION * phd);
}

/** Additional tokens this run needs to earn one more PhD. Always > 0. */
export function getTokensToNextPhd(runTokensEarned: number): number {
  const next = getPhdGain(runTokensEarned) + 1;
  return Math.max(0, getPhdThreshold(next) - Math.max(0, runTokensEarned));
}

/** Progress through the current PhD bracket, in [0, 1). */
export function getPrestigeProgress(runTokensEarned: number): number {
  const g = getPhdGain(runTokensEarned);
  const lo = getPhdThreshold(g);
  const hi = getPhdThreshold(g + 1);
  if (hi <= lo) return 0;
  const p = (Math.max(0, runTokensEarned) - lo) / (hi - lo);
  return Math.min(1, Math.max(0, p));
}
