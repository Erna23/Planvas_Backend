import { prisma } from "../db.config.js";

export async function findRecentReportsByUserId(userId) {
    return prisma.report.findFirst({
        where: {
            userId,
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            goalId: true,
            growth: true,
            rest: true,
            type: true,
            title: true,
            subTitle: true,
        }
    });
}

export async function createNewReport(user, growth, rest, goal, summary) {
    return prisma.report.create({
      data: {
        userId: user.id,
        goalId: goal.id,
        growth,
        rest,
        type: summary.type,
        title: summary.msg.title,
        subTitle: summary.msg.subTitle,
      },
      select: {
        growth: true,
        rest: true,
        type: true,
        title: true,
        subTitle: true,
      },
    });
  }