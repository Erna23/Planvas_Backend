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

export async funciton createNewReport(userId, goal) {
    return prisma.report.create({
        data: {
            goalId: goal.goalId,
            growth: 
        },
        select: {

        }
    })
}