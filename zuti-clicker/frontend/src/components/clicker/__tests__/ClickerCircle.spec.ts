import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import ClickerCircle from "@/components/clicker/ClickerCircle.vue";

describe("ClickerCircle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a real <button>, reachable by keyboard", () => {
    const wrapper = mount(ClickerCircle);
    expect(wrapper.find(".circle-wrap").element.tagName).toBe("BUTTON");
  });

  it("earns from a left-button pointerdown", async () => {
    const wrapper = mount(ClickerCircle);
    await wrapper.trigger("pointerdown", { button: 0, clientX: 100, clientY: 150 });
    expect(wrapper.emitted("click")).toHaveLength(1);
    expect(wrapper.emitted("click")![0]).toEqual([{ x: 100, y: 150 }]);
  });

  it("regression: a right-click earns a token instead of only opening the context menu", async () => {
    const wrapper = mount(ClickerCircle);
    await wrapper.trigger("pointerdown", { button: 2, clientX: 40, clientY: 60 });
    expect(wrapper.emitted("click")).toHaveLength(1);

    // The browser's native context menu is suppressed.
    const ctxEvent = new Event("contextmenu", { bubbles: true, cancelable: true });
    wrapper.element.dispatchEvent(ctxEvent);
    expect(ctxEvent.defaultPrevented).toBe(true);
  });

  it("ignores the middle button so autoscroll/paste still work off the circle", async () => {
    const wrapper = mount(ClickerCircle);
    await wrapper.trigger("pointerdown", { button: 1, clientX: 10, clientY: 10 });
    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("does not double-count: the browser's follow-up click after a pointerdown is swallowed", async () => {
    const wrapper = mount(ClickerCircle);
    await wrapper.trigger("pointerdown", { button: 0, clientX: 5, clientY: 5 });
    await wrapper.trigger("click", { clientX: 5, clientY: 5 });
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("earns exactly once from a keyboard-triggered click (no preceding pointerdown)", async () => {
    const wrapper = mount(ClickerCircle);
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("regression: spam-clicking restarts the pop animation on every click, not just the first", async () => {
    const wrapper = mount(ClickerCircle);
    const circle = wrapper.find(".circle").element;

    await wrapper.trigger("pointerdown", { button: 0, clientX: 1, clientY: 1 });
    expect(circle.classList.contains("circle-pop")).toBe(true);

    // Advance partway through the 220ms pop, well before it would clear on
    // its own, then click again. The old guard (`if (active) return`) made
    // this second click a no-op with no visual feedback at all.
    vi.advanceTimersByTime(50);
    await wrapper.trigger("pointerdown", { button: 0, clientX: 2, clientY: 2 });
    expect(wrapper.emitted("click")).toHaveLength(2);
    expect(circle.classList.contains("circle-pop")).toBe(true);
  });

  it("the portrait cannot be dragged out of the circle", () => {
    const wrapper = mount(ClickerCircle);
    const img = wrapper.find("img");
    expect(img.attributes("draggable")).toBe("false");
  });

  it("a dragstart on the wrapper is suppressed", () => {
    const wrapper = mount(ClickerCircle);
    const event = new Event("dragstart", { bubbles: true, cancelable: true });
    wrapper.element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
