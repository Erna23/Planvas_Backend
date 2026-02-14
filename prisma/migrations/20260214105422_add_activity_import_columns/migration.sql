ALTER TABLE `Activity`
  ADD COLUMN `organizer` VARCHAR(100) NULL,
  ADD COLUMN `recruit_end_date` DATETIME(3) NULL,
  ADD COLUMN `tags` JSON NULL;
