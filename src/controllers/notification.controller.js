import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../services/notification.service.js";
import { requireAuth } from "../auth.config.js";

export function registerNotificationRoutes(app) {
  // GET /api/settings/reminders
  app.get("/api/settings/reminders", requireAuth, async (req, res) => {
    try {
      const result = await getNotificationSettings(req.auth.userId);
      return res.status(200).json(result);
    } catch (e) {
      console.error(e?.stack ?? e);
      return res.status(500).json({
        resultType: "FAIL",
        error: { errorCode: "N500", reason: "알림 설정 조회 실패", data: null },
        success: null,
      });
    }
  });

  // PATCH /api/settings/reminders
  app.patch("/api/settings/reminders", requireAuth, async (req, res) => {
    // ✅ 1) 디버깅 로그 (원인 찾는 핵심)
    console.log("PATCH body:", req.body);
    console.log("PATCH auth:", req.auth);

    // ✅ 2) PATCH는 '보낸 것만' 업데이트해야 안전함
    const patch = {};
    if ("dDayReminderEnabled" in req.body) {
      if (typeof req.body.dDayReminderEnabled !== "boolean") {
        return res.status(400).json({
          resultType: "FAIL",
          error: { errorCode: "N400", reason: "dDayReminderEnabled는 boolean이어야 함", data: null },
          success: null,
        });
      }
      patch.dDayReminderEnabled = req.body.dDayReminderEnabled;
    }

    if ("activityCompleteReminderEnabled" in req.body) {
      if (typeof req.body.activityCompleteReminderEnabled !== "boolean") {
        return res.status(400).json({
          resultType: "FAIL",
          error: { errorCode: "N400", reason: "activityCompleteReminderEnabled는 boolean이어야 함", data: null },
          success: null,
        });
      }
      patch.activityCompleteReminderEnabled = req.body.activityCompleteReminderEnabled;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({
        resultType: "FAIL",
        error: { errorCode: "N400", reason: "변경할 값이 없습니다", data: null },
        success: null,
      });
    }

    try {
      const result = await updateNotificationSettings(req.auth.userId, patch);
      return res.status(200).json(result);
    } catch (e) {
      // ✅ 진짜 원인(스택) 찍기
      console.error(e?.stack ?? e);
      return res.status(500).json({
        resultType: "FAIL",
        error: { errorCode: "N500", reason: "알림 설정 변경 실패", data: null },
        success: null,
      });
    }
  });
}
