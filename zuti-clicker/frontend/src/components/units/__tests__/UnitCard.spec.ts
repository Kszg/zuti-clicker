import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import UnitCard from "@/components/units/UnitCard.vue";
import { useGameStore } from "@/stores/gameStore";

describe("UnitCard", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("alpha is always rendered", () => {
    const wrapper = mount(UnitCard, { props: { unitId: "alpha", multiplier: 1 } });
    expect(wrapper.find(".unit-card").exists()).toBe(true);
  });

  it("theta is hidden below its reveal threshold and shown at/above it", () => {
    const game = useGameStore();
    game.totalTokensEarned = 32_999_999;
    const hidden = mount(UnitCard, { props: { unitId: "theta", multiplier: 1 } });
    expect(hidden.find(".unit-card").exists()).toBe(false);

    game.totalTokensEarned = 33_000_000;
    const shown = mount(UnitCard, { props: { unitId: "theta", multiplier: 1 } });
    expect(shown.find(".unit-card").exists()).toBe(true);
  });

  it("theta's reveal threshold is unaffected by the cost discount", () => {
    const game = useGameStore();
    game.phdCount = 100; // 50% cost discount
    game.totalTokensEarned = 32_999_999;
    const wrapper = mount(UnitCard, { props: { unitId: "theta", multiplier: 1 } });
    expect(wrapper.find(".unit-card").exists()).toBe(false);
  });

  it("the displayed cost reflects the PhD cost discount", () => {
    const game = useGameStore();
    game.phdCount = 100; // 50% off
    const wrapper = mount(UnitCard, { props: { unitId: "alpha", multiplier: 1 } });
    expect(wrapper.find(".btn-cost").text()).toBe("5");
  });
});
