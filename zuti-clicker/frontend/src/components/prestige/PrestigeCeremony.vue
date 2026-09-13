<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useUiStore } from "@/stores/uiStore";
import { usePrestige } from "@/composables/usePrestige";

const { t } = useI18n();
const ui = useUiStore();
const { dismissCeremony } = usePrestige();

const displayedGain = ref(0);
const settled = ref(false);
let rafId: number | null = null;

// Exponential ease-out count-up: fast at first, settling in — the number
// itself is the one authored moment here, so nothing else competes with it.
function animateCount(target: number, durationMs: number) {
  const start = performance.now();
  function step(now: number) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    displayedGain.value = Math.round(eased * target);
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      displayedGain.value = target;
      settled.value = true;
    }
  }
  rafId = requestAnimationFrame(step);
}

onMounted(() => {
  animateCount(ui.lastPrestigeGain, 900);
});

onUnmounted(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<template>
  <Teleport to="body">
    <div class="ceremony-backdrop">
      <div class="ring ring-1"></div>
      <div class="ring ring-2"></div>
      <div class="ring ring-3"></div>

      <div class="ceremony-content">
        <div class="cap" aria-hidden="true">🎓</div>
        <div class="gain-number">+{{ displayedGain }}</div>
        <div class="gain-label">{{ t("prestige.ceremonyGained") }}</div>
        <p class="subtext">{{ t("prestige.ceremonySubtext") }}</p>

        <Transition name="fade-in-up">
          <button v-if="settled" class="continue-btn" @click="dismissCeremony">
            {{ t("prestige.continueBtn") }}
          </button>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ceremony-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  animation: fadeIn 320ms ease;
  overflow: hidden;
}

.ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  transform: translate(-50%, -50%) scale(1);
  opacity: 0;
  animation: ceremonyPulse 2.6s ease-out infinite;
}
.ring-2 { animation-delay: 0.7s; }
.ring-3 { animation-delay: 1.4s; }

@keyframes ceremonyPulse {
  0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0.5; }
  100% { transform: translate(-50%, -50%) scale(3.2); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  @keyframes ceremonyPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }
}

.ceremony-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 24px;
}

.cap {
  font-size: 48px;
  animation: fadeScaleIn 500ms ease both;
  margin-bottom: 8px;
}

.gain-number {
  font-size: 72px;
  font-weight: 900;
  color: var(--accent);
  letter-spacing: -2px;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 48px var(--accent-glow);
  line-height: 1;
}

.gain-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  margin-top: 10px;
}

.subtext {
  margin-top: 20px;
  max-width: 380px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.continue-btn {
  margin-top: 36px;
  padding: 12px 28px;
  border-radius: var(--radius-sm);
  background: var(--btn-buy-bg);
  color: var(--btn-buy-text);
  font-size: 14px;
  font-weight: 700;
  transition: filter var(--transition-fast);
}
.continue-btn:hover {
  filter: brightness(1.1);
}

.fade-in-up-enter-active {
  transition:
    opacity 320ms ease,
    transform 320ms ease;
}
.fade-in-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
</style>
