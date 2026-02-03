import { findUserById } from "../repositories/user.repository.js"
import { createNewReport } from "../repositories/report.repository.js";
import { findGoalReports, findCurrentGoalPeriodByUserId } from "../repositories/goals.repository.js";
import { getGrowthAndRest } from "../repositories/schedule.repository.js";
import { getSummaryDto, toGoalReportDto } from "../dtos/report.dto.js";


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

    const reports = await findGoalReports(userId).map((report) => ({
        ...report, 
        year: new Date(report.endDate).getFullYear()
    }));

    if(year != 0) {
        year
        return reports.filter((report) => report.year === year);
    }
    return reports;
}

export async function createReport(userId, goalId) {
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

    const goal = await findCurrentGoalPeriodByUserId(userId);
    const { growth, rest } = await getGrowthAndRest(userId, goal.startDate, goal.endDate);
    const summary = await getSummaryDto(goal, growth, rest);

    await createNewReport(user, growth, rest, goal, summary);
    return toGoalReportDto(goal, growth, rest, summary);
}