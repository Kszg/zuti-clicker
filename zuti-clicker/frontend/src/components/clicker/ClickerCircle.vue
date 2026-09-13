<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const emit = defineEmits<{ click: [payload: { x: number; y: number }] }>();

const circleRef = ref<HTMLElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);

// A press restarts the pop animation immediately, even mid-flight of a
// previous one — the old code guarded against re-entrancy with `if (active)
// return`, which meant a spam-clicked circle only ever animated its first
// click and looked dead for every click after. Removing and re-adding the
// class across a forced reflow retriggers the CSS animation every time.
let popTimer: ReturnType<typeof setTimeout> | null = null;
function restartPop() {
  const el = circleRef.value;
  if (!el) return;
  if (popTimer) clearTimeout(popTimer);
  el.classList.remove("circle-pop");
  void el.offsetWidth; // force reflow so the next class add restarts the keyframe
  el.classList.add("circle-pop");
  popTimer = setTimeout(() => el.classList.remove("circle-pop"), 220);
}

// Concentric pulse rings as keyed, self-removing entries (same pattern
// ClickerArea already uses for floating numbers), so overlapping clicks each
// get their own ring that plays to completion instead of one ring fighting a
// restart. Capped so spam-clicking can't grow the DOM without bound.
const MAX_RINGS = 6;
const RING_LIFETIME_MS = 400;
const rings = ref<{ id: number }[]>([]);
let ringUid = 0;
function spawnRing() {
  const id = ringUid++;
  if (rings.value.length >= MAX_RINGS) rings.value.shift();
  rings.value.push({ id });
  setTimeout(() => {
    const i = rings.value.findIndex((r) => r.id === id);
    if (i !== -1) rings.value.splice(i, 1);
  }, RING_LIFETIME_MS);
}

function registerClick(x: number, y: number) {
  emit("click", { x, y });
  restartPop();
  spawnRing();
}

// A single click must count once, however it was triggered — pointerdown
// (mouse/touch/pen) or a keyboard Enter/Space activating the native <button>.
// pointerdown handles the pointer case immediately (snappier under spam than
// waiting for pointerup/click), and sets a short-lived flag so the "click"
// event the browser fires right after doesn't double-count it. The flag is
// also cleared on a 0ms timeout rather than left to linger indefinitely: a
// right-click never produces a "click" event (only the primary button does),
// so without this a right-click followed immediately by a keyboard activation
// would be silently swallowed by a stale flag.
let pointerHandledClick = false;

function handlePointerDown(e: PointerEvent) {
  // Only the primary (left) and secondary (right) buttons earn a token;
  // middle/back/forward are ignored so autoscroll and browser navigation
  // gestures still work when they happen to land on the circle.
  if (e.button !== 0 && e.button !== 2) return;
  pointerHandledClick = true;
  setTimeout(() => {
    pointerHandledClick = false;
  }, 0);
  registerClick(e.clientX, e.clientY);
}

function handleClick(e: MouseEvent) {
  if (pointerHandledClick) {
    pointerHandledClick = false;
    return;
  }
  // Keyboard-triggered activation: MouseEvent.clientX/Y are 0 for a
  // synthetic click, so anchor the floating number to the circle's own
  // center instead of the viewport origin.
  const rect = wrapperRef.value?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : e.clientX;
  const y = rect ? rect.top + rect.height / 2 : e.clientY;
  registerClick(x, y);
}
</script>

<template>
  <button
    ref="wrapperRef"
    type="button"
    class="circle-wrap"
    :aria-label="t('clicker.ariaLabel')"
    @pointerdown="handlePointerDown"
    @click="handleClick"
    @contextmenu.prevent
    @dragstart.prevent
  >
    <!-- idle hover rings -->
    <div class="ring ring-1"></div>
    <div class="ring ring-2"></div>

    <!-- per-click pulse bursts -->
    <template v-for="r in rings" :key="r.id">
      <div class="ring ring-1 ring-burst"></div>
      <div class="ring ring-2 ring-burst"></div>
    </template>

    <!-- ambient glow, isolated from the click-pop animation so the two never
         fight over the `animation` shorthand on the same element -->
    <div class="glow-layer" aria-hidden="true"></div>

    <div ref="circleRef" class="circle">
      <div class="circle-inner">
        <img
          src="@/assets/images/zutiy.jpg"
          alt="Dr. Zuti Pál, Digitális kor győztese"
          draggable="false"
        />
      </div>
    </div>
  </button>
</template>

<style scoped>
.circle-wrap {
  position: relative;
  width: 220px;
  height: 220px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  padding: 0;
}

.glow-layer {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  pointer-events: none;
  animation: breathe 3.5s ease-in-out infinite;
}

.circle {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 38%, var(--bg-elevated), var(--bg-card));
  border: 2px solid var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
  position: relative;
  z-index: 1;
}

.circle-wrap:hover .circle {
  border-color: var(--accent-text);
  box-shadow:
    0 0 48px var(--accent-glow),
    0 0 80px var(--accent-glow);
}

.circle.circle-pop {
  animation: clickPop 0.22s ease both;
  box-shadow: 0 0 64px var(--accent-glow);
}

.circle-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-inner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  -webkit-user-drag: none;
  user-select: none;
  pointer-events: none;
}

/* rings */
.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--accent);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.ring-1 {
  width: 224px;
  height: 224px;
}
.ring-2 {
  width: 250px;
  height: 250px;
}

.circle-wrap:hover .ring-1 {
  opacity: 0.25;
}
.circle-wrap:hover .ring-2 {
  opacity: 0.1;
}

.ring-burst {
  animation: pulseRing 0.4s ease-out both;
}
</style>
