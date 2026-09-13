import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { setActivePinia, createPinia } from "pinia";
import { mount, DOMWrapper, type VueWrapper } from "@vue/test-utils";
import SettingsModal from "@/components/modals/SettingsModal.vue";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { api } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/utils/settingsSchema";

vi.mock("@/lib/api", () => ({
  api: {
    settings: {
      load: vi.fn(),
      store: vi.fn()
    }
  },
  ApiError: class ApiError extends Error {}
}));

function loginAs() {
  const auth = useAuthStore();
  auth.user = { id: 1, username: "u", email: "u@example.com" };
}

describe("SettingsModal", () => {
  // SettingsModal registers a `window` keydown listener (for Esc) while open,
  // removed on close/unmount. If a test leaves it mounted and open without
  // unmounting, the listener leaks onto `window` and fires in a *later*
  // test's Escape dispatch, mutating a defunct instance's already-torn-down
  // reactive state — hence unmounting every wrapper here, not just clearing
  // document.body.
  let activeWrapper: VueWrapper | null = null;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.body.innerHTML = "";
    vi.mocked(api.settings.store).mockReset();
    vi.mocked(api.settings.store).mockResolvedValue({
      message: "ok",
      settings: { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() }
    });
  });

  afterEach(() => {
    activeWrapper?.unmount();
    activeWrapper = null;
    document.body.innerHTML = "";
  });

  function openModal() {
    const ui = useUiStore();
    const wrapper = mount(SettingsModal);
    activeWrapper = wrapper;
    ui.settingsModalOpen = true;
    return wrapper;
  }

  it("does not close on a backdrop click — only Cancel or Done do", async () => {
    openModal();
    await nextTick();
    const ui = useUiStore();
    const body = new DOMWrapper(document.body);

    await body.find(".modal-backdrop").trigger("click");
    expect(ui.settingsModalOpen).toBe(true);
  });

  it("regression: Cancel reverts a theme change made while the modal was open", async () => {
    const settings = useSettingsStore();
    expect(settings.theme).toBe("dark");

    openModal();
    await nextTick();
    const body = new DOMWrapper(document.body);

    const lightBtn = body.findAll(".seg-btn").find((b) => b.text() === "Light")!;
    await lightBtn.trigger("click");
    expect(settings.theme).toBe("light"); // live preview applied

    const cancelBtn = body.findAll("button").find((b) => b.text() === "Cancel")!;
    await cancelBtn.trigger("click");

    expect(settings.theme).toBe("dark"); // reverted
    const ui = useUiStore();
    expect(ui.settingsModalOpen).toBe(false);
  });

  it("Escape reverts the same way Cancel does", async () => {
    const settings = useSettingsStore();
    openModal();
    await nextTick();
    const body = new DOMWrapper(document.body);

    const lightBtn = body.findAll(".seg-btn").find((b) => b.text() === "Light")!;
    await lightBtn.trigger("click");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(settings.theme).toBe("dark");
    const ui = useUiStore();
    expect(ui.settingsModalOpen).toBe(false);
  });

  it("Done (guest) closes and reports a local-only save without calling the API", async () => {
    openModal();
    await nextTick();
    const toast = useToastStore();
    const body = new DOMWrapper(document.body);

    const doneBtn = body.findAll("button").find((b) => b.text() === "Done")!;
    await doneBtn.trigger("click");
    await nextTick();
    await Promise.resolve(); // let the async handler's flushPush() resolve

    expect(api.settings.store).not.toHaveBeenCalled();
    expect(toast.toasts).toHaveLength(1);
    expect(toast.toasts[0]!.kind).toBe("success");
    expect(toast.toasts[0]!.message).toBe("Settings saved on this device");

    const ui = useUiStore();
    expect(ui.settingsModalOpen).toBe(false);
  });

  it("Done (logged in) awaits the server push and reports success", async () => {
    loginAs();
    openModal();
    await nextTick();
    const toast = useToastStore();
    const body = new DOMWrapper(document.body);

    const doneBtn = body.findAll("button").find((b) => b.text() === "Done")!;
    await doneBtn.trigger("click");
    await nextTick();
    await Promise.resolve();

    expect(api.settings.store).toHaveBeenCalledTimes(1);
    expect(toast.toasts[0]!.message).toBe("Settings saved");
  });

  it("Done (logged in, server error) reports failure but still closes", async () => {
    loginAs();
    vi.mocked(api.settings.store).mockRejectedValueOnce(new Error("network down"));
    openModal();
    await nextTick();
    const toast = useToastStore();
    const body = new DOMWrapper(document.body);

    const doneBtn = body.findAll("button").find((b) => b.text() === "Done")!;
    await doneBtn.trigger("click");
    await nextTick();
    await Promise.resolve();

    expect(toast.toasts[0]!.kind).toBe("error");
    const ui = useUiStore();
    expect(ui.settingsModalOpen).toBe(false);
  });
});
