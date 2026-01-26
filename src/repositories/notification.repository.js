import { prisma } from "../db.config.js";

export async function findRemindersByUserId(userId) {
    return prisma.reminder.findMany({
        where: { userId: userId },
    });
}