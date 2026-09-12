import { defineStore } from "pinia";
import { ref } from "vue";

export const useUiStore = defineStore("ui", () => {
  const authModalOpen = ref(false);
  const confirmDeleteOpen = ref(false);
  const guestWarningDismissed = ref(false);
  const settingsModalOpen = ref(false);
  const prestigeConfirmOpen = ref(false);
  const prestigeCeremonyOpen = ref(false);
  const lastPrestigeGain = ref(0);

  return {
    authModalOpen,
    confirmDeleteOpen,
    guestWarningDismissed,
    settingsModalOpen,
    prestigeConfirmOpen,
    prestigeCeremonyOpen,
    lastPrestigeGain
  };
});
