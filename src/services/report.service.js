import { Recommend } from "@prisma/client"
import { findUserById } from "../repositories/user.repository"
import { createReport } from "../repositories/report.repository";
import { findGoalReports, findCurrentGoalPeriodByUserId } from "../repositories/goals.repository";
import { toGoalReportDto } from "../dtos/report.dto";

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
    const newReport = await createNewReport(userId, goal);

    let recommend;
    if(newReport.growth + newReport.rest < 50) {
        recommend = {
            focus : Recommend.ALL,
            text: "새로운 활동 탐색하기"
        }
    } else if(goal.growth > goal.rest && newReport.growth / goal.growth * 100 < 40) {
        recommend = {
            focus: Recommend.GROWTH,
            text: "새로운 성장 활동 탐색하기"
        }
    } else if(goal.rest > goal.growth && newReport.rest / goal.rest * 100 < 40) {
        recommend = {
            focus: Recommend.REST,
            text: "새로운 휴식 활동 탐색하기"
        }
    } else {
        recommend = {
            focus: Recommend.NONE,
            text: "새로운 활동 탐색하기"
        }
    }

    return toGoalReportDto(newReport, goal, recommend);
}