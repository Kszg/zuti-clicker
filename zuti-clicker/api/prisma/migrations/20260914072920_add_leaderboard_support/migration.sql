-- AddLeaderboardSupport
-- Additive only: the new column is NOT NULL DEFAULT, and indexes never
-- change query results, only their speed — the currently deployed API
-- keeps working unchanged.

-- Per-player opt-out: when true, this player's GameSave rows are excluded
-- from every other player's leaderboard view (they can still see their own
-- rank/value on their own leaderboard request).
ALTER TABLE `UserSettings`
    ADD COLUMN `hideFromLeaderboards` BOOLEAN NOT NULL DEFAULT false;

-- Leaderboard queries sort GameSave by one of these columns DESC LIMIT N —
-- one index per ranked metric keeps that from becoming a full table scan.
CREATE INDEX `GameSave_totalTokensEarned_idx` ON `GameSave` (`totalTokensEarned`);
CREATE INDEX `GameSave_totalClicks_idx`       ON `GameSave` (`totalClicks`);
CREATE INDEX `GameSave_phdCount_idx`          ON `GameSave` (`phdCount`);
CREATE INDEX `GameSave_elapsedSeconds_idx`    ON `GameSave` (`elapsedSeconds`);
