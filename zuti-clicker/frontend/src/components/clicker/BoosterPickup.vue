<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

// Deliberately no boosterId prop — the pickup's type stays a mystery until
// claimed (see composables/useBoosters.ts and the anti-cheat model in the
// plan this implements: a logged-in claim is resolved server-side, so the
// client genuinely doesn't know which booster it'll get).
const props = defineProps<{ xPct: number; yPct: number; visibleMs: number }>();
const emit = defineEmits<{ claim: [] }>();
const { t } = useI18n();

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const anchorStyle = computed(() => ({ left: `${props.xPct}%`, top: `${props.yPct}%` }));
const ringStyle = computed(() => ({
  strokeDasharray: `${CIRCUMFERENCE}px`,
  "--ring-circumference": `${CIRCUMFERENCE}px`,
  "--visible-duration": `${props.visibleMs}ms`
}));
</script>

<template>
  <div class="booster-anchor" :style="anchorStyle">
    <button
      class="booster-pickup"
      type="button"
      :aria-label="t('boosters.pickupAriaLabel')"
      @click="emit('claim')"
    >
      <svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle class="ring-track" cx="18" cy="18" r="15" />
        <circle class="ring-progress" cx="18" cy="18" r="15" :style="ringStyle" />
      </svg>
      <span class="icon" aria-hidden="true">⚡</span>
    </button>
  </div>
</template>

<style scoped>
/* Positioning lives on this static, unanimated wrapper — keeping the
   centering transform separate from the button's own entrance/pulse
   transform below avoids the two fighting over the same CSS property. */
.booster-anchor {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 250;
}

.booster-pickup {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 2px solid var(--booster);
  box-shadow: 0 0 18px var(--booster-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  animation:
    fadeScaleIn 220ms ease both,
    boosterPulse 1.6s ease-in-out infinite 220ms;
}

.icon {
  font-size: 20px;
  filter: drop-shadow(0 0 6px var(--booster-glow));
}

.ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
}

.ring-track {
  fill: none;
  stroke: var(--border-subtle);
  stroke-width: 2;
}

/* Shrinks from a full ring to empty over the pickup's visible window, so the
   player can see it's about to disappear. stroke-dashoffset is a paint-only
   property (no layout impact), same performance class as the transform/
   opacity the rest of the app animates. */
.ring-progress {
  fill: none;
  stroke: var(--booster);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dashoffset: 0;
  animation: boosterRingShrink var(--visible-duration) linear forwards;
}

@keyframes boosterPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

@keyframes boosterRingShrink {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: var(--ring-circumference);
  }
}

@media (prefers-reduced-motion: reduce) {
  .booster-pickup {
    animation: fadeIn 220ms ease both;
  }
}
</style>
