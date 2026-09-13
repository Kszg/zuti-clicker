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

  it("regression: a second click after the first pop clears restarts the animation", async () => {
    const wrapper = mount(ClickerCircle);
    const circle = wrapper.find(".circle").element;

    await wrapper.trigger("pointerdown", { button: 0, clientX: 1, clientY: 1 });
    expect(circle.classList.contains("circle-pop")).toBe(true);

    // Past both the 220ms pop and the visual throttle window (below) — a
    // fresh click here must restart the pop. The old guard (`if (active)
    // return`) made this a no-op with no visual feedback at all.
    vi.advanceTimersByTime(400);
    await wrapper.trigger("pointerdown", { button: 0, clientX: 2, clientY: 2 });
    expect(wrapper.emitted("click")).toHaveLength(2);
    expect(circle.classList.contains("circle-pop")).toBe(true);
  });

  it("regression: rapid spam still earns every click, but the visual pop is rate-limited rather than strobing", async () => {
    // Restarting the pop/ring burst on every single click once the click
    // rate climbs into the double digits per second reads as flashing, not
    // responsive, and risks the WCAG general flash threshold (content must
    // not flash more than 3 times/second) for photosensitive players.
    const wrapper = mount(ClickerCircle);
    const circle = wrapper.find(".circle").element;

    await wrapper.trigger("pointerdown", { button: 0, clientX: 0, clientY: 0 });
    expect(circle.classList.contains("circle-pop")).toBe(true);

    // Three more clicks in rapid succession, all well inside the throttle
    // window — every one must still count as a click (the score keeps
    // moving at full input rate)...
    for (let i = 1; i <= 3; i++) {
      vi.advanceTimersByTime(50);
      await wrapper.trigger("pointerdown", { button: 0, clientX: i, clientY: i });
    }
    expect(wrapper.emitted("click")).toHaveLength(4);

    // ...but the very first pop's own 220ms timer is what clears the class
    // here (at 50*3=150ms elapsed the class is still present from click #1;
    // advancing to just past its original 220ms mark clears it) — proving
    // none of clicks #2-#4 rescheduled a fresh 220ms timer of their own.
    vi.advanceTimersByTime(80); // total elapsed since click #1: 230ms
    expect(circle.classList.contains("circle-pop")).toBe(false);
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
