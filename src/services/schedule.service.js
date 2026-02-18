// src/services/schedule.service.js
import { findUserById } from "../repositories/user.repository.js";
import {
	createFixedActivitiesMany,
	findFixedActivitiesByUserId,
	updateUserActivityById,
	deleteUserActivityById,
	addOwnUserActivity,
	addDateTodo,
	completeActivity,
	getDateActivity,
	findUserActivityById,
	getGrowthAndRest,
	updateMyActivityCompletedByUserActivityId
} from "../repositories/schedule.repository.js";
import {
	findCurrentGoalPeriodByUserId
} from "../repositories/goals.repository.js";
import {
	getGrowthAndRestPointFromActivities
} from "../repositories/activity.repository.js";
import { ActivityType } from "@prisma/client";

const dayMap = {
	SUN: 0,
	MON: 1,
	TUE: 2,
	WED: 3,
	THU: 4,
	FRI: 5,
	SAT: 6,
};

export async function addFixedSchedule(userId, body) {
	const user = await findUserById(userId);
	if (!user) {
		const err = new Error("User not found");
		err.statusCode = 404;
		err.payload = {
			resultType: "FAIL",
			error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
			success: null,
		};
		throw err;
	}

	const targetDays = body.daysOfWeek.map((day) => dayMap[day]);

	const start = new Date(body.startDate + "T00:00:00");
	const end = new Date(body.endDate + "T00:00:00");
	const diffMs = end - start;
	const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

	const schedules = [];
	for (let i = 0; i < diffDays; i++) {
		const date = new Date(start);
		date.setDate(date.getDate() + i);
		const dayOfWeek = date.getDay();
		if (targetDays.includes(dayOfWeek)) {
			const y = date.getFullYear();
			const m = String(date.getMonth() + 1).padStart(2, "0");
			const d = String(date.getDate()).padStart(2, "0");
			const dateStr = `${y}-${m}-${d}`;
			schedules.push({
				title: body.title,
				startAt: new Date(`${dateStr}T${body.startTime}:00`),
				endAt: new Date(`${dateStr}T${body.endTime}:00`),
				category: body.category,
			});
		}
	}

	const { ids } = await createFixedActivitiesMany(Number(userId), schedules);
	return {
		fixedScheduleId: ids.map((id) => ({ id })),
		title: body.title,
		startDate: body.startDate,
		endDate: body.endDate,
		daysOfWeek: body.daysOfWeek,
		startTime: body.startTime,
		endTime: body.endTime,
	};
}

export async function getFixedSchedule(userId) {
	const user = await findUserById(userId);
	if (!user) {
		const err = new Error("User not found");
		err.statusCode = 404;
		err.payload = {
			resultType: "FAIL",
			error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
			success: null,
		};
		throw err;
	}

	return findFixedActivitiesByUserId(userId);
}

export async function updateFixedSchedule(userId, id, body) {
	const user = await findUserById(userId);
	if (!user) {
		const err = new Error("User not found");
		err.statusCode = 404;
		err.payload = {
			resultType: "FAIL",
			error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
			success: null,
		};
		throw err;
	}

	await updateUserActivityById(id, body);
	return { msg: "수정이 완료되었습니다." };
}

export async function deleteFixedSchedule(userId, id) {
	const user = await findUserById(userId);
	if (!user) {
		const err = new Error("User not found");
		err.statusCode = 404;
		err.payload = {
			resultType: "FAIL",
			error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
			success: null,
		};
		throw err;
	}

	const deleted = await deleteUserActivityById(id);
	return {
		deleted,
		message: "해당 일정이 삭제되었습니다.",
	};
}

// TO-DO
export async function addTodos(userId, body, date) {
	return await addDateTodo(userId, body, date);
}

export async function getTodos(userId, date) {
	return await getDateActivity(userId, date);
}

export async function completeTodos(id) {
	return await completeActivity(id);
}

export async function createMyActivity(userId, body) {
	return { id: (await addOwnUserActivity(userId, body)).id }
}

export async function getMyActivityInfo(userId, Id) {
	const ownActivity = await findUserActivityById(Id);

	return {
		myActivityId: ownActivity.id,
		title: ownActivity.title,
		category: ownActivity.category,
		point: ownActivity.point,
		startAt: ownActivity.startAt,
		endAt: ownActivity.endAt,
		completed: ownActivity.status === "TODO" ? false : true,
	};
}

export async function updateMyActivity(userId, id, body) {
	await updateUserActivityById(id, body);
	return { msg: "수정이 완료되었습니다." };
}

export async function deleteMyActivity(userId, id) {
	const user = await findUserById(userId);
	if (!user) {
		const err = new Error("User not found");
		err.statusCode = 404;
		err.payload = {
			resultType: "FAIL",
			error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
			success: null,
		};
		throw err;
	}

	const deleted = await deleteUserActivityById(id);
	return {
		deleted,
		message: "해당 일정이 삭제되었습니다.",
	};
}

// 활동 완료 처리
export async function completeMyActivity(userId, id) {
	const goal = await findCurrentGoalPeriodByUserId(userId);

	const before = await getGrowthAndRest(userId, goal.startDate, goal.endDate);
	const beforeAct = await getGrowthAndRestPointFromActivities(before.activityIds);

	const beforeGrowth = before.growth + beforeAct.growth;
	const beforeRest = before.rest + beforeAct.rest;

	const activity = await completeActivity(Number(id));


	const isCompleted = (activity.status === "DONE");
	await updateMyActivityCompletedByUserActivityId(activity.id, isCompleted);

	const after = await getGrowthAndRest(userId, goal.startDate, goal.endDate);
	const afterAct = await getGrowthAndRestPointFromActivities(after.activityIds);

	const afterGrowth = after.growth + afterAct.growth;
	const afterRest = after.rest + afterAct.rest;

	return {
		myActivityId: activity.id,
		beforeProgress: {
			growthAchieved: beforeGrowth,
			restAchieved: beforeRest,
		},
		afterProgress: {
			growthAchieved: afterGrowth,
			restAchieved: afterRest,
		},
	};
}
