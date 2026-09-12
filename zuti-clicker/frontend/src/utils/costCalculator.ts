import type { UnitDefinition } from "@/types";

export function getUnitCost(unit: UnitDefinition, owned: number): number {
  return unit.baseCost * Math.pow(unit.costGrowth, owned);
}

export function getBulkCost(unit: UnitDefinition, owned: number, amount: number): number {
  if (amount <= 0) return 0;
  const { baseCost, costGrowth } = unit;
  //geometric series: baseCost * growth^owned * (growth^amount - 1) / (growth - 1)
  return (
    (baseCost * Math.pow(costGrowth, owned) * (Math.pow(costGrowth, amount) - 1)) / (costGrowth - 1)
  );
}

export function getMaxBuyable(unit: UnitDefinition, owned: number, tokens: number): number {
  // Use the same bulk-cost arithmetic as the correction step below (and as
  // buyUnit's own affordability check), rather than getUnitCost's differently
  // rounded formula — the two can disagree by 1 ULP at some `owned` values,
  // which would otherwise make this guard inconsistent with what a purchase
  // actually costs.
  const firstCost = getBulkCost(unit, owned, 1);
  if (tokens < firstCost) return 0;
  const { baseCost, costGrowth } = unit;
  let n = Math.floor(
    Math.log(1 + (tokens * (costGrowth - 1)) / (baseCost * Math.pow(costGrowth, owned))) /
      Math.log(costGrowth)
  );
  //two-sided float correction: the closed form can land 1 off in either
  //direction right at an exact bulk-cost boundary
  if (getBulkCost(unit, owned, n) > tokens) n--;
  else if (getBulkCost(unit, owned, n + 1) <= tokens) n++;
  return Math.max(0, n);
}
