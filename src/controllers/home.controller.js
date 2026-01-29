import { requireAuth } from "../auth.config.js";
import * as homeService from "../services/home.service.js";
import { homeResponseDTO } from "../dtos/home.dto.js";

export function registerHomeRoutes(app) {
  
  app.get("/api/home", requireAuth, async (req, res) => {
    try {
      const data = await homeService.getHomeData(req.auth.userId);

      // progress 데이터가 추가됨
      const response = homeResponseDTO(
          data.goal, 
          data.progress, // [추가] 실제 진행률 데이터 전달
          data.weeklyStats, 
          data.todayTodos, 
          data.recommendations
      );

      res.status(200).json({ 
        resultType: "SUCCESS", 
        error: null, 
        success: response 
      });

    } catch (e) {
      console.error(e);
      res.status(500).json({ 
        resultType: "FAIL", 
        error: { errorCode: "H001", reason: "홈 화면 조회 실패", data: e.message },
        success: null
      });
    }
  });
}