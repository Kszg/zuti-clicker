import { defineStore } from "pinia";
import { ref } from "vue";

// Which of the two mobile sheets (<760px) is currently slid over the
// clicker — "none" when both are closed. The bottom tab bar, the sheet
// itself, and its scrim all read this one flag so they can't disagree.
export type MobilePanel = "none" | "stats" | "units";

export const useUiStore = defineStore("ui", () => {
  const authModalOpen = ref(false);
  const confirmDeleteOpen = ref(false);
  const guestWarningDismissed = ref(false);
  const settingsModalOpen = ref(false);
  const prestigeConfirmOpen = ref(false);
  const prestigeCeremonyOpen = ref(false);
  const lastPrestigeGain = ref(0);
  const mobilePanel = ref<MobilePanel>("none");

  return {
    authModalOpen,
    confirmDeleteOpen,
    guestWarningDismissed,
    settingsModalOpen,
    prestigeConfirmOpen,
    prestigeCeremonyOpen,
    lastPrestigeGain,
    mobilePanel
  };
});
