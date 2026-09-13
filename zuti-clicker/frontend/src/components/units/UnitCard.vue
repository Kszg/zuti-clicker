<script setup lang="ts">
import { computed, ref, useId, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "@/stores/gameStore";
import { UNIT_DEFINITIONS } from "@/utils/gameConstants";
import { getMaxBuyable } from "@/utils/costCalculator";
import { formatNumber, formatRate } from "@/utils/formatters";
import type { Multiplier } from "@/types";

const props = defineProps<{ unitId: string; multiplier: Multiplier }>();

const { t } = useI18n();
const game = useGameStore();

const def = computed(() => UNIT_DEFINITIONS.find((d) => d.id === props.unitId)!);
const state = computed(() => game.unitStates.find((u) => u.id === props.unitId)!);
const owned = computed(() => state.value?.owned ?? 0);

const effectiveAmount = computed(() => {
  if (!def.value) return 0;
  if (props.multiplier === "max") {
    return getMaxBuyable(def.value, owned.value, game.tokens, game.costMultiplier);
  }
  return props.multiplier;
});

const cost = computed(() => game.getBuyCost(props.unitId, props.multiplier));
const affordable = computed(() => game.canAfford(props.unitId, props.multiplier));
const gainPerS = computed(() => game.getProductionGain(props.unitId, props.multiplier));

const visible = computed(() => game.isUnitRevealed(props.unitId));

const nameKey = computed(() => `units.names.${props.unitId}` as Parameters<typeof t>[0]);
const descKey = computed(() => `units.descriptions.${props.unitId}` as Parameters<typeof t>[0]);

function buy() {
  if (!affordable.value || effectiveAmount.value === 0) return;
  game.buyUnit(props.unitId, props.multiplier);
}

const btnLabel = computed(() => {
  if (props.multiplier === "max") {
    return effectiveAmount.value > 0 ? `×${effectiveAmount.value}` : "—";
  }
  return `×${props.multiplier}`;
});

// Tooltip: visible on a pointer hovering anywhere on the card (unchanged),
// or on focus of the dedicated info button below (keyboard Tab, or a touch
// tap — tapping a button focuses it, so this is also how touch reveals it;
// tapping elsewhere blurs it closed, giving touch a natural dismiss with no
// extra affordance needed).
const hovered = ref(false);
const focused = ref(false);
const tooltipVisible = computed(() => hovered.value || focused.value);
const tooltipId = useId();

// Positioned via a viewport-relative rect rather than `right: calc(100% +
// 10px)` (the old approach): that hangs the tooltip into the rail's *left*
// neighbor, which is fine on the desktop 3-column shell but runs the
// tooltip off-screen once UnitsPanel becomes a near-full-width mobile sheet.
// Computing this from the info button's own rect — and teleporting the
// tooltip to <body> — works the same in both layouts and isn't clipped by
// the sheet's `overflow-y: auto` or (at mobile widths) the sheet's own
// `transform`, which would otherwise redefine the containing block for a
// plain `position: fixed` descendant.
const infoBtnRef = ref<HTMLElement | null>(null);
const tooltipStyle = ref<{ top: string; left: string } | null>(null);
const TOOLTIP_WIDTH = 220;
const VIEWPORT_MARGIN = 8;

function positionTooltip() {
  const el = infoBtnRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN));
  tooltipStyle.value = { top: `${rect.bottom + 8}px`, left: `${left}px` };
}

function onCardEnter() {
  hovered.value = true;
  positionTooltip();
}

function onInfoFocus() {
  focused.value = true;
  positionTooltip();
}

// The tooltip's position is computed once, on open — it doesn't track the
// anchor continuously. Scrolling the shop list (or the page) while it's open
// would leave it visually detached from the card it describes, so close it
// instead of letting it go stale. A capture-phase listener catches scrolling
// on the shop panel's own `overflow-y: auto` list, which doesn't bubble to
// window as a normal listener would need.
function closeTooltip() {
  hovered.value = false;
  focused.value = false;
}
window.addEventListener("scroll", closeTooltip, true);
window.addEventListener("resize", closeTooltip);
onUnmounted(() => {
  window.removeEventListener("scroll", closeTooltip, true);
  window.removeEventListener("resize", closeTooltip);
});
</script>

<template>
  <Transition name="unit-appear">
    <div
      v-if="visible"
      class="unit-card"
      :class="{ affordable }"
      @mouseenter="onCardEnter"
      @mouseleave="hovered = false"
    >
      <!-- left: info -->
      <div class="unit-info">
        <div class="unit-name-row">
          <span class="unit-name">{{ t(nameKey) }}</span>
          <button
            ref="infoBtnRef"
            type="button"
            class="info-btn"
            :aria-label="t('units.moreInfo')"
            :aria-describedby="tooltipVisible ? tooltipId : undefined"
            @focus="onInfoFocus"
            @blur="focused = false"
          >
            ⓘ
          </button>
        </div>
        <div class="unit-sub">
          <span class="owned-count">{{ owned }}</span>
          <span class="owned-label"> {{ t("units.owned") }}</span>
          <span class="prod-badge">{{ formatRate(def?.baseProduction ?? 0) }}/s</span>
        </div>
      </div>

      <!-- right: buy button -->
      <button class="buy-btn" :disabled="!affordable || effectiveAmount === 0" @click.stop="buy">
        <span class="btn-mult">{{ btnLabel }}</span>
        <span class="btn-cost">{{ formatNumber(cost) }}</span>
      </button>
    </div>
  </Transition>

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
          <span>{{ t("units.tooltipCost") }}</span>
          <span class="tip-val">{{ formatNumber(cost) }}</span>
        </div>
        <div v-if="effectiveAmount > 0" class="tip-row">
          <span>{{ t("units.tooltipGain") }}</span>
          <span class="tip-val accent">+{{ formatRate(gainPerS) }}/s</span>
        </div>
        <div class="tip-row">
          <span>{{ t("units.tooltipEach") }}</span>
          <span class="tip-val">{{ formatRate(def?.baseProduction ?? 0) }}/s</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.unit-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition-fast);
}

.unit-card:hover {
  background: var(--bg-elevated);
}

.unit-card.affordable {
  border-left: 2px solid var(--accent);
}

.unit-card.affordable:hover {
  background: var(--bg-hover);
}

/* info */
.unit-info {
  flex: 1;
  min-width: 0;
}

.unit-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.unit-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
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
  font-size: 12px;
  line-height: 1;
  transition: color var(--transition-fast);
  /* the visible circle is 20px, but the hit target is padded out to the
     44px touch-target minimum via a transparent ::before */
  position: relative;
}
.info-btn::before {
  content: "";
  position: absolute;
  inset: -12px;
}
.info-btn:hover,
.info-btn:focus-visible {
  color: var(--accent-text);
}

.unit-sub {
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
