-- CreateTable UserSettings
CREATE TABLE `UserSettings` (
    `id`                   INTEGER     NOT NULL AUTO_INCREMENT,
    `userId`               INTEGER     NOT NULL,
    `theme`                VARCHAR(16) NOT NULL DEFAULT 'dark',
    `language`             VARCHAR(16) NOT NULL DEFAULT 'en',
    `autosaveEnabled`      BOOLEAN     NOT NULL DEFAULT true,
    `autosaveIntervalSecs` INTEGER     NOT NULL DEFAULT 30,
    `prestigeCeremony`     VARCHAR(16) NOT NULL DEFAULT 'full',
    `updatedAt`            DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserSettings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
-- Cascade (unlike Authentication/GameSave, which are RESTRICT): settings are
-- meaningless without their owner, so deleting a user cleans them up too.
ALTER TABLE `UserSettings` ADD CONSTRAINT `UserSettings_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
