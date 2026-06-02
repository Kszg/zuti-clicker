import type { UnitDefinition } from "@/types";

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  { id: "alpha", baseCost: 10, baseProduction: 0.1, costGrowth: 1.15 },
  { id: "beta", baseCost: 100, baseProduction: 0.5, costGrowth: 1.15 },
  { id: "gamma", baseCost: 1_100, baseProduction: 4, costGrowth: 1.15 },
  { id: "delta", baseCost: 12_000, baseProduction: 20, costGrowth: 1.15 },
  { id: "epsilon", baseCost: 130_000, baseProduction: 100, costGrowth: 1.15 },
  { id: "zeta", baseCost: 1_400_000, baseProduction: 400, costGrowth: 1.15 },
  { id: "eta", baseCost: 20_000_000, baseProduction: 2_000, costGrowth: 1.15 },
  { id: "theta", baseCost: 330_000_000, baseProduction: 10_000, costGrowth: 1.15 }
];

export const TICK_RATE = 20;
export const BASE_TOKENS_PER_CLICK = 1;
