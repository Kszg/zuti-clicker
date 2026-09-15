import { prisma } from "../prisma";
import {
  BOOSTER_IDS,
  BOOSTER_WEIGHTS,
  BOOSTER_DURATION_SECS,
  BOOSTER_COOLDOWN_MIN_SECS,
  BOOSTER_COOLDOWN_MAX_SECS,
  type BoosterId
} from "../../constants/boosters";
import { CONFERENCE_BADGE_DURATION_BONUS, DEPARTMENT_NEWSLETTER_COOLDOWN_BONUS } from "../../constants/upgrades";

// Keep this algorithm in sync with frontend/src/utils/upgrades.ts's
// pickWeightedBoosterId (the guest-mode mirror of this same selection) —
// the BOOSTER_WEIGHTS constants already carry a sync comment, but the
// selection logic itself doesn't share one across the boundary.
function pickWeightedBoosterId(): BoosterId {
  const totalWeight = BOOSTER_IDS.reduce((sum, id) => sum + BOOSTER_WEIGHTS[id], 0);
  let roll = Math.random() * totalWeight;
  for (const id of BOOSTER_IDS) {
    roll -= BOOSTER_WEIGHTS[id];
    if (roll < 0) return id;
  }
  // Floating-point fallback — should be unreachable, the loop above covers
  // the full [0, totalWeight) range.
  return BOOSTER_IDS[BOOSTER_IDS.length - 1]!;
}

/** A fresh random cooldown, shortened by departmentNewsletter if owned. */
function rollCooldownMs(ownedUpgradeIds: Set<string>): number {
  const base =
    BOOSTER_COOLDOWN_MIN_SECS + Math.random() * (BOOSTER_COOLDOWN_MAX_SECS - BOOSTER_COOLDOWN_MIN_SECS);
  const multiplier = ownedUpgradeIds.has("departmentNewsletter")
    ? 1 + DEPARTMENT_NEWSLETTER_COOLDOWN_BONUS
    : 1;
  return (base / multiplier) * 1000;
}

export type ClaimResult =
  | { ok: true; boosterId: BoosterId; remainingMs: number; nextAvailableInMs: number }
  | { ok: false; reason: "no_save" }
  | { ok: false; reason: "on_cooldown"; nextAvailableInMs: number };

/**
 * Grants a random booster if — and only if — the account's cooldown
 * (GameSave.nextBoosterAt) has elapsed. This is the entire anti-cheat
 * surface for boosters: no request body is ever read, the booster type and
 * its duration are chosen here, and the new cooldown is a fresh server-side
 * random draw. A client cannot assert, choose, or extend a buff — see the
 * plan this implements.
 */
export async function claimBooster(userId: number): Promise<ClaimResult> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const save = await tx.gameSave.findUnique({
      where: { userId },
      include: { upgrades: true }
    });
    if (!save) return { ok: false, reason: "no_save" };

    if (save.nextBoosterAt > now) {
      return {
        ok: false,
        reason: "on_cooldown",
        nextAvailableInMs: save.nextBoosterAt.getTime() - now.getTime()
      };
    }

    // conferenceBadge/departmentNewsletter are read from the player's own
    // (client-asserted, but server-persisted) UpgradeSave rows — a bounded,
    // documented limitation: a forged upgrade only ever grants what could
    // have been bought legitimately, never more.
    const ownedUpgradeIds = new Set(save.upgrades.map((u) => u.upgradeId));

    const boosterId = pickWeightedBoosterId();
    const durationMultiplier = ownedUpgradeIds.has("conferenceBadge")
      ? 1 + CONFERENCE_BADGE_DURATION_BONUS
      : 1;
    const remainingMs = BOOSTER_DURATION_SECS[boosterId] * 1000 * durationMultiplier;
    const expiresAt = new Date(now.getTime() + remainingMs);

    const nextAvailableInMs = rollCooldownMs(ownedUpgradeIds);
    const nextBoosterAt = new Date(now.getTime() + nextAvailableInMs);

    // Atomic conditional claim — this, not the read above, is what actually
    // enforces the cooldown: the WHERE clause is re-checked against the
    // row's live value at UPDATE time (InnoDB locks the row for the
    // duration of the statement), so two requests racing the read above can
    // no longer both pass. Only one updateMany can match before
    // nextBoosterAt moves into the future; the loser's count is 0.
    const claimed = await tx.gameSave.updateMany({
      where: { id: save.id, nextBoosterAt: { lte: now } },
      data: { nextBoosterAt, boostersCollected: { increment: 1 } }
    });

    if (claimed.count === 0) {
      // Lost the race to a concurrent claim between the read above and this
      // write — re-read so the reported cooldown reflects what actually won,
      // not the stale value this request saw.
      const fresh = await tx.gameSave.findUniqueOrThrow({ where: { id: save.id } });
      return {
        ok: false,
        reason: "on_cooldown",
        nextAvailableInMs: Math.max(0, fresh.nextBoosterAt.getTime() - Date.now())
      };
    }

    await tx.activeBooster.upsert({
      where: { gameSaveId_boosterId: { gameSaveId: save.id, boosterId } },
      create: { gameSaveId: save.id, boosterId, expiresAt },
      update: { expiresAt }
    });

    return { ok: true, boosterId, remainingMs, nextAvailableInMs };
  });
}
