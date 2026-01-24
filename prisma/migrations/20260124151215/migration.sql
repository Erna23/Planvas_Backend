/*
  Warnings:

  - You are about to drop the `reports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `reports` DROP FOREIGN KEY `FK_Goals_TO_Reports_1`;

-- DropForeignKey
ALTER TABLE `reports` DROP FOREIGN KEY `FK_user_TO_Reports_1`;

-- AlterTable
ALTER TABLE `goal_period` ADD COLUMN `presetId` INTEGER NULL,
    MODIFY `preset_type` VARCHAR(20) NOT NULL DEFAULT 'CUSTOM';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `refresh_token` TEXT NULL;

-- DropTable
DROP TABLE `reports`;

-- CreateTable
CREATE TABLE `user_activity` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `google_event_id` VARCHAR(255) NULL,
    `title` VARCHAR(200) NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'FIXED',
    `status` VARCHAR(20) NOT NULL DEFAULT 'TODO',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_activity_google_event_id_key`(`google_event_id`),
    INDEX `user_activity_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `d_day_enabled` BOOLEAN NOT NULL DEFAULT true,
    `activity_completion_enabled` BOOLEAN NOT NULL DEFAULT true,
    `fcm_token` VARCHAR(255) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_setting_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `interest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `interest_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_activity` ADD CONSTRAINT `user_activity_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_setting` ADD CONSTRAINT `notification_setting_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
