import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import ClickerArea from "@/components/clicker/ClickerArea.vue";
import { CPS_WINDOW_MS } from "@/utils/gameConstants";

describe("ClickerArea — clicks-per-second pill", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is hidden until the player clicks", () => {
    const wrapper = mount(ClickerArea);
    expect(wrapper.find(".cps-pill").exists()).toBe(false);
  });

  it("shows a nonzero rate right after a click", async () => {
    const wrapper = mount(ClickerArea);
    await wrapper.find(".circle-wrap").trigger("pointerdown", { button: 0, clientX: 1, clientY: 1 });
    expect(wrapper.find(".cps-pill").exists()).toBe(true);
    expect(wrapper.find(".cps-val").text()).not.toBe("0.0");
  });

  // Regression: recomputing cps only inside the click handler meant it never
  // re-ran once clicks stopped, so the pill froze at its last value forever
  // instead of decaying back to 0 and hiding — see ClickerArea.vue's
  // recomputeCps()/cpsInterval.
  it("regression: decays back to 0 and hides once clicking stops, without any further clicks", async () => {
    const wrapper = mount(ClickerArea);
    await wrapper.find(".circle-wrap").trigger("pointerdown", { button: 0, clientX: 1, clientY: 1 });
    expect(wrapper.find(".cps-pill").exists()).toBe(true);

    vi.advanceTimersByTime(CPS_WINDOW_MS + 500);
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".cps-pill").exists()).toBe(false);
  });
});
