-- Create ActivityInterest join table
CREATE TABLE `ActivityInterest` (
  `activityId` INT NOT NULL,
  `interestId` INT NOT NULL,
  PRIMARY KEY (`activityId`, `interestId`),
  INDEX `ActivityInterest_interestId_idx`(`interestId`),
  INDEX `ActivityInterest_activityId_idx`(`activityId`),
  CONSTRAINT `ActivityInterest_activityId_fkey`
    FOREIGN KEY (`activityId`) REFERENCES `Activity`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ActivityInterest_interestId_fkey`
    FOREIGN KEY (`interestId`) REFERENCES `interest`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
