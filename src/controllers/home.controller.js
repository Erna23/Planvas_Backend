import { requireAuth } from "../auth.config.js";
import * as homeService from "../services/home.service.js";
import { homeResponseDTO } from "../dtos/home.dto.js";
import { ok, fail, getAuthUserId } from "../utils/apiResponse.js";

export function registerHomeRoutes(app) {
  app.get("/api/home", requireAuth, async (req, res) => {
    try {
      const userId = req.auth?.userId;

      console.log("[HOME] authorization =", req.headers.authorization);
      console.log("[HOME] getAuthUserId(userId) =", userId);
      console.log("[HOME] req.userId =", req.userId);
      console.log("[HOME] req.user =", req.user);

      console.log("[HOME] req.auth?.userId =", req.auth?.userId);
      console.log("[HOME] getAuthUserId(req) =", getAuthUserId(req));


      if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

      // 2. 서비스 호출
      const data = await homeService.getHomeData(userId);

      console.log("[HOME] data.goal =", data.goal);
      console.log("[HOME] data.goal?.userId =", data?.goal?.userId);

      // DTO의 첫 번째 인자로 data.userName을 추가합니다.
      const response = homeResponseDTO(
        data.userName,
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

  app.patch("/api/home/schedules/:activityId/status", requireAuth, async (req, res) => {
    try {
      const userId = req.auth?.userId;
      
      const { activityId } = req.params;

      if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

      console.log(`PATCH 요청 수신 - 유저: ${userId}, 활동ID: ${activityId}`);

      const updatedActivity = await homeService.patchScheduleStatus(userId, activityId);

      return ok(res, {
        id: updatedActivity.id,
        status: updatedActivity.status
      }, 200);
    } catch (e) {
      console.error("PATCH 에러 발생:", e);
      
      if (e.message === "NOT_FOUND") {
        return fail(res, "H002", "해당 일정을 찾을 수 없습니다.", 404);
      }
      
      if (e.message === "FORBIDDEN") {
        return fail(res, "H004", "해당 일정에 대한 수정 권한이 없습니다.", 403);
      }

      return fail(res, "H003", "일정 상태 변경 실패", 500, e?.message ?? null);
    }
  });
}
