-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `oauth_id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `onboarding_completed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_email_key`(`email`),
    UNIQUE INDEX `user_provider_oauth_id_key`(`provider`, `oauth_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goal_period` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `growth` INTEGER NOT NULL,
    `rest` INTEGER NOT NULL,
    `preset_type` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `goal_period_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `interests` JSON NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profile_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `connect` BOOLEAN NOT NULL DEFAULT false,
    `provider` VARCHAR(20) NULL,
    `import_fixed_schedules` BOOLEAN NOT NULL DEFAULT false,
    `selected_event_ids` JSON NULL,
    `manual_fixed_schedules` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `calendar_setting_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reports` (
	`id`	int	NOT NULL AUTO_INCREMENT,
	`user_id`	INT	NOT NULL,
	`goal_id`	int	NOT NULL,
	`type`	varchar(20)	NOT NULL,
	`title`	varchar(100)	NULL,
	`sub_title`	varchar(255)	NULL,
	`snapshot_data`	json	NOT NULL	COMMENT '사용자가 일정 삭제해도 수치는 저장되도록',
	`created_at`	datetime	NOT NULL,

    UNIQUE INDEX `Reports_goal_id_idx`(`goal_id`), 
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `goal_period` ADD CONSTRAINT `goal_period_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_profile` ADD CONSTRAINT `user_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_setting` ADD CONSTRAINT `calendar_setting_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reports` ADD CONSTRAINT `FK_user_TO_Reports_1` FOREIGN KEY (`user_id`) REFERENCES `user` (	`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reports` ADD CONSTRAINT `FK_Goals_TO_Reports_1` FOREIGN KEY (`goal_id`) REFERENCES `goal_period` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;