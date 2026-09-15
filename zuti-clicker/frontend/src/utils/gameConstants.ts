import type { SkinDefinition, UnitDefinition } from "@/types";

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  { id: "alpha", baseCost: 10, baseProduction: 0.3, costGrowth: 1.15 },
  { id: "beta", baseCost: 100, baseProduction: 1.5, costGrowth: 1.15 },
  { id: "gamma", baseCost: 1_100, baseProduction: 12, costGrowth: 1.15 },
  { id: "delta", baseCost: 12_000, baseProduction: 60, costGrowth: 1.15 },
  { id: "epsilon", baseCost: 130_000, baseProduction: 300, costGrowth: 1.15 },
  { id: "zeta", baseCost: 1_400_000, baseProduction: 1_200, costGrowth: 1.15 },
  { id: "eta", baseCost: 20_000_000, baseProduction: 6_000, costGrowth: 1.15 },
  { id: "theta", baseCost: 330_000_000, baseProduction: 30_000, costGrowth: 1.15 }
];

export const SKIN_DEFINITIONS: SkinDefinition[] = [
  {
    id: "sahur",
    cost: 67_676_767,
    imagePath: "sahur.jpg",
    audioPath: null
  }
]

export const TICK_RATE = 20;
export const BASE_TOKENS_PER_CLICK = 1;

// Fraction of a unit's base cost the player must have earned (lifetime) before
// it's revealed in the shop. Extracted from the inline 0.1 previously in UnitCard.vue.
export const UNIT_REVEAL_FRACTION = 0.1;

// Prestige ("PhD") balance constants.
export const PHD_TOKEN_SCALE = 1_000_000;
export const PHD_PRODUCTION_BONUS = 0.02;
export const PHD_COST_REDUCTION = 0.005;
export const PHD_COST_REDUCTION_CAP = 0.5;

export const AUTOSAVE_INTERVAL_OPTIONS = [15, 30, 60, 300] as const;
export const DEFAULT_AUTOSAVE_INTERVAL_SECS = 30;
