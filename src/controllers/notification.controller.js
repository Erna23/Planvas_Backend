import { getNotificationSettings } from "../services/notification.service.js";
import { requireAuth } from "../auth.config.js";

export function registerNotificationRoutes(app) {
      // GET /api/settings/reminders
    app.get("/api/settings/reminders", requireAuth, async (req, res) => {
        
        try {
            const result = await getNotificationSettings(req.auth.userId);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(500).json({
                resultType: "FAIL",
                error: { errorCode: "N500", reason: "알림 설정 조회 실패", data: null },
                success: null,
            });
        }
    });
}