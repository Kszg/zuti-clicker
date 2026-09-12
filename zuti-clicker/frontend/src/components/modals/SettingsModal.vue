<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import { AUTOSAVE_INTERVAL_OPTIONS } from "@/utils/gameConstants";
import { THEMES, LANGUAGES, CEREMONIES } from "@/utils/settingsSchema";

const { t } = useI18n();
const settings = useSettingsStore();
const ui = useUiStore();

const intervalLabels: Record<(typeof AUTOSAVE_INTERVAL_OPTIONS)[number], string> = {
  15: "15s",
  30: "30s",
  60: "1m",
  300: "5m"
};

function close() {
  ui.settingsModalOpen = false;
}
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.settingsModalOpen" class="modal-backdrop" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">{{ t("settings.title") }}</h2>

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
                @click="settings.autosaveIntervalSecs = opt"
              >
                {{ intervalLabels[opt] }}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-close" @click="close">{{ t("settings.closeBtn") }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 180ms ease;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 28px 32px 24px;
  width: 100%;
  max-width: 420px;
  animation: fadeScaleIn 200ms ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 18px;
}

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
  justify-content: flex-end;
}

.btn-close {
  padding: 8px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  transition: all var(--transition-fast);
}
.btn-close:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}
</style>
