// src/services/schedule.service.js
import {
	addDateTodo,
	completeActivity,
	getDateActivity,
	getGrowthAndRest,
	updateMyActivityCompletedByUserActivityId
} from "../repositories/schedule.repository.js";
import {
	findCurrentGoalPeriodByUserId
} from "../repositories/goals.repository.js";
import {
	getGrowthAndRestPointFromActivities
} from "../repositories/activity.repository.js";

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

// 활동 완료 처리
export async function completeMyActivity(userId, id) {
	const goal = await findCurrentGoalPeriodByUserId(userId);

	const before = await getGrowthAndRest(userId, goal.startDate, goal.endDate, goal.id);
	const beforeAct = await getGrowthAndRestPointFromActivities(before.activityIds);

	const beforeGrowth = before.growth + beforeAct.growth;
	const beforeRest = before.rest + beforeAct.rest;

	const activity = await completeActivity(Number(id));


	const isCompleted = (activity.status === "DONE");
	await updateMyActivityCompletedByUserActivityId(activity.id, isCompleted);

	const after = await getGrowthAndRest(userId, goal.startDate, goal.endDate, goal.id);
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
