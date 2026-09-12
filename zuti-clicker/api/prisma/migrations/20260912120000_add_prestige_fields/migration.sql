-- AddPrestigeColumns
-- Additive only: every column is NOT NULL DEFAULT, so the currently deployed
-- API (which never selects or writes them) keeps working unchanged.
ALTER TABLE `GameSave`
    ADD COLUMN `phdCount`        INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `prestigeCount`   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `runTokensEarned` DOUBLE  NOT NULL DEFAULT 0,
    ADD COLUMN `runClicks`       INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `runSeconds`      DOUBLE  NOT NULL DEFAULT 0;

-- Backfill existing saves: nobody has prestiged yet, so the current run is
-- the whole lifetime. Guarded so a re-run cannot clobber live data.
UPDATE `GameSave`
SET `runTokensEarned` = `totalTokensEarned`,
    `runClicks`       = `totalClicks`,
    `runSeconds`      = `elapsedSeconds`
WHERE `prestigeCount`   = 0
  AND `runTokensEarned` = 0
  AND `runClicks`       = 0
  AND `runSeconds`      = 0;
