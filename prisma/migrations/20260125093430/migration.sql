/*
  Warnings:

  - Added the required column `growth` to the `report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rest` to the `report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `report` ADD COLUMN `growth` INTEGER NOT NULL,
    ADD COLUMN `rest` INTEGER NOT NULL;
