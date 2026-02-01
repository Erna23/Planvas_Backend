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
            completed: true
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

export async function createFixedActivitiesMany(userId, schedules) {
    const createdActivities = await Promise.all(
        schedules.map(schedule => 
            prisma.userActivity.create({
                data: {
                    userId,
                    title: schedule.title,
                    startAt: schedule.startAt,
                    endAt: schedule.endAt,
                    type: 'FIXED',
                    status: 'TODO'
                }
            })
        )
    );
    
    const ids = createdActivities.map(activity => activity.id);
    return { ids };
}

export async function findFixedActivitiesByUserId(userId) {
    const activities = await prisma.userActivity.findMany({
        where: {
            userId,
            activityId: null
        },
        select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true
        }
    });
    
    const fixedSchedules = activities.map(activity => ({
        id: activity.id,
        title: activity.title,
        date: activity.startAt.toISOString().split('T')[0],
        startAt: activity.startAt.toTimeString().slice(0, 5),
        endAt: activity.endAt.toTimeString().slice(0, 5)
    }));
    
    return { fixedSchedules };
}

export async function findUserActivityById(id) {
    return await prisma.userActivity.findFirst({ where: { id } });
}

export async function updateUserActivityById(id, data) {
    const updateData = {}

    const existing = await prisma.userActivity.findUnique({
        where: { id },
        select: { startAt: true, endAt: true }
    });

    let date = existing.startAt.toISOString().split('T')[0];
    let startTime = existing.startAt.toTimeString().slice(0, 5);
    let endTime = existing.endAt.toTimeString().slice(0, 5);
    
    let isChangeCate = false;
    let isChangePoint = false;
    if (data.title !== undefined) {
        updateData.title = data.title;
    }
    if (data.category !== undefined) {
        isChangeCate = true;
        updateData.category = data.category;
    }
    if (data.point !== undefined) {
        isChangePoint = true;
        updateData.point = data.point;
    }
    if (data.date !== undefined) date = data.date;
    if (data.startTime !== undefined) startTime = data.startTime;
    if (data.endTime !== undefined) endTime = data.endTime;
    
    // DateTime 생성
    updateData.startAt = new Date(`${date}T${startTime}:00`);
    updateData.endAt = new Date(`${date}T${endTime}:00`);
    
    await prisma.userActivity.update({
        where: { id },
        data: updateData,
        select: { 
            id: true,
            title: true,
            category: true,
            point: true
        }
    });
}

export async function deleteUserActivityById(id) {
    await prisma.userActivity.delete({ where: { id } });
    return true;
}

export async function addOwnUserActivity(userId, activity, data) {
    return await prisma.userActivity.create({
        data: {
            userId,
            activityId: activity.id,
            title: activity.title,
            category,
            point,
            startAt: new Date(`${data.startDate}T${data.startTime}:00`),
            endAt: new Date(`${data.endDate}T${data.endTime}:00`)
        },
        select: {
            id: true
        }
    })
}

export async function completeActivity(id) {
    return await prisma.userActivity.update({
        where: { id },
        data: {
            completed: true
        }
    })
}

export async function getDateActivity(userId, date) {
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return await prisma.userActivity.findMany({
        where: {
            userId,
            startAt: {
                gte: startOfDay,
                lt: endOfDay
            }
        },
        orderBy: {
            startAt: 'asc'
        },
        select: {
            id: true,
            title: true,
            category: true,
            completed: true
        }
    });
}