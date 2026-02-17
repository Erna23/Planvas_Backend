import { DateTime } from "luxon";
import { prisma } from "../db.config.js";

function toDate(d) {
    return d instanceof Date ? d : new Date(d);
}
export async function getGrowthAndRest(userId, startDate, endDate) {
    try {
        const s = toDate(startDate);
        const e = toDate(endDate);

        const rows = await prisma.MyActivity.findMany({
            where: {
                userId,
                startDate: { lt: e },
                endDate: { gt: s },
            },
            select: {
                Activity: { select: { tab: true, point: true } },
            },
        });

        return rows.reduce(
            (acc, r) => {
                const a = r.Activity;
                if (!a) return acc;

                if (a.tab === "GROWTH") acc.growth += a.point ?? 0;
                else if (a.tab === "REST") acc.rest += a.point ?? 0;

                return acc;
            },
            { growth: 0, rest: 0 }
        );
    } catch {
        return { growth: 0, rest: 0 };
    }
}


export async function createFixedActivitiesMany(userId, schedules) {
    const createdActivities = await Promise.all(
        schedules.map(schedule => 
            prisma.MyActivity.create({
                data: {
                    userId,
                    title: schedule.title,
                    startAt: schedule.startAt,
                    endAt: schedule.endAt,
                    category: schedule.category,
                    scheduleType: "FIXED"
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
        type: { in: ["FIXED", "MANUAL"] }, // activityId: null 제거
        },
        select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        type: true,
        recurrenceRule: true, 
        },
        orderBy: { startAt: "asc" },
    });

    const fixedSchedules = activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        date: activity.startAt.toISOString().split("T")[0],
        startAt: activity.startAt.toTimeString().slice(0, 5),
        endAt: activity.endAt.toTimeString().slice(0, 5),
        type: activity.type,
        recurrenceRule: activity.recurrenceRule ?? null,
    }));

    return { fixedSchedules };
}

export async function deleteUserActivityById(id) {
    return await prisma.userActivity.delete({ where: { id } });
}


export async function findUserActivityById(id) {
    return await prisma.userActivity.findFirst({ where: { id } });
}

export async function updateUserActivityById(id, body) {
    const existing = await prisma.userActivity.findUnique({
        where: { id },
        select: {
            startAt: true,
            endAt: true,
            title: true,
            category: true,
            point: true
        },
    });

    if (!existing) {
        const err = new Error("UserActivity not found");
        err.statusCode = 404;
        err.payload = {
            resultType: "FAIL",
            error: { reason: "해당 일정을 찾을 수 없습니다.", data: null },
            success: null,
        };
        throw err;
    }

    const updateData = {};

    // 기본값: 기존 값
    let date = existing.startAt.toISOString().split("T")[0]; // YYYY-MM-DD
    let startTime = existing.startAt.toTimeString().slice(0, 5); // HH:MM
    let endTime = existing.endAt.toTimeString().slice(0, 5); // HH:MM

    // 부분 수정 (body에 들어온 값만 반영)
    if (body.title !== undefined) updateData.title = body.title;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.point !== undefined) updateData.point = body.point;
    if (body.date !== undefined) date = body.date;
    if (body.startTime !== undefined) startTime = body.startTime;
    if (body.endTime !== undefined) endTime = body.endTime;

    // date + time 조합해서 DateTime 재생성
    updateData.startAt = new Date(`${date}T${startTime}:00`);
    updateData.endAt = new Date(`${date}T${endTime}:00`);

    await prisma.userActivity.update({
        where: { id },
        data: updateData,
    });
}

export async function addOwnUserActivity(userId, data) {
    return await prisma.userActivity.create({
        data: {
        userId,
        title: activity.title,
        category: activity.tab,                
        point: data.point ?? activity.point ?? 0,
        type: "MANUAL",
        startAt: new Date(`${data.startDate}T${data.startTime}:00`),
        endAt: new Date(`${data.endDate}T${data.endTime}:00`),
        },
        select: { id: true },
    });
}

export async function addDateTodo(userId, body, date = new Date(now())) {
    return await prisma.userActivity.create({
        data: {
            userId,
            title: body.title,
            category: body.category,
            point: body.point,
            startAt: new Date(`${date}T${body.startTime}:00`),
            endAt: new Date(`${date}T${body.endTime}:00`),
            status: "TODO"
        },
        select: { id: true }
    })
}

export async function completeActivity(id) {
    return await prisma.userActivity.update({
        where: { id },
        data: { status: "DONE" },
        select: { 
            id: true, status : true
        }
    });
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
            type: true,
            category: true,
            point: true,
            eventColor: true,
            startAt: true,
            endAt: true,
            status: true,
        }
    });
}