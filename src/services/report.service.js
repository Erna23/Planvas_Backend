import { findUserById } from "../repositories/user.repository.js"
import { createNewReport } from "../repositories/report.repository.js";
import { findGoalReports, findCurrentGoalPeriodByUserId, findGoalPeriodById } from "../repositories/goals.repository.js";
import { getGrowthAndRest } from "../repositories/schedule.repository.js";
import { getSummaryDto, toGoalReportDto } from "../dtos/report.dto.js";
import { getGrowthAndRestPointFromActivities } from "../repositories/activity.repository.js"

export async function getSeasonsReports(userId, year = 0) {
    const user = await findUserById(userId);
    if(!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        err.payload = {
            resultType: "FAIL",
            error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
            success: null,
        };
        throw err;
    }

    const reportsRaw = await findGoalReports(userId);
    const reports = reportsRaw.map((report) => ({
        ...report,
        year: new Date(report.endDate).getFullYear(),
    }));

    if(year != 0) {
        return reports.filter((report) => report.year === year);
    }
    return reports;
}

export async function createReport(userId, goalId = null) {
    const user = await findUserById(Number(userId));
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
  
    const goal = goalId
        ? await findGoalPeriodById(Number(goalId))
        : await findCurrentGoalPeriodByUserId(userId);
  
    if (!goal) {
        const err = new Error("Goal not found");
        err.statusCode = 404;
        err.payload = {
            resultType: "FAIL",
            error: { reason: "목표 기간 정보를 찾을 수 없습니다.", data: null },
            success: null,
        };
        throw err;
    }
  
    let { growth, rest, activityIds } = await getGrowthAndRest(userId, goal.startDate, goal.endDate);
    const activities = await getGrowthAndRestPointFromActivities(activityIds);

    growth += activities.growth;
    rest += activities.rest;
    const summary = await getSummaryDto(goal, growth, rest);

    await createNewReport(user, growth, rest, goal, summary);
	return await toGoalReportDto(goal, growth, rest, summary);
}