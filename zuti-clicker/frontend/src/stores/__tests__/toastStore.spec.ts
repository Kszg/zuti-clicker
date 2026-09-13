import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useToastStore } from "@/stores/toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("push() adds an entry with a unique id", () => {
    const toast = useToastStore();
    toast.push("success", "first");
    toast.push("error", "second");
    expect(toast.toasts).toHaveLength(2);
    expect(toast.toasts[0]!.id).not.toBe(toast.toasts[1]!.id);
    expect(toast.toasts[0]!.kind).toBe("success");
    expect(toast.toasts[1]!.kind).toBe("error");
  });

  it("dismiss() removes only the targeted entry", () => {
    const toast = useToastStore();
    const first = toast.push("success", "first");
    toast.push("success", "second");
    toast.dismiss(first);
    expect(toast.toasts).toHaveLength(1);
    expect(toast.toasts[0]!.message).toBe("second");
  });

  it("auto-dismisses after its lifetime elapses", async () => {
    vi.useFakeTimers();
    const toast = useToastStore();
    toast.push("success", "will fade");
    expect(toast.toasts).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(4000);
    expect(toast.toasts).toHaveLength(0);
  });
});
