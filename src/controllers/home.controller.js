import { requireAuth } from "../auth.config.js";
import * as homeService from "../services/home.service.js";
import { homeResponseDTO } from "../dtos/home.dto.js";

export function registerHomeRoutes(app) {
  app.get("/api/home", requireAuth, async (req, res) => {
    try {
      // 토큰 payload가 userId / id 어떤 형태든 대응
      const userId = req.auth?.userId ?? req.auth?.id ?? 1;

      const data = await homeService.getHomeData(userId);

      // ✅ goalStatus를 DTO로 같이 넘겨야 프론트에서 구분 가능
      const response = homeResponseDTO(
        data.goalStatus,              // ✅ 추가
        data.goal ?? null,
        data.progress ?? null,
        data.weeklyStats ?? [],
        data.todayTodos ?? [],
        data.recommendations ?? []
      );

      return res.status(200).json({
        resultType: "SUCCESS",
        error: null,
        success: response,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({
        resultType: "FAIL",
        error: {
          errorCode: "H001",
          reason: "홈 화면 조회 실패",
          data: e?.message ?? null,
        },
        success: null,
      });
    }
  });
}
