<script setup lang="ts">
import { computed, ref, useId, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "@/stores/gameStore";
import { SKIN_DEFINITIONS } from "@/utils/gameConstants";
import { formatNumber } from "@/utils/formatters";
import { SkinButtonState } from "@/types";

const props = defineProps<{ skinId: string }>();

const { t } = useI18n();
const game = useGameStore();

const def = computed(() => SKIN_DEFINITIONS.find((d) => d.id === props.skinId)!);
const state = computed(() => game.skinStates.find((u) => u.id === props.skinId)!);
const owned = computed(() => state.value.owned ?? false);

const nameKey = computed(() => `skin.names.${props.skinId}` as Parameters<typeof t>[0]);
const imgPath = computed(
  () => new URL(`../../assets/images/skin/${def.value.imagePath}`, import.meta.url).href,
);

const buttonState = computed(() => {
  if (game.activeSkinId === props.skinId) {
    return SkinButtonState.Active;
  }
  else {
    if (owned) {
      return SkinButtonState.Owned;
    }
    else {
      return SkinButtonState.Buyable;
    }
  }
})
</script>

<template>
  <Transition name="unit-appear">
    <div class="skin-card">
      <!-- left: info -->
      <div class="skin-info">
        <div class="skin-name-row">
          <img class="skin-thumbnail" :src="imgPath" :alt="t(nameKey)">
          <span class="skin-name">{{ t(nameKey) }}</span>
        </div>
      </div>

      <!-- right: buy button -->
      <button class="buy-btn" :disabled="buttonState === SkinButtonState.Active">
        <div class="btn-cond-wrapper" v-if="buttonState == SkinButtonState.Buyable">
          <span class="btn-mult">Buy</span>
          <span class="btn-cost">{{ formatNumber(def.cost) }}</span>
        </div>

        <div class="btn-cond-wrapper" v-if="buttonState == SkinButtonState.Owned">
          <span class="btn-mult">Use</span>
          <span class="btn-cost"> </span>
        </div>

        <div class="btn-cond-wrapper" v-if="buttonState == SkinButtonState.Active">
          <span class="btn-mult">Active</span>
          <span class="btn-cost"> </span>
        </div>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.skin-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition-fast);
}

.skin-card:hover {
  background: var(--bg-elevated);
}

.skin-card.affordable {
  border-left: 2px solid var(--accent);
}

.skin-card.affordable:hover {
  background: var(--bg-hover);
}

/* info */
.skin-info {
  flex: 1;
  min-width: 0;
}

.skin-thumbnail {
  border-radius: 5px;
  height: 50px;
}

.skin-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.skin-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  /* white-space: nowrap; */
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.info-btn {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  transition: color var(--transition-fast);
  position: relative;
}
.info-btn:hover,
.info-btn:focus-visible {
  color: var(--accent-text);
}

/* The 20px icon is a precise, small hover target on purpose — hovering
   near-but-not-on it must not open the tooltip. An earlier version padded
   the hit target out to 44px unconditionally (a transparent ::before) for
   touch reachability, but that same padding is exactly what let a mouse
   trigger it from noticeably off the visible icon. Touch has no such
   precision concern (a tap is a single contact point, not "near" anything
   the way a mouse can hover past), so the padding now only applies on
   devices that can't hover at all. */
@media (hover: none) and (pointer: coarse) {
  .info-btn::before {
    content: "";
    position: absolute;
    inset: -12px;
  }
}

.skin-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.owned-count {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent-text);
  font-variant-numeric: tabular-nums;
}

.owned-label {
  font-size: 11px;
  color: var(--text-muted);
}

.prod-badge {
  margin-left: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  padding: 1px 6px;
}

/* buy button */
.buy-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 68px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--btn-buy-bg);
  color: var(--btn-buy-text);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.buy-btn:hover:not(:disabled) {
  filter: brightness(1.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px var(--accent-glow);
}

.buy-btn:active:not(:disabled) {
  transform: translateY(0);
}

.buy-btn:disabled {
  background: var(--btn-dis-bg);
  cursor: not-allowed;
}

.btn-mult {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.75;
  line-height: 1.2;
}

.buy-btn:disabled .btn-mult,
.buy-btn:disabled .btn-cost {
  color: var(--btn-dis-text);
}

.btn-cost {
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.btn-cond-wrapper > span {
  display: block;
}

@media (max-width: 759px) {
  /* This panel becomes a touch-driven mobile sheet at this width (see
     App.vue) — the buy button's desktop sizing runs a little short of a
     comfortable touch target. */
  .buy-btn {
    min-height: 44px;
  }
}

/* tooltip — position:fixed, top/left set inline from the info button's own
   getBoundingClientRect() (see positionTooltip() above), clamped to the
   viewport. Teleported to <body> so it isn't clipped by the shop panel's
   `overflow-y: auto`, nor (at mobile widths) repositioned by the mobile
   sheet's own `transform`, which would otherwise become this element's
   containing block instead of the viewport. */
.tooltip {
  position: fixed;
  width: 220px;
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

/* transitions */
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

.unit-appear-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.unit-appear-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
</style>
