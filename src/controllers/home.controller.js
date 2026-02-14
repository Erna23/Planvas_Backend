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

      // 💡 DTO의 첫 번째 인자로 data.userName을 추가합니다.
      const response = homeResponseDTO(
        data.userName,        // 추가된 부분
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
      const userId = getAuthUserId(req);
      if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

      const { activityId } = req.params;

      // Service 계층의 함수를 호출하여 로직 처리
      const updatedActivity = await homeService.patchScheduleStatus(userId, activityId);

      // 성공 응답 (DTO 없이 간단하게 결과 전달)
      return ok(res, {
        id: updatedActivity.id,
        status: updatedActivity.status
      }, 200);

    } catch (e) {
      console.error(e);
      // 에러 메시지에 따른 분기 처리
      if (e.message === "NOT_FOUND") {
        return fail(res, "H002", "해당 일정을 찾을 수 없습니다.", 404);
      }
      return fail(res, "H003", "일정 상태 변경 실패", 500, e?.message ?? null);
    }
  });
}
