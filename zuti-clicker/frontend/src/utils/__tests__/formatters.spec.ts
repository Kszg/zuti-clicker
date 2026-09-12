import { describe, it, expect } from "vitest";
import { formatNumber, formatRate, formatTime } from "@/utils/formatters";

describe("formatNumber - regression", () => {
  it("matches the existing implementation's known values", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(999.9)).toBe("999");
    expect(formatNumber(1000)).toBe("1.00K");
    expect(formatNumber(1234)).toBe("1.23K");
    expect(formatNumber(1e6)).toBe("1.00M");
    expect(formatNumber(1.5e9)).toBe("1.50B");
    expect(formatNumber(1.234e12)).toBe("1.23T");
    expect(formatNumber(1234, 0)).toBe("1K");
    expect(formatNumber(1234, 3)).toBe("1.234K");
    expect(formatNumber(-5)).toBe("-5");
  });
});

describe("formatNumber - large-number fix", () => {
  it("no longer degrades past the old Oc ceiling", () => {
    expect(formatNumber(1e30)).toBe("1.00No");
    expect(formatNumber(1e33)).toBe("1.00Dc");
    expect(formatNumber(1e36)).toBe("1.00e36");
    expect(formatNumber(1.234e45)).toBe("1.23e45");
    expect(formatNumber(1e308)).toBe("1.00e308");
  });

  it("renders Infinity and NaN distinctly", () => {
    expect(formatNumber(Infinity)).toBe("∞");
    expect(formatNumber(NaN)).toBe("0");
  });

  it("monotonic width: the integer part never grows unbounded (the old failure mode)", () => {
    for (let e = 3; e <= 60; e++) {
      const out = formatNumber(Math.pow(10, e));
      const intPart = out.split(/[eA-Za-z]/)[0]!.replace(".", "").replace("-", "");
      // "1.00No" -> intPart "100" (3 digits incl. the 2 decimals); an
      // exponential fallback like "1.00e36" -> intPart "100" too. Either way
      // it must never balloon into an 18-digit string like the old bug.
      expect(intPart.length).toBeLessThanOrEqual(6);
    }
  });
});

describe("formatRate - regression", () => {
  it("matches the existing implementation's known values", () => {
    expect(formatRate(0)).toBe("0.00");
    expect(formatRate(0.3)).toBe("0.30");
    expect(formatRate(150)).toBe("150");
    expect(formatRate(1500)).toBe("1.50K");
  });
});

describe("formatRate - large-number fix", () => {
  it("shares the fixed suffix/exponential ladder with formatNumber", () => {
    expect(formatRate(1e36)).toBe("1.00e36");
  });

  it("renders Infinity distinctly", () => {
    expect(formatRate(Infinity)).toBe("∞");
  });
});

describe("formatTime - regression", () => {
  it("matches the existing implementation's known values", () => {
    expect(formatTime(0)).toBe("0s");
    expect(formatTime(59)).toBe("59s");
    expect(formatTime(60)).toBe("1m 0s");
    expect(formatTime(3599)).toBe("59m 59s");
    expect(formatTime(3600)).toBe("1h 0m");
    expect(formatTime(7265)).toBe("2h 1m");
  });
});
