-- AddUpgradesAndBoosters
-- Additive only: every new column is NOT NULL DEFAULT, and both new tables
-- are optional 1:N children of GameSave (empty until a client writes to
-- them) — the currently deployed API neither reads nor writes any of this,
-- so it keeps working unchanged.

-- Booster anti-cheat state on GameSave. `nextBoosterAt` is the earliest
-- instant POST /boosters/claim may succeed at; defaulting it to "now" makes
-- every pre-existing row immediately claimable, which is the correct
-- backfill (nobody has a cooldown in progress yet). `boostersCollected` is a
-- lifetime counter, mirroring phdCount/prestigeCount's shape.
ALTER TABLE `GameSave`
    ADD COLUMN `boostersCollected` INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN `nextBoosterAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- One-time click-power purchases (flat/multiplier/synergy/crit/booster
-- families). Unlike UnitSave there is no `owned` count — a row's mere
-- presence means the upgrade is bought. Reset (deleted wholesale) on
-- prestige, same lifecycle as UnitSave.
CREATE TABLE `UpgradeSave` (
    `id`         INTEGER     NOT NULL AUTO_INCREMENT,
    `gameSaveId` INTEGER     NOT NULL,
    `upgradeId`  VARCHAR(32) NOT NULL,

    UNIQUE INDEX `UpgradeSave_gameSaveId_upgradeId_key`(`gameSaveId`, `upgradeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Server-issued, server-timed booster buffs. Never written by PUT /save —
-- the client cannot assert or extend a buff, only POST /boosters/claim
-- (rate-limited by GameSave.nextBoosterAt) can create or refresh one.
CREATE TABLE `ActiveBooster` (
    `id`         INTEGER     NOT NULL AUTO_INCREMENT,
    `gameSaveId` INTEGER     NOT NULL,
    `boosterId`  VARCHAR(32) NOT NULL,
    `expiresAt`  DATETIME(3) NOT NULL,

    UNIQUE INDEX `ActiveBooster_gameSaveId_boosterId_key`(`gameSaveId`, `boosterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
-- Cascade (like UnitSave): both tables are meaningless without their parent
-- GameSave, so deleting a save cleans them up too.
ALTER TABLE `UpgradeSave` ADD CONSTRAINT `UpgradeSave_gameSaveId_fkey`
    FOREIGN KEY (`gameSaveId`) REFERENCES `GameSave`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActiveBooster` ADD CONSTRAINT `ActiveBooster_gameSaveId_fkey`
    FOREIGN KEY (`gameSaveId`) REFERENCES `GameSave`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
