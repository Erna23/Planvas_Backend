import { requireAuth } from "../auth.config.js";
import { ok, fail } from "../utils/apiResponse.js";
import { getSeasonsReports, createReport } from "../services/report.service.js";

export function registerReportRoutes(app) {
    app.get("/api/reports/seasons", requireAuth, async (req, res) => {
        try {
            const { year } = req.query;
            const parsedYear = year ? Number(year) : 0;

            const result = await getSeasonsReports(req.auth.userId, parsedYear);
            return ok(res, result, 200);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultReportsFail());
        }
    });

    app.get("/api/reports/seasons/:goalId", requireAuth, async (req, res) => {
        try {
            const result = await createReport(req.auth.userId, req.params.goalId);
            return ok(res, result, 200);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultReportsFail());
        }
    });
}

function defaultReportsFail() {
    return {
        resultType: "FAIL",
        error: { reason: "목표 처리 중 서버 오류가 발생했습니다.", data: null },
        success: null,
    };
}