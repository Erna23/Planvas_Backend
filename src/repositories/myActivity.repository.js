import { prisma } from "../db.config.js";

export async function createMyActivity({ userId, goalId, activityId, startDate, endDate, point }) {
  return prisma.myActivity.create({
    data: {
      userId,
      goalId,
      activityId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      point,
    },
  });
}
