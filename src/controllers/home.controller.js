import { requireAuth } from "../auth.config.js";
import * as homeService from "../services/home.service.js";
import { homeResponseDTO } from "../dtos/home.dto.js";

export function registerHomeRoutes(app) {
  
  app.get("/api/home", requireAuth, async (req, res) => {
    try {
      // 1. 유저 ID 가져오기 (req.auth가 없으면 테스트용 1번 ID 사용)
      const userId = req.auth ? req.auth.userId : 1;
      
      // 2. 서비스에서 데이터 가져오기
      // (service에서는 goal, calendar, todaySchedules, recommendations를 줍니다)
      const data = await homeService.getHomeData(userId);

      // 3. DTO에 데이터 매핑하기 (서비스의 변수명 -> DTO의 파라미터 순서)
      const response = homeResponseDTO(
          data.goal,            // 1. 목표 정보 (status, dDay 등)
          data.goal,            // 2. 진행률 정보 (서비스에서 goal 안에 같이 넣었으므로 그대로 전달)
          data.calendar,        // 3. 주간 통계 (서비스 변수명: calendar)
          data.todaySchedules,  // 4. 오늘의 할 일 (서비스 변수명: todaySchedules)
          data.recommendations  // 5. 추천 활동
      );

      // 4. 응답 보내기 (기존 포맷 유지)
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