import { requireAuth } from "../auth.config.js";
import * as homeService from "../services/home.service.js";
import { homeResponseDTO } from "../dtos/home.dto.js";
import { ok, fail, getAuthUserId } from "../utils/apiResponse.js";

export function registerHomeRoutes(app) {
  app.get("/api/home", requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

      const data = await homeService.getHomeData(userId);

      const response = homeResponseDTO(
        data.goalStatus,
        data.goal ?? null,
        data.progress ?? null,
        data.weeklyStats ?? [],
        data.todayTodos ?? [],
        data.recommendations ?? []
      );

      return ok(res, response, 200);
    } catch (e) {
      console.error(e);
      return fail(res, "H001", "홈 화면 조회 실패", 500, e?.message ?? null);
    }
  });
}