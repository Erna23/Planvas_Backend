-- CreateTable
CREATE TABLE `notification_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `refType` VARCHAR(50) NOT NULL,
    `ref_id` INTEGER NOT NULL,
    `send_date` DATETIME(3) NOT NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_log_user_id_idx`(`user_id`),
    UNIQUE INDEX `notification_log_user_id_type_refType_ref_id_send_date_key`(`user_id`, `type`, `refType`, `ref_id`, `send_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notification_log` ADD CONSTRAINT `notification_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
