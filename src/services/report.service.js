import { Recommend } from "@prisma/client"
import { findUserById } from "../repositories/user.repository"
import { findRecentReportsByUserId } from "../repositories/report.repository";
import { findGoalPeriodById, findCurrentGoalPeriodByUserId } from "../repositories/goals.repository";

export async function getSeasonsReports(userId, year = null) {
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

    if(year != null) {
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
    if(report.growth + report.rest < 50) {
        recommend = {
            focus : Recommend.ALL,
            text: "새로운 활동 탐색하기"
        }
    } else if(goal.growth > goal.rest && report.growth / goal.growth * 100 < 40) {
        recommend = {
            focus: Recommend.GROWTH,
            text: "새로운 성장 활동 탐색하기"
        }
    } else if(goal.rest > goal.growth && report.rest / goal.rest * 100 < 40) {
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

    return toGoalReportDto(report, goal, recommend);
}

export async function createReport(userId, goalId) {

}