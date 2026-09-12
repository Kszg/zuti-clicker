import { describe, it, expect } from "vitest";
import { getUnitCost, getBulkCost, getMaxBuyable } from "@/utils/costCalculator";
import { UNIT_DEFINITIONS } from "@/utils/gameConstants";
import type { UnitDefinition } from "@/types";

const alpha = UNIT_DEFINITIONS.find((d) => d.id === "alpha")!;
const theta = UNIT_DEFINITIONS.find((d) => d.id === "theta")!;

describe("getUnitCost - regression (undiscounted)", () => {
  it("matches the existing implementation's known values", () => {
    expect(getUnitCost(alpha, 0)).toBe(10);
    expect(getUnitCost(alpha, 1)).toBe(11.5);
    expect(getUnitCost(theta, 0)).toBe(330_000_000);
  });

  it("omitting the multiplier is identical to passing 1", () => {
    for (const unit of UNIT_DEFINITIONS) {
      for (const owned of [0, 1, 10, 100]) {
        expect(getUnitCost(unit, owned)).toBe(getUnitCost(unit, owned, 1));
      }
    }
  });
});

describe("getBulkCost - regression (undiscounted)", () => {
  it("matches the existing implementation's known values", () => {
    expect(getBulkCost(alpha, 0, 2)).toBe(21.5);
    expect(getBulkCost(alpha, 0, 10)).toBeCloseTo(203.0371823805272, 9);
  });

  it("returns 0 for a non-positive amount", () => {
    expect(getBulkCost(alpha, 0, 0)).toBe(0);
    expect(getBulkCost(alpha, 0, -3)).toBe(0);
  });
});

describe("getMaxBuyable - regression (undiscounted)", () => {
  it("matches the existing implementation's known values", () => {
    expect(getMaxBuyable(alpha, 0, 9)).toBe(0);
    expect(getMaxBuyable(alpha, 0, 10)).toBe(1);
    expect(getMaxBuyable(alpha, 0, 100)).toBe(6);
    expect(getMaxBuyable(alpha, 0, 1_000_000)).toBe(68);
  });

  it("float correction: a value just below the raw closed-form boundary corrects down", () => {
    // Raw closed form yields 2 here; the true max affordable is 1.
    expect(getMaxBuyable(alpha, 0, 21.499999999999996)).toBe(1);
  });

  it("two-sided correction fix: buying at the EXACT cost of N units returns N, not N-1", () => {
    // This is the pre-existing off-by-one bug this change fixes: the
    // single-sided correction under-counted by one at exact boundaries.
    for (const n of [1, 2, 3, 4, 5, 10, 20]) {
      const exactCost = getBulkCost(alpha, 0, n);
      expect(getMaxBuyable(alpha, 0, exactCost)).toBe(n);
    }
  });
});

describe("cost functions with a discount", () => {
  it("getUnitCost applies the discount multiplicatively", () => {
    expect(getUnitCost(alpha, 0, 0.9)).toBe(9);
    expect(getUnitCost(alpha, 1, 0.9)).toBeCloseTo(10.35, 10);
  });

  it("getBulkCost applies the discount multiplicatively", () => {
    expect(getBulkCost(alpha, 0, 2, 0.5)).toBe(10.75);
    expect(getBulkCost(alpha, 0, 10, 0.5)).toBeCloseTo(101.5185911902636, 9);
  });

  it("linearity: discounted bulk cost is proportional to undiscounted, within float tolerance", () => {
    for (const unit of UNIT_DEFINITIONS) {
      for (const owned of [0, 1, 7, 25]) {
        for (const amount of [1, 5, 20]) {
          for (const m of [1, 0.9, 0.75, 0.5]) {
            const discounted = getBulkCost(unit, owned, amount, m);
            const full = getBulkCost(unit, owned, amount, 1);
            const expected = full * m;
            // Multiplication order differs internally, so this is not always
            // bit-identical — use a relative tolerance, not strict equality.
            const relError = expected === 0 ? 0 : Math.abs(discounted - expected) / expected;
            expect(relError).toBeLessThan(1e-9);
          }
        }
      }
    }
  });

  it("getMaxBuyable buys more units when discounted", () => {
    expect(getMaxBuyable(alpha, 0, 9, 0.5)).toBe(1); // unaffordable at full price
    expect(getMaxBuyable(alpha, 0, 100, 0.5)).toBe(9); // vs 6 undiscounted
    expect(getMaxBuyable(alpha, 0, 1_000_000, 0.5)).toBe(73); // vs 68 undiscounted
  });

  it("float correction under a discount", () => {
    expect(getMaxBuyable(alpha, 0, 10.749999999999998, 0.5)).toBe(1);
  });

  it("exact-boundary correction under a discount", () => {
    for (const n of [1, 2, 4, 10]) {
      for (const m of [0.9, 0.75, 0.5]) {
        const exactCost = getBulkCost(alpha, 0, n, m);
        expect(getMaxBuyable(alpha, 0, exactCost, m)).toBe(n);
      }
    }
  });
});

describe("invariants across units, discounts, owned, and token levels", () => {
  const units: UnitDefinition[] = [alpha, UNIT_DEFINITIONS.find((d) => d.id === "gamma")!, theta];
  const multipliers = [1, 0.995, 0.92, 0.765, 0.5];
  const ownedLevels = [0, 1, 7, 25, 120];

  it("affordability: getMaxBuyable never costs more than the tokens available", () => {
    for (const unit of units) {
      for (const m of multipliers) {
        for (const owned of ownedLevels) {
          for (let k = 1; k <= 20; k++) {
            const exact = getBulkCost(unit, owned, k, m);
            for (const tokens of [exact, exact * 1.0000001, exact + 1]) {
              const n = getMaxBuyable(unit, owned, tokens, m);
              expect(getBulkCost(unit, owned, n, m)).toBeLessThanOrEqual(tokens);
            }
          }
        }
      }
    }
  });

  it("maximality: one more unit than getMaxBuyable is never affordable", () => {
    for (const unit of units) {
      for (const m of multipliers) {
        for (const owned of ownedLevels) {
          for (let k = 1; k <= 20; k++) {
            const exact = getBulkCost(unit, owned, k, m);
            for (const tokens of [exact, exact * 1.0000001, exact + 1]) {
              const n = getMaxBuyable(unit, owned, tokens, m);
              expect(getBulkCost(unit, owned, n + 1, m)).toBeGreaterThan(tokens);
            }
          }
        }
      }
    }
  });
});
