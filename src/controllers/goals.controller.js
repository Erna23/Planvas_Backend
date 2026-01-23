import { requireAuth } from "../auth.config.js";
import {
  createGoalPeriodByUserId,
  updateGoalPeriodByUserId,
  getCurrentGoalByUserId,
  updateGoalRatioByUserId,
  getGoalRatioPresets,
} from "../services/goals.service.js";

export function registerGoalRoutes(app) {
  // POST /api/goals
  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const result = await createGoalPeriodByUserId(req.auth.userId, req.body);
      return res.status(201).json(result);
    } catch (e) {
      console.error("[POST /api/goals] error:", e);
      return res.status(e.statusCode ?? 500).json(e.payload ?? defaultGoalsFail());
    }
  });

  // PATCH /api/goals/:goalId (기간/이름 수정)
  app.patch("/api/goals/:goalId", requireAuth, async (req, res) => {
    try {
      const result = await updateGoalPeriodByUserId(req.auth.userId, req.params.goalId, req.body);
      return res.status(200).json(result);
    } catch (e) {
      console.error("[PATCH /api/goals/:goalId] error:", e);
      return res.status(e.statusCode ?? 500).json(e.payload ?? defaultGoalsFail());
    }
  });

  // GET /api/goals/current (현재 목표 조회)
  app.get("/api/goals/current", requireAuth, async (req, res) => {
    try {
      const result = await getCurrentGoalByUserId(req.auth.userId);
      return res.status(200).json(result);
    } catch (e) {
      console.error("[GET /api/goals/current] error:", e);
      return res.status(e.statusCode ?? 500).json(e.payload ?? defaultGoalsFail());
    }
  });

  // PATCH /api/goals/:goalId/ratio (성장/휴식 비율 변경)
  app.patch("/api/goals/:goalId/ratio", requireAuth, async (req, res) => {
    try {
      const result = await updateGoalRatioByUserId(req.auth.userId, req.params.goalId, req.body);
      return res.status(200).json(result);
    } catch (e) {
      console.error("[PATCH /api/goals/:goalId/ratio] error:", e);
      return res.status(e.statusCode ?? 500).json(e.payload ?? defaultGoalsFail());
    }
  });

  // GET /api/goals/ratio-presets (비율 추천 프리셋 목록)
  app.get("/api/goals/ratio-presets", requireAuth, async (req, res) => {
    try {
      const result = await getGoalRatioPresets();
      return res.status(200).json(result);
    } catch (e) {
      console.error("[GET /api/goals/ratio-presets] error:", e);
      return res.status(e.statusCode ?? 500).json(e.payload ?? defaultGoalsFail());
    }
  });
}

function defaultGoalsFail() {
  return {
    resultType: "FAIL",
    error: { reason: "목표 처리 중 서버 오류가 발생했습니다.", data: null },
    success: null,
  };
}
