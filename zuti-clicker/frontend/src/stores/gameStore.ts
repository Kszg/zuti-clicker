import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { UNIT_DEFINITIONS, BASE_TOKENS_PER_CLICK, UNIT_REVEAL_FRACTION } from "@/utils/gameConstants";
import { getUnitCost, getBulkCost, getMaxBuyable } from "@/utils/costCalculator";
import {
  getPhdGain,
  getProductionMultiplier,
  getCostMultiplier,
  getTokensToNextPhd,
  getPrestigeProgress
} from "@/utils/prestige";
import type { UnitState, Multiplier } from "@/types";

export interface GameSaveInput {
  tokens: number;
  totalTokensEarned: number;
  totalClicks: number;
  elapsedSeconds: number;
  units: { unitId: string; owned: number }[];
  // Absent on saves written before the prestige system existed.
  runTokensEarned?: number;
  runClicks?: number;
  runSeconds?: number;
  phdCount?: number;
  prestigeCount?: number;
}

export const useGameStore = defineStore("game", () => {
  // Lifetime — survives prestige, never reset except by hardReset.
  const tokens = ref(0);
  const totalTokensEarned = ref(0);
  const totalClicks = ref(0);
  const elapsedSeconds = ref(0);

  // Current run — reset by prestige.
  const runTokensEarned = ref(0);
  const runClicks = ref(0);
  const runSeconds = ref(0);

  // Prestige — survives prestige, cleared only by hardReset.
  const phdCount = ref(0);
  const prestigeCount = ref(0);

  const unitStates = ref<UnitState[]>(UNIT_DEFINITIONS.map((d) => ({ id: d.id, owned: 0 })));

  const productionMultiplier = computed(() => getProductionMultiplier(phdCount.value));
  const costMultiplier = computed(() => getCostMultiplier(phdCount.value));

  const baseTokensPerSecond = computed(() =>
    UNIT_DEFINITIONS.reduce((sum, def) => {
      const state = unitStates.value.find((u) => u.id === def.id);
      return sum + (state?.owned ?? 0) * def.baseProduction;
    }, 0)
  );

  const tokensPerSecond = computed(() => baseTokensPerSecond.value * productionMultiplier.value);
  const tokensPerClick = computed(() => BASE_TOKENS_PER_CLICK * productionMultiplier.value);

  const phdGain = computed(() => getPhdGain(runTokensEarned.value));
  const canPrestige = computed(() => phdGain.value >= 1);
  const prestigeProgress = computed(() => getPrestigeProgress(runTokensEarned.value));
  const tokensToNextPhd = computed(() => getTokensToNextPhd(runTokensEarned.value));

  function clickToken(): number {
    const earned = tokensPerClick.value;
    tokens.value += earned;
    totalTokensEarned.value += earned;
    runTokensEarned.value += earned;
    totalClicks.value++;
    runClicks.value++;
    return earned;
  }

  function _resolveAmount(unitId: string, multiplier: Multiplier): number {
    const def = UNIT_DEFINITIONS.find((d) => d.id === unitId);
    if (!def) return 0;
    const owned = unitStates.value.find((u) => u.id === unitId)?.owned ?? 0;
    if (multiplier === "max") return getMaxBuyable(def, owned, tokens.value, costMultiplier.value);
    return multiplier;
  }

  function getBuyCost(unitId: string, multiplier: Multiplier): number {
    const def = UNIT_DEFINITIONS.find((d) => d.id === unitId);
    if (!def) return 0;
    const owned = unitStates.value.find((u) => u.id === unitId)?.owned ?? 0;
    const amount =
      multiplier === "max" ? getMaxBuyable(def, owned, tokens.value, costMultiplier.value) : multiplier;
    if (amount <= 0) return getUnitCost(def, owned, costMultiplier.value);
    return getBulkCost(def, owned, amount, costMultiplier.value);
  }

  function getProductionGain(unitId: string, multiplier: Multiplier): number {
    const def = UNIT_DEFINITIONS.find((d) => d.id === unitId);
    if (!def) return 0;
    const amount = _resolveAmount(unitId, multiplier);
    return amount * def.baseProduction;
  }

  function canAfford(unitId: string, multiplier: Multiplier): boolean {
    const def = UNIT_DEFINITIONS.find((d) => d.id === unitId);
    if (!def) return false;
    const owned = unitStates.value.find((u) => u.id === unitId)?.owned ?? 0;
    if (multiplier === "max") return getMaxBuyable(def, owned, tokens.value, costMultiplier.value) > 0;
    return getBulkCost(def, owned, multiplier, costMultiplier.value) <= tokens.value;
  }

  function buyUnit(unitId: string, multiplier: Multiplier): boolean {
    const def = UNIT_DEFINITIONS.find((d) => d.id === unitId);
    if (!def) return false;
    const state = unitStates.value.find((u) => u.id === unitId);
    if (!state) return false;
    const amount =
      multiplier === "max"
        ? getMaxBuyable(def, state.owned, tokens.value, costMultiplier.value)
        : multiplier;
    if (amount <= 0) return false;
    const cost = getBulkCost(def, state.owned, amount, costMultiplier.value);
    if (tokens.value < cost) return false;
    tokens.value -= cost;
    state.owned += amount;
    return true;
  }

  function tick(delta: number) {
    const earned = tokensPerSecond.value * delta;
    tokens.value += earned;
    totalTokensEarned.value += earned;
    runTokensEarned.value += earned;
    elapsedSeconds.value += delta;
    runSeconds.value += delta;
  }

  /**
   * Reveal is a one-way discovery gate, not an affordability gate: it is keyed
   * to lifetime totals and the undiscounted base cost, so a unit stays
   * revealed after a prestige instead of re-hiding, and the discount doesn't
   * change when it first appears.
   */
  function isUnitRevealed(unitId: string): boolean {
    const idx = UNIT_DEFINITIONS.findIndex((d) => d.id === unitId);
    if (idx <= 0) return idx === 0;
    const def = UNIT_DEFINITIONS[idx];
    return totalTokensEarned.value >= (def?.baseCost ?? Infinity) * UNIT_REVEAL_FRACTION;
  }

  /** Banks PhDs and starts a new run. Returns the PhDs gained, or 0 if refused. */
  function prestige(): number {
    const gained = phdGain.value; // MUST be read before any reset below
    if (gained < 1) return 0;
    phdCount.value += gained;
    prestigeCount.value += 1;
    tokens.value = 0;
    runTokensEarned.value = 0;
    runClicks.value = 0;
    runSeconds.value = 0;
    unitStates.value.forEach((u) => {
      u.owned = 0;
    });
    return gained;
  }

  /** Wipes everything, including PhDs. Used by the prestige-free "delete save" flow. */
  function hardReset(): void {
    tokens.value = 0;
    totalTokensEarned.value = 0;
    totalClicks.value = 0;
    elapsedSeconds.value = 0;
    runTokensEarned.value = 0;
    runClicks.value = 0;
    runSeconds.value = 0;
    phdCount.value = 0;
    prestigeCount.value = 0;
    unitStates.value.forEach((u) => {
      u.owned = 0;
    });
  }

  function loadFromSave(save: GameSaveInput): void {
    tokens.value = save.tokens;
    totalTokensEarned.value = save.totalTokensEarned;
    totalClicks.value = save.totalClicks;
    elapsedSeconds.value = save.elapsedSeconds;
    phdCount.value = save.phdCount ?? 0;
    prestigeCount.value = save.prestigeCount ?? 0;
    // A save with no run counters predates prestige, so it IS a single
    // un-prestiged run: run totals equal lifetime totals. `??` (not `||`) so a
    // genuine post-prestige 0 is preserved rather than re-seeded from lifetime.
    runTokensEarned.value = save.runTokensEarned ?? save.totalTokensEarned;
    runClicks.value = save.runClicks ?? save.totalClicks;
    runSeconds.value = save.runSeconds ?? save.elapsedSeconds;
    unitStates.value.forEach((u) => {
      u.owned = 0;
    });
    for (const { unitId, owned } of save.units) {
      const state = unitStates.value.find((u) => u.id === unitId);
      if (state) state.owned = owned;
    }
  }

  function toSavePayload(): GameSaveInput {
    return {
      tokens: tokens.value,
      totalTokensEarned: totalTokensEarned.value,
      totalClicks: totalClicks.value,
      elapsedSeconds: elapsedSeconds.value,
      runTokensEarned: runTokensEarned.value,
      runClicks: runClicks.value,
      runSeconds: runSeconds.value,
      phdCount: phdCount.value,
      prestigeCount: prestigeCount.value,
      units: unitStates.value.map((u) => ({ unitId: u.id, owned: u.owned }))
    };
  }

  return {
    tokens,
    totalTokensEarned,
    totalClicks,
    elapsedSeconds,
    runTokensEarned,
    runClicks,
    runSeconds,
    phdCount,
    prestigeCount,
    unitStates,
    productionMultiplier,
    costMultiplier,
    baseTokensPerSecond,
    tokensPerSecond,
    tokensPerClick,
    phdGain,
    canPrestige,
    prestigeProgress,
    tokensToNextPhd,
    clickToken,
    getBuyCost,
    getProductionGain,
    canAfford,
    buyUnit,
    tick,
    isUnitRevealed,
    prestige,
    hardReset,
    loadFromSave,
    toSavePayload
  };
});
