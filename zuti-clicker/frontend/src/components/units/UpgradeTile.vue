<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "@/stores/gameStore";
import { UPGRADE_DEFINITIONS } from "@/utils/gameConstants";
import { formatNumber, formatPercent } from "@/utils/formatters";
import { useAnchoredTooltip } from "@/composables/useAnchoredTooltip";

const props = defineProps<{ upgradeId: string }>();

const { t } = useI18n();
const game = useGameStore();

const def = computed(() => UPGRADE_DEFINITIONS.find((d) => d.id === props.upgradeId)!);
const affordable = computed(() => game.canAffordUpgrade(props.upgradeId));

const nameKey = computed(() => `upgrades.names.${props.upgradeId}` as Parameters<typeof t>[0]);
const descKey = computed(() => `upgrades.descriptions.${props.upgradeId}` as Parameters<typeof t>[0]);

// A compact label for the tile face — the tooltip (below) spells out the
// full effect in words. formatPercent (not Math.round): synergy/booster
// perks step by fractions of a percent, so whole-percent rounding would
// misrepresent a half-step tier the same way it would for the PhD discount.
const effectLabel = computed(() => {
  const d = def.value;
  if (!d) return "";
  switch (d.family) {
    case "flat":
      return `+${formatNumber(d.effect)}`;
    case "multiplier":
      return `×${d.effect}`;
    case "synergy":
      return `+${formatPercent(d.effect * 100)}%`;
    case "crit":
      return `${formatPercent((d.critChance ?? 0) * 100)}% ×${d.critMultiplier}`;
    case "boosterDuration":
    case "boosterSpawn":
      return `+${formatPercent(d.effect * 100)}%`;
    default:
      return "";
  }
});

// Whole-tile hover/focus opens the tooltip (unlike UnitCard's dedicated
// info-button icon) — there's no room for a second interactive element in a
// compact square tile, and the tile itself isn't draggable/scrollable
// content that hover would otherwise conflict with.
const {
  anchorRef,
  visible: tooltipVisible,
  tooltipId,
  style: tooltipStyle,
  onEnter,
  onLeave,
  onFocus,
  onBlur
} = useAnchoredTooltip(200);

function buy() {
  if (!affordable.value) return;
  game.buyUpgrade(props.upgradeId);
}
</script>

<template>
  <button
    ref="anchorRef"
    type="button"
    class="upgrade-tile"
    :class="{ affordable }"
    :disabled="!affordable"
    :aria-describedby="tooltipVisible ? tooltipId : undefined"
    @click="buy"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focus="onFocus"
    @blur="onBlur"
  >
    <span class="tile-name">{{ t(nameKey) }}</span>
    <span class="tile-effect">{{ effectLabel }}</span>
    <span class="tile-cost">{{ formatNumber(def.cost) }}</span>
  </button>

  <Teleport to="body">
    <Transition name="tip">
      <div
        v-if="tooltipVisible"
        :id="tooltipId"
        class="tooltip"
        role="tooltip"
        :style="tooltipStyle ?? undefined"
      >
        <div class="tip-name">{{ t(nameKey) }}</div>
        <div class="tip-desc">{{ t(descKey) }}</div>
        <div class="tip-divider"></div>
        <div class="tip-row">
          <span>{{ t("upgrades.tooltipCost") }}</span>
          <span class="tip-val">{{ formatNumber(def.cost) }}</span>
        </div>
        <div class="tip-row">
          <span>{{ t("upgrades.tooltipEffect") }}</span>
          <span class="tip-val accent">{{ effectLabel }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.upgrade-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  aspect-ratio: 1;
  padding: 8px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
  text-align: center;
}

.upgrade-tile.affordable {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-glow);
}

.upgrade-tile.affordable:hover {
  background: var(--bg-hover);
  box-shadow: 0 4px 14px var(--accent-glow);
}

.upgrade-tile:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tile-name {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tile-effect {
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-text);
}

.tile-cost {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.upgrade-tile:disabled .tile-cost {
  color: var(--btn-dis-text);
}

/* tooltip — same positioning/teleport approach as UnitCard's (see
   useAnchoredTooltip), duplicated styling only (no shared CSS module exists
   in this codebase — see MultiplierSelector's own note on the segmented
   control pattern being duplicated rather than extracted). */
.tooltip {
  position: fixed;
  width: 200px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  z-index: 600;
  pointer-events: none;
}

.tip-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-text);
  margin-bottom: 4px;
}

.tip-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 10px;
}

.tip-divider {
  height: 1px;
  background: var(--border-subtle);
  margin-bottom: 8px;
}

.tip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.tip-val {
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.tip-val.accent {
  color: var(--accent-text);
}

.tip-enter-active,
.tip-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.tip-enter-from,
.tip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
