import { findUserById } from "../repositories/user.repository.js"
import { createNewReport } from "../repositories/report.repository.js";
import { findGoalReports, findCurrentGoalPeriodByUserId, findGoalPeriodById } from "../repositories/goals.repository.js";
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
  
    const { growth, rest } = await getGrowthAndRest(userId, goal.startDate, goal.endDate);
    const summary = await getSummaryDto(goal, growth, rest);
  
    const created = await createNewReport(user, growth, rest, goal, summary);
    // created 기반으로 리턴하고 싶으면 여기서 DTO 구성
    return toGoalReportDto(goal, growth, rest, summary);
  }