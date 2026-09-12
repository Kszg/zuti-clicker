<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore";
import { useSaveStore } from "@/stores/saveStore";
import { useUiStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores/gameStore";
import { useSettingsStore } from "@/stores/settingsStore";
import AppHeader from "@/components/layout/AppHeader.vue";
import StatusColumn from "@/components/status/StatusColumn.vue";
import ClickerArea from "@/components/clicker/ClickerArea.vue";
import UnitsPanel from "@/components/units/UnitsPanel.vue";
import AuthModal from "@/components/modals/AuthModal.vue";
import GuestWarningModal from "@/components/modals/GuestWarningModal.vue";
import ConfirmModal from "@/components/modals/ConfirmModal.vue";
import SettingsModal from "@/components/modals/SettingsModal.vue";
import PrestigeConfirmModal from "@/components/prestige/PrestigeConfirmModal.vue";
import PrestigeCeremony from "@/components/prestige/PrestigeCeremony.vue";
import { useGameLoop } from "@/composables/useGameLoop";

const { t } = useI18n();
const auth = useAuthStore();
const save = useSaveStore();
const ui = useUiStore();
const game = useGameStore();
const settings = useSettingsStore();

useGameLoop();

onMounted(async () => {
  await auth.checkSession();
});

watch(
  () => auth.isLoggedIn,
  async (loggedIn) => {
    if (loggedIn) {
      await Promise.all([save.load(), settings.loadFromServer()]);
    }
  }
);

// Widened beyond totalClicks so a pure idler (units doing all the work, zero
// manual clicks) still gets the unsaved-progress warning.
const hasProgress = computed(
  () => game.totalClicks > 0 || game.totalTokensEarned > 0 || game.phdCount > 0
);

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (hasProgress.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}
onMounted(() => window.addEventListener("beforeunload", handleBeforeUnload));
onUnmounted(() => window.removeEventListener("beforeunload", handleBeforeUnload));

async function onConfirmDelete() {
  try {
    await save.resetSave();
  } catch {
    // A failed delete leaves local game state untouched and records the
    // failure in save.syncError (see saveStore), surfaced by the existing
    // sync-status indicator in the header — this catch only keeps the
    // confirm modal from getting stuck open on the rejection.
  } finally {
    ui.confirmDeleteOpen = false;
  }
}
</script>

<template>
  <div class="app">
    <AppHeader />
    <div class="game-layout">
      <StatusColumn />
      <ClickerArea />
      <UnitsPanel />
    </div>
  </div>

  <AuthModal />
  <GuestWarningModal />
  <SettingsModal />
  <ConfirmModal
    v-if="ui.confirmDeleteOpen"
    :title="t('confirm.deleteSaveTitle')"
    :body="t('confirm.deleteSaveBody')"
    :confirm-label="t('confirm.deleteBtn')"
    :cancel-label="t('confirm.cancelBtn')"
    @confirm="onConfirmDelete"
    @cancel="ui.confirmDeleteOpen = false"
  />
  <PrestigeConfirmModal v-if="ui.prestigeConfirmOpen" />
  <PrestigeCeremony v-if="ui.prestigeCeremonyOpen" />
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.game-layout {
  display: grid;
  grid-template-columns: 252px 1fr 288px;
  flex: 1;
  overflow: hidden;
}
</style>
