import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import MobileTabBar from "@/components/layout/MobileTabBar.vue";
import { useUiStore } from "@/stores/uiStore";

describe("MobileTabBar", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("opens the stats panel from closed", async () => {
    const ui = useUiStore();
    const wrapper = mount(MobileTabBar);
    await wrapper.findAll(".tab-btn")[0]!.trigger("click");
    expect(ui.mobilePanel).toBe("stats");
  });

  it("opens the shop panel from closed", async () => {
    const ui = useUiStore();
    const wrapper = mount(MobileTabBar);
    await wrapper.findAll(".tab-btn")[1]!.trigger("click");
    expect(ui.mobilePanel).toBe("units");
  });

  it("tapping the already-active tab closes it", async () => {
    const ui = useUiStore();
    ui.mobilePanel = "stats";
    const wrapper = mount(MobileTabBar);
    await wrapper.findAll(".tab-btn")[0]!.trigger("click");
    expect(ui.mobilePanel).toBe("none");
  });

  it("switching tabs replaces the open panel rather than stacking", async () => {
    const ui = useUiStore();
    ui.mobilePanel = "stats";
    const wrapper = mount(MobileTabBar);
    await wrapper.findAll(".tab-btn")[1]!.trigger("click");
    expect(ui.mobilePanel).toBe("units");
  });

  it("marks only the active tab as aria-expanded", async () => {
    const ui = useUiStore();
    ui.mobilePanel = "units";
    const wrapper = mount(MobileTabBar);
    const [statsTab, unitsTab] = wrapper.findAll(".tab-btn");
    expect(statsTab!.attributes("aria-expanded")).toBe("false");
    expect(unitsTab!.attributes("aria-expanded")).toBe("true");
  });
});
