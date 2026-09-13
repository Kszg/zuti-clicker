<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useSettingsStore, type SettingsSnapshot } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import { useToastStore } from "@/stores/toastStore";
import { AUTOSAVE_INTERVAL_OPTIONS } from "@/utils/gameConstants";
import { THEMES, LANGUAGES, CEREMONIES } from "@/utils/settingsSchema";
import BaseModal from "./BaseModal.vue";

const { t } = useI18n();
const settings = useSettingsStore();
const ui = useUiStore();
const toast = useToastStore();

function intervalKey(opt: (typeof AUTOSAVE_INTERVAL_OPTIONS)[number]) {
  return `settings.intervals.${opt}` as Parameters<typeof t>[0];
}

// Live preview stays (theme/language apply as you click), but a change is
// only committed to the server on "Done" — Cancel/Esc (BaseModal emits
// "close" for both, since it doesn't distinguish backdrop-driven dismissal
// from Escape here) restores whatever was in effect when the modal opened.
const openSnapshot = ref<SettingsSnapshot | null>(null);
const saving = ref(false);

watch(
  () => ui.settingsModalOpen,
  (open) => {
    if (open) openSnapshot.value = settings.snapshot();
  }
);

function close() {
  ui.settingsModalOpen = false;
}

function handleCancel() {
  if (openSnapshot.value) settings.restore(openSnapshot.value);
  close();
}

async function handleDone() {
  saving.value = true;
  try {
    const result = await settings.flushPush();
    if (result.local) {
      toast.push("success", t("settings.savedLocal"));
    } else if (result.ok) {
      toast.push("success", t("settings.saved"));
    } else {
      toast.push("error", t("settings.saveFailed"));
    }
  } finally {
    saving.value = false;
    close();
  }
}
</script>

<template>
  <BaseModal
    :open="ui.settingsModalOpen"
    :title="t('settings.title')"
    :max-width="420"
    :z-index="1000"
    :dismiss-on-backdrop="false"
    @close="handleCancel"
  >
    <div class="section">
      <span class="section-label">{{ t("settings.appearance") }}</span>

      <div class="field-row">
        <span class="field-label">{{ t("settings.theme") }}</span>
        <div class="seg-group" role="group">
          <button
            v-for="opt in THEMES"
            :key="opt"
            class="seg-btn"
            :class="{ active: settings.theme === opt }"
            :aria-pressed="settings.theme === opt"
            @click="settings.theme = opt"
          >
            {{ opt === "dark" ? t("settings.themeDark") : t("settings.themeLight") }}
          </button>
        </div>
      </div>

      <div class="field-row">
        <span class="field-label">{{ t("settings.language") }}</span>
        <div class="seg-group" role="group">
          <button
            v-for="opt in LANGUAGES"
            :key="opt"
            class="seg-btn"
            :class="{ active: settings.language === opt }"
            :aria-pressed="settings.language === opt"
            @click="settings.setLanguage(opt)"
          >
            {{ opt.toUpperCase() }}
          </button>
        </div>
      </div>
    </div>

    <div class="section">
      <span class="section-label">{{ t("settings.game") }}</span>

      <div class="field-row">
        <span class="field-label">{{ t("settings.ceremonyLabel") }}</span>
        <div class="seg-group" role="group">
          <button
            v-for="opt in CEREMONIES"
            :key="opt"
            class="seg-btn"
            :class="{ active: settings.prestigeCeremony === opt }"
            :aria-pressed="settings.prestigeCeremony === opt"
            @click="settings.setPrestigeCeremony(opt)"
          >
            {{ opt === "full" ? t("settings.ceremonyFull") : t("settings.ceremonyBrief") }}
          </button>
        </div>
      </div>
    </div>

    <div class="section">
      <span class="section-label">{{ t("settings.saving") }}</span>

      <div class="field-row">
        <span class="field-label">{{ t("settings.autosave") }}</span>
        <button
          class="toggle-btn"
          :class="{ active: settings.autosaveEnabled }"
          :aria-pressed="settings.autosaveEnabled"
          @click="settings.autosaveEnabled = !settings.autosaveEnabled"
        >
          {{ settings.autosaveEnabled ? "✓" : "✗" }}
        </button>
      </div>

      <div v-if="settings.autosaveEnabled" class="field-row">
        <span class="field-label">{{ t("settings.autosaveInterval") }}</span>
        <div class="seg-group" role="group">
          <button
            v-for="opt in AUTOSAVE_INTERVAL_OPTIONS"
            :key="opt"
            class="seg-btn"
            :class="{ active: settings.autosaveIntervalSecs === opt }"
            :aria-pressed="settings.autosaveIntervalSecs === opt"
            @click="settings.autosaveIntervalSecs = opt"
          >
            {{ t(intervalKey(opt)) }}
          </button>
        </div>
      </div>
    </div>

    <template #actions>
      <div class="modal-actions">
        <button class="btn-cancel" :disabled="saving" @click="handleCancel">
          {{ t("settings.cancelBtn") }}
        </button>
        <button class="btn-close" :disabled="saving" @click="handleDone">
          {{ t("settings.closeBtn") }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.section {
  margin-bottom: 18px;
}
.section:last-of-type {
  margin-bottom: 22px;
}

.section-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}

.field-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.seg-group {
  display: flex;
  gap: 4px;
}

.seg-btn {
  padding: 6px 12px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  transition: all var(--transition-fast);
}
.seg-btn:hover {
  border-color: var(--accent);
  color: var(--accent-text);
}
.seg-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.toggle-btn {
  width: 32px;
  height: 28px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  transition: all var(--transition-fast);
}
.toggle-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 8px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  transition: all var(--transition-fast);
}
.btn-cancel:hover:not(:disabled) { border-color: var(--accent); color: var(--text-primary); }
.btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-close {
  padding: 8px 20px;
  background: var(--btn-buy-bg);
  border: 1px solid var(--btn-buy-bg);
  color: var(--btn-buy-text);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 700;
  transition: all var(--transition-fast);
}
.btn-close:hover:not(:disabled) { filter: brightness(1.1); }
.btn-close:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
