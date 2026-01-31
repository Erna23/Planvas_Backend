import { prisma } from "../db.config.js";

function toDate(d) {
    return d instanceof Date ? d : new Date(d);
}
  
export async function getGrowthAndRest(userId, startDate, endDate) {
    const s = toDate(startDate);
    const e = toDate(endDate);
  
    const rows = await prisma.userActivity.findMany({
        where: {
            userId,
            activityId: { not: null },
            startAt: { lt: e },
            endAt: { gt: s },
        },
        select: {
            activity: { select: { growth_point: true, rest_point: true } },
        },
    });
  
    return rows.reduce((acc, r) => {
        if (!r.activity) return acc;
            acc.growth += r.activity.growth_point ?? 0;
            acc.rest += r.activity.rest_point ?? 0;
            return acc;
        },
        { growth: 0, rest: 0 }
    );
}
  
export async function getGrowth(userId, startDate, endDate) {
    const { growth } = await getGrowthAndRest(userId, startDate, endDate);
    return growth;
}
  
export async function getRest(userId, startDate, endDate) {
    const { rest } = await getGrowthAndRest(userId, startDate, endDate);
    return rest;
}