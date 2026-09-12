import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount, DOMWrapper } from "@vue/test-utils";
import PrestigeConfirmModal from "@/components/prestige/PrestigeConfirmModal.vue";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { getProductionMultiplier, getCostMultiplier } from "@/utils/prestige";

// PrestigeConfirmModal renders via <Teleport to="body">, so its content lives
// under document.body rather than under the mounted wrapper's own element —
// query it there, and clear it between tests since Teleport keeps appending.
const body = () => new DOMWrapper(document.body);

describe("PrestigeConfirmModal", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the exact PhD gain", () => {
    const game = useGameStore();
    game.runTokensEarned = 4_000_000; // -> 2 PhD
    mount(PrestigeConfirmModal);
    expect(body().text()).toContain("2");
  });

  it("regression: the before/after multipliers come from the shared prestige formulas, not a re-derived copy", () => {
    // This pins the bug found in review: the modal used to hardcode
    // `1 + 0.02 * n` / `Math.min(0.5, 0.005 * n)` instead of calling
    // getProductionMultiplier/getCostMultiplier, so a balance constant change
    // would update gameStore and PrestigePanel but silently leave this
    // modal's preview showing stale numbers.
    const game = useGameStore();
    game.phdCount = 7;
    game.runTokensEarned = 9_000_000; // -> 3 more PhD, total 10
    mount(PrestigeConfirmModal);

    const expectedAfterProduction = `x${getProductionMultiplier(10).toFixed(2)}`;
    const expectedAfterCost = `-${Math.round((1 - getCostMultiplier(10)) * 100)}%`;

    expect(body().text()).toContain(expectedAfterProduction);
    expect(body().text()).toContain(expectedAfterCost);
  });

  it("shows the guest warning only when not logged in", () => {
    const game = useGameStore();
    game.runTokensEarned = 4_000_000;
    const auth = useAuthStore();

    mount(PrestigeConfirmModal);
    expect(body().find(".guest-warning").exists()).toBe(true);
    document.body.innerHTML = "";

    auth.user = { id: 1, username: "u", email: "u@example.com" };
    mount(PrestigeConfirmModal);
    expect(body().find(".guest-warning").exists()).toBe(false);
  });

  it("cancel does not call game.prestige", async () => {
    const game = useGameStore();
    game.runTokensEarned = 4_000_000;
    mount(PrestigeConfirmModal);

    await body().find(".btn-cancel").trigger("click");

    expect(game.phdCount).toBe(0);
    expect(game.runTokensEarned).toBe(4_000_000); // untouched
  });

  it("confirm calls game.prestige exactly once", async () => {
    const game = useGameStore();
    game.runTokensEarned = 4_000_000;
    mount(PrestigeConfirmModal);

    await body().find(".btn-confirm").trigger("click");

    expect(game.phdCount).toBe(2);
    expect(game.runTokensEarned).toBe(0);
  });
});
