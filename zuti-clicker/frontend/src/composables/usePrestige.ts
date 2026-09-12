import { useGameStore } from "@/stores/gameStore";
import { useUiStore } from "@/stores/uiStore";
import { useSaveStore } from "@/stores/saveStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";

/**
 * Wires the prestige flow's UI-facing actions to the underlying stores.
 * Kept separate from the components so the confirm -> ceremony -> sync
 * sequencing can be reasoned about (and tested) without mounting anything.
 */
export function usePrestige() {
  const game = useGameStore();
  const ui = useUiStore();
  const save = useSaveStore();
  const settings = useSettingsStore();
  const auth = useAuthStore();

  function requestPrestige(): void {
    if (!game.canPrestige) return;
    ui.prestigeConfirmOpen = true;
  }

  function cancelPrestige(): void {
    ui.prestigeConfirmOpen = false;
  }

  function confirmPrestige(): void {
    const gained = game.prestige();
    ui.prestigeConfirmOpen = false;
    if (gained <= 0) return;
    ui.lastPrestigeGain = gained;
    ui.prestigeCeremonyOpen = settings.prestigeCeremony === "full";
    // Persist immediately rather than waiting for the next autosave tick (up
    // to 5 minutes away) — losing a fresh prestige to a refresh would be the
    // single worst moment for a sync gap to land on.
    if (auth.isLoggedIn) void save.sync();
  }

  function dismissCeremony(): void {
    ui.prestigeCeremonyOpen = false;
  }

  return { requestPrestige, cancelPrestige, confirmPrestige, dismissCeremony };
}
