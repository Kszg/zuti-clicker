import { describe, it, expect } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { useBreakpoint, COMPACT_BREAKPOINT_PX } from "@/composables/useBreakpoint";

// happy-dom's window.matchMedia is a real, working implementation (verified
// separately) whose MediaQueryList re-evaluates and fires "change" when
// `globalThis.happyDOM.setViewport` changes the viewport width — so this is
// tested against the real API, not a mock.
function setViewportWidth(width: number) {
  (globalThis as unknown as { happyDOM: { setViewport: (o: { width: number }) => void } })
    .happyDOM.setViewport({ width });
}

describe("useBreakpoint", () => {
  it("reports isCompact=false above the breakpoint", () => {
    setViewportWidth(1440);
    let result: ReturnType<typeof useBreakpoint> | undefined;
    mount(defineComponent({ setup: () => { result = useBreakpoint(); return () => null; } }));
    expect(result!.isCompact.value).toBe(false);
  });

  it("reports isCompact=true below the breakpoint", () => {
    setViewportWidth(400);
    let result: ReturnType<typeof useBreakpoint> | undefined;
    mount(defineComponent({ setup: () => { result = useBreakpoint(); return () => null; } }));
    expect(result!.isCompact.value).toBe(true);
  });

  it("updates reactively when the viewport crosses the breakpoint", () => {
    setViewportWidth(1440);
    let result: ReturnType<typeof useBreakpoint> | undefined;
    mount(defineComponent({ setup: () => { result = useBreakpoint(); return () => null; } }));
    expect(result!.isCompact.value).toBe(false);

    setViewportWidth(COMPACT_BREAKPOINT_PX - 1);
    expect(result!.isCompact.value).toBe(true);

    setViewportWidth(COMPACT_BREAKPOINT_PX);
    expect(result!.isCompact.value).toBe(false);
  });
});
