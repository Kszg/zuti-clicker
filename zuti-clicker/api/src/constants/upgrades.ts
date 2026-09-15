// Keep this id set in sync with frontend/src/utils/gameConstants.ts's
// UPGRADE_DEFINITIONS. The API only needs to know which ids are valid — for
// PUT /save's allowlist check, and for the two that affect the booster
// system below — every other balance number (cost, click effect) lives
// purely client-side, exactly like UNIT_DEFINITIONS never reaching the API
// at all.
export const KNOWN_UPGRADE_IDS = [
  "chalk",
  "redPen",
  "laserPointer",
  "overheadProjector",
  "firmHandshake",
  "morningCoffee",
  "officeHours",
  "tenure",
  "honoraryDegree",
  "lectureNotes",
  "seminarRoom",
  "researchGrant",
  "facultyBoard",
  "luckyGuess",
  "openBookExam",
  "peerReview",
  "conferenceBadge",
  "departmentNewsletter"
] as const;

export type UpgradeId = (typeof KNOWN_UPGRADE_IDS)[number];

export function isKnownUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === "string" && (KNOWN_UPGRADE_IDS as readonly string[]).includes(value);
}

// The two booster-system perks, read directly off the player's owned
// upgrades by database/models/boosters.ts when computing a claimed
// booster's duration/cooldown — duplicates of the same effect values in
// frontend/src/utils/gameConstants.ts's UPGRADE_DEFINITIONS. Applied
// server-side so departmentNewsletter's faster cooldown actually moves
// GameSave.nextBoosterAt, not just the client's cosmetic spawn schedule.
export const CONFERENCE_BADGE_DURATION_BONUS = 0.3;
export const DEPARTMENT_NEWSLETTER_COOLDOWN_BONUS = 1 / 3;
