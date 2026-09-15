<script setup lang="ts">
import { formatGain } from "@/utils/formatters";

withDefaults(defineProps<{ x: number; y: number; amount: number; crit?: boolean }>(), {
  crit: false
});
</script>

<template>
  <div class="float-num" :class="{ crit }" :style="{ left: `${x}px`, top: `${y}px` }">
    +{{ formatGain(amount) }}
  </div>
</template>

<style scoped>
.float-num {
  position: fixed;
  pointer-events: none;
  z-index: 200;
  font-size: 22px;
  font-weight: 900;
  color: var(--accent-text);
  text-shadow: 0 0 12px var(--accent-glow);
  animation: floatUp 0.75s ease-out forwards;
  white-space: nowrap;
  user-select: none;
}

/* A critical click's floating number is visually distinct from a normal
   click — the booster/"special" accent (see base.css) and a bigger size, but
   the same floatUp motion so it doesn't need its own reduced-motion entry. */
.float-num.crit {
  font-size: 28px;
  color: var(--booster);
  text-shadow: 0 0 16px var(--booster-glow);
}
</style>
