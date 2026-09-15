<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useGameStore } from "@/stores/gameStore";
import { UPGRADE_DEFINITIONS } from "@/utils/gameConstants";
import UpgradeTile from "./UpgradeTile.vue";
import type { UpgradeFamily } from "@/types";

const { t } = useI18n();
const game = useGameStore();

// Display grouping is a UI-only concern (belongs here, not in
// gameConstants): boosterDuration/boosterSpawn are two distinct formula
// families but read as one "booster perks" section to the player.
const FAMILY_GROUPS: { key: string; families: UpgradeFamily[]; labelKey: Parameters<typeof t>[0] }[] = [
  { key: "flat", families: ["flat"], labelKey: "upgrades.familyFlat" },
  { key: "multiplier", families: ["multiplier"], labelKey: "upgrades.familyMultiplier" },
  { key: "synergy", families: ["synergy"], labelKey: "upgrades.familySynergy" },
  { key: "crit", families: ["crit"], labelKey: "upgrades.familyCrit" },
  { key: "booster", families: ["boosterDuration", "boosterSpawn"], labelKey: "upgrades.familyBooster" }
];

// Only revealed, not-yet-owned upgrades appear in the buy grid — an owned
// one moves to the compact strip below instead of lingering in the grid at
// a permanently-disabled "owned" state (see the plan's UI section). Order
// preserves UPGRADE_DEFINITIONS' own ascending-cost order within a family.
const visibleGroups = computed(() =>
  FAMILY_GROUPS.map((group) => ({
    ...group,
    upgrades: UPGRADE_DEFINITIONS.filter(
      (d) =>
        group.families.includes(d.family) &&
        !game.isUpgradeOwned(d.id) &&
        game.isUpgradeRevealed(d.id)
    )
  })).filter((group) => group.upgrades.length > 0)
);

const ownedUpgradeDefs = computed(() => UPGRADE_DEFINITIONS.filter((d) => game.isUpgradeOwned(d.id)));

const totalCount = UPGRADE_DEFINITIONS.length;
</script>

<template>
  <div class="upgrades-panel">
    <div class="upgrades-summary">
      {{ t("upgrades.ownedCount", { owned: ownedUpgradeDefs.length, total: totalCount }) }}
    </div>

    <p v-if="visibleGroups.length === 0 && ownedUpgradeDefs.length === 0" class="upgrades-empty">
      {{ t("upgrades.emptyHint") }}
    </p>

    <section v-for="group in visibleGroups" :key="group.key" class="upgrade-group">
      <h3 class="group-title">{{ t(group.labelKey) }}</h3>
      <div class="upgrade-grid">
        <UpgradeTile v-for="d in group.upgrades" :key="d.id" :upgrade-id="d.id" />
      </div>
    </section>

    <section v-if="ownedUpgradeDefs.length > 0" class="owned-strip">
      <h3 class="group-title">{{ t("upgrades.ownedTitle") }}</h3>
      <div class="owned-chips">
        <span v-for="d in ownedUpgradeDefs" :key="d.id" class="owned-chip">
          {{ t(`upgrades.names.${d.id}`) }}
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.upgrades-panel {
  padding: 10px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.upgrades-summary {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.upgrades-empty {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}

.upgrade-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: fadeScaleIn 220ms ease both;
}

.group-title {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.upgrade-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.owned-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--border-subtle);
}

.owned-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.owned-chip {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  padding: 4px 9px;
}

@media (max-width: 759px) {
  .upgrade-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
