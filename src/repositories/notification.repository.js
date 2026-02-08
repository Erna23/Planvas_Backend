import { prisma } from "../db.config.js";

export async function findRemindersByUserId(userId) {
  return prisma.reminder.findMany({
    where: { userId },
  });
}

// userId + reminderType 조합이 유니크여야 upsert가 깔끔해져.
// (없으면 create, 있으면 update)
export async function upsertReminder(userId, reminderType, isEnabled) {
  return prisma.reminder.upsert({
    where: {
      userId_reminderType: { userId, reminderType }, // 아래 schema에서 @@unique 필요
    },
    update: { isEnabled },
    create: { userId, reminderType, isEnabled },
  });
}



