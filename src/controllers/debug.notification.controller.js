import { DateTime } from "luxon";
import { requireAuth } from "../auth.config.js";
import { runDdayJob, runActivityCompleteJob } from "../services/notification.dispatcher.js";

export function registerDebugNotificationRoutes(app) {
  app.post("/api/debug/notifications/dday", requireAuth, async (req, res) => {
    const result = await runDdayJob(DateTime.now().setZone("Asia/Seoul"));
    return res.json({ ok: true, ...result });
  });

  app.post("/api/debug/notifications/activity-complete", requireAuth, async (req, res) => {
    const result = await runActivityCompleteJob(DateTime.now().setZone("Asia/Seoul"));
    return res.json({ ok: true, ...result });
  });
}
