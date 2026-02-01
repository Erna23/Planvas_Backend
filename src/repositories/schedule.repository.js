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
            userId
        },
        select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true
        }
    });
    
    const fixedSchedules = activities.map(activity => ({
        fixedScheduleId: activity.id,
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
    
    if (!existing) {
        throw new Error('Activity not found');
    }

    let title = existing.title;
    let date = existing.startAt.toISOString().split('T')[0];
    let startTime = existing.startAt.toTimeString().slice(0, 5);
    let endTime = existing.endAt.toTimeString().slice(0, 5);
    
    // 새 값이 있으면 덮어쓰기
    if (data.title !== undefined) {
        title = data.title;
        updateData.title = data.title;
    }
    if (data.date !== undefined) date = data.date;
    if (data.startTime !== undefined) startTime = data.startTime;
    if (data.endTime !== undefined) endTime = data.endTime;
    
    // DateTime 생성
    updateData.startAt = new Date(`${date}T${startTime}:00`);
    updateData.endAt = new Date(`${date}T${endTime}:00`);
    
    const updated = await prisma.userActivity.update({
        where: { id },
        data: updateData,
        select: { id: true }
    });

    return {
        fixedScheduleId: updated.id,
        title: title,
        date: date,
        startAt: startTime,
        endAt: endTime
    }
}

export async function deleteUserActivityById(id) {
    await prisma.userActivity.delete({ where: { id } });
    return true;
}