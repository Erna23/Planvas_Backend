/*
  Warnings:

  - A unique constraint covering the columns `[userActivityId]` on the table `MyActivity` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `MyActivity` ADD COLUMN `userActivityId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `MyActivity_userActivityId_key` ON `MyActivity`(`userActivityId`);

-- AddForeignKey
ALTER TABLE `MyActivity` ADD CONSTRAINT `MyActivity_userActivityId_fkey` FOREIGN KEY (`userActivityId`) REFERENCES `user_activity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
