<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores/gameStore";
import { formatNumber, formatRate } from "@/utils/formatters";
import SaveBar from "@/components/layout/SaveBar.vue";
import type { Language } from "@/types";

const { t } = useI18n();
const settings = useSettingsStore();
const ui = useUiStore();
const game = useGameStore();
const { theme, language } = storeToRefs(settings);

function toggleLanguage() {
  const next: Language = language.value === "en" ? "hu" : "en";
  settings.setLanguage(next);
}
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <span class="brand-name">{{ t("app.title") }}</span>
    </div>

    <SaveBar />

    <div class="controls">
      <button class="ctrl-btn" @click="toggleLanguage" :title="t('settings.language')">
        <span class="flag">{{ language === "en" ? "🇬🇧" : "🇭🇺" }}</span>
        <span class="lang-code">{{ language.toUpperCase() }}</span>
      </button>

      <button
        class="ctrl-btn icon-btn"
        @click="settings.toggleTheme"
        :title="t('settings.toggleTheme')"
      >
        <span>{{ theme === "dark" ? "☀️" : "🌙" }}</span>
      </button>

      <button
        class="ctrl-btn icon-btn"
        @click="ui.settingsModalOpen = true"
        :title="t('settings.open')"
      >
        <span>⚙️</span>
      </button>
    </div>

    <!-- Only visible below 760px (see the media query) — the token/rate
         readout stays visible while both mobile sheets are closed, since
         StatusColumn (which normally shows it) is off-canvas there. -->
    <div class="mini-stats" aria-hidden="true">
      <span class="mini-tokens">🪙 {{ formatNumber(game.tokens) }}</span>
      <span class="mini-tps">⚡ {{ formatRate(game.tokensPerSecond) }}/s</span>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: var(--header-h);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 20;
  transition:
    background var(--transition-slow),
    border-color var(--transition-slow);
}

.mini-stats {
  display: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-name {
  font-size: 17px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.4px;
}

.controls {
  display: flex;
  gap: 6px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.ctrl-btn:hover {
  border-color: var(--accent);
  color: var(--accent-text);
  background: var(--bg-hover);
}

.icon-btn {
  padding: 5px 10px;
}

.flag {
  font-size: 14px;
  line-height: 1;
}
.lang-code {
  letter-spacing: 0.5px;
}

@media (max-width: 759px) {
  .app-header {
    height: var(--header-h-compact);
    flex-wrap: wrap;
    align-content: center;
    row-gap: 4px;
    padding: 8px 14px;
  }

  /* Real estate is too tight below 760px for the full brand name alongside
     Sync/account controls and three icon buttons — trim to an initial and
     drop the language code text (the flag alone still identifies it). */
  .brand-name {
    font-size: 0;
  }
  .brand-name::first-letter {
    font-size: 17px;
  }
  .lang-code {
    display: none;
  }

  .mini-stats {
    display: flex;
    width: 100%;
    justify-content: center;
    gap: 16px;
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
  }
}
</style>
