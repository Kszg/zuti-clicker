<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { usePrestige } from "@/composables/usePrestige";
import { getProductionMultiplier, getCostMultiplier } from "@/utils/prestige";
import { formatPercent } from "@/utils/formatters";

const { t } = useI18n();
const game = useGameStore();
const auth = useAuthStore();
const { cancelPrestige, confirmPrestige } = usePrestige();

// Reuse the same formulas gameStore uses for the "before" values, rather
// than re-deriving them, so a future balance tweak can't leave this preview
// silently out of sync with what prestige() actually applies.
const newPhdCount = computed(() => game.phdCount + game.phdGain);
const productionBefore = computed(() => `x${game.productionMultiplier.toFixed(2)}`);
const productionAfter = computed(
  () => `x${getProductionMultiplier(newPhdCount.value).toFixed(2)}`
);
// formatPercent (not Math.round): the cost discount steps by 0.5% per PhD, so
// rounding to a whole percent would make 1 PhD's true 0.5% look like 1%.
const costBefore = computed(() => `-${formatPercent((1 - game.costMultiplier) * 100)}%`);
const costAfter = computed(
  () => `-${formatPercent((1 - getCostMultiplier(newPhdCount.value)) * 100)}%`
);
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="cancelPrestige">
      <div class="modal" role="alertdialog" aria-modal="true">
        <h2 class="modal-title">{{ t("confirm.prestigeTitle") }}</h2>

        <p class="gain-line">{{ t("confirm.prestigeGain", { gain: game.phdGain }) }}</p>

        <div class="mult-table">
          <div class="mult-row">
            <span class="mult-label">{{ t("prestige.production") }}</span>
            <span class="mult-value">{{ productionBefore }} → {{ productionAfter }}</span>
          </div>
          <div class="mult-row">
            <span class="mult-label">{{ t("prestige.costDiscount") }}</span>
            <span class="mult-value">{{ costBefore }} → {{ costAfter }}</span>
          </div>
        </div>

        <p class="modal-body">{{ t("confirm.prestigeLose") }}</p>

        <p v-if="!auth.isLoggedIn" class="guest-warning">
          {{ t("confirm.prestigeGuestWarning") }}
        </p>

        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelPrestige">{{ t("confirm.cancelBtn") }}</button>
          <button class="btn-confirm" @click="confirmPrestige">
            {{ t("confirm.prestigeConfirmBtn") }}
          </button>
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
  z-index: 1100;
  animation: fadeIn 180ms ease;
}

.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 28px 32px 24px;
  width: 100%;
  max-width: 400px;
  animation: fadeScaleIn 200ms ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.gain-line {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-text);
  margin-bottom: 14px;
}

.mult-table {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  margin-bottom: 14px;
}

.mult-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.mult-label {
  color: var(--text-muted);
  font-weight: 500;
}

.mult-value {
  color: var(--text-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.modal-body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 14px;
}

.guest-warning {
  font-size: 12px;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 8px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  transition: all var(--transition-fast);
}
.btn-cancel:hover { border-color: var(--accent); color: var(--text-primary); }

.btn-confirm {
  padding: 8px 16px;
  background: var(--btn-buy-bg);
  color: var(--btn-buy-text);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 700;
  transition: filter var(--transition-fast);
}
.btn-confirm:hover { filter: brightness(1.1); }
</style>
