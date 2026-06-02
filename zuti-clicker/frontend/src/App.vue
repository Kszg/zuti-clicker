<script setup lang="ts">
import AppHeader from "@/components/layout/AppHeader.vue";
import StatusColumn from "@/components/status/StatusColumn.vue";
import ClickerArea from "@/components/clicker/ClickerArea.vue";
import UnitsPanel from "@/components/units/UnitsPanel.vue";
import { useGameLoop } from "@/composables/useGameLoop";

useGameLoop();
</script>

<template>
  <div class="app">
    <AppHeader />
    <div class="game-layout">
      <StatusColumn />
      <ClickerArea />
      <UnitsPanel />
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.game-layout {
  display: grid;
  grid-template-columns: 252px 1fr 288px;
  flex: 1;
  overflow: hidden;
}
</style>
