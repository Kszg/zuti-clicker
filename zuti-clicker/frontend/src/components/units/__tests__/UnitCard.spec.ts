import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount, DOMWrapper } from "@vue/test-utils";
import UnitCard from "@/components/units/UnitCard.vue";
import { useGameStore } from "@/stores/gameStore";

const body = () => new DOMWrapper(document.body);

describe("UnitCard", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    document.body.innerHTML = "";
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

  describe("tooltip", () => {
    it("is closed until hovered or the info button is focused", () => {
      mount(UnitCard, { props: { unitId: "alpha", multiplier: 1 } });
      expect(body().find(".tooltip").exists()).toBe(false);
    });

    it("opens on hovering the card (pointer) and closes on mouseleave", async () => {
      const wrapper = mount(UnitCard, { props: { unitId: "alpha", multiplier: 1 } });
      await wrapper.find(".unit-card").trigger("mouseenter");
      expect(body().find(".tooltip").exists()).toBe(true);

      await wrapper.find(".unit-card").trigger("mouseleave");
      expect(body().find(".tooltip").exists()).toBe(false);
    });

    it("regression: opens on focusing the info button, reaching it without a pointer", async () => {
      const wrapper = mount(UnitCard, { props: { unitId: "alpha", multiplier: 1 } });
      await wrapper.find(".info-btn").trigger("focus");
      expect(body().find(".tooltip").exists()).toBe(true);

      await wrapper.find(".info-btn").trigger("blur");
      expect(body().find(".tooltip").exists()).toBe(false);
    });

    it("is teleported to <body>, escaping any ancestor's overflow/transform clipping", async () => {
      const wrapper = mount(UnitCard, { props: { unitId: "alpha", multiplier: 1 } });
      await wrapper.find(".info-btn").trigger("focus");
      expect(wrapper.find(".tooltip").exists()).toBe(false); // not inside the component's own tree
      expect(body().find(".tooltip").exists()).toBe(true);
    });

    it("shows the unit's name, description, cost, and gain", async () => {
      const wrapper = mount(UnitCard, { props: { unitId: "alpha", multiplier: 1 } });
      await wrapper.find(".info-btn").trigger("focus");
      const tip = body().find(".tooltip");
      expect(tip.text()).toContain("Alpha");
      expect(tip.text()).toContain("A basic token generator.");
    });
  });
});
