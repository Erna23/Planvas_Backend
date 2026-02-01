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
            userId: user.userId,
            goalId: goal.goalId,
            growth: growth,
            rest: rest,
            type: summary.type,
            title: summary.title,
            subtitle: summary.subTitle,
        },
        select: {
            growth: true,
            rest: true,
            type: true,
            title: true,
            subTitle: true
        }
    })
}