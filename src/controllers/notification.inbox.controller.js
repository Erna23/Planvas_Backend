import { prisma } from "../db.config.js";
import { requireAuth } from "../auth.config.js";
import { DateTime } from "luxon";

const TZ = "Asia/Seoul";

export function registerNotificationInboxRoutes(app) {
  // GET /api/notifications?take=20&cursorId=123
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.auth.userId;

      const takeRaw = Number(req.query.take ?? 20);
      const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 50) : 20;

      const cursorIdRaw = req.query.cursorId;
      const cursorId =
        cursorIdRaw !== undefined && cursorIdRaw !== null && cursorIdRaw !== ""
          ? Number(cursorIdRaw)
          : null;

      const logs = await prisma.notificationLog.findMany({
        where: { userId },
        orderBy: [{ sentAt: "desc" }, { id: "desc" }],
        take,
        ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
        select: {
          id: true,
          type: true,
          refType: true,
          refId: true,
          sendDate: true,
          sentAt: true,
        },
      });

      // refType별로 필요한 대상들을 한번에 조회해서 메시지 구성
      const goalIds = logs
        .filter((l) => l.refType === "GOAL_PERIOD")
        .map((l) => l.refId);
      const actIds = logs
        .filter((l) => l.refType === "USER_ACTIVITY")
        .map((l) => l.refId);

      const [goals, acts] = await Promise.all([
        goalIds.length
          ? prisma.goalPeriod.findMany({
              where: { id: { in: goalIds }, userId },
              select: { id: true, title: true, endDate: true },
            })
          : Promise.resolve([]),
        actIds.length
          ? prisma.userActivity.findMany({
              where: { id: { in: actIds }, userId },
              select: { id: true, title: true, endAt: true, status: true },
            })
          : Promise.resolve([]),
      ]);

      const goalMap = new Map(goals.map((g) => [g.id, g]));
      const actMap = new Map(acts.map((a) => [a.id, a]));

      const items = logs.map((l) => {
        // 기본값(참조 데이터가 삭제된 경우에도 알림함이 깨지지 않게)
        let title = "알림";
        let body = "알림이 도착했어요.";

        if (l.type === "DDAY" && l.refType === "GOAL_PERIOD") {
          const g = goalMap.get(l.refId);
          const goalTitle = g?.title ?? "(삭제된 목표)";
          const sendDay = DateTime.fromJSDate(l.sendDate).setZone(TZ);
          const endDay = g?.endDate ? DateTime.fromJSDate(g.endDate).setZone(TZ) : null;

          const isToday = endDay ? endDay.hasSame(sendDay, "day") : false;

          title = "D-day 리마인더";
          body = isToday
            ? `오늘이 목표 기간 종료일이에요: ${goalTitle}`
            : `목표 기간 종료일까지 7일 남았어요: ${goalTitle}`;
        }

        if (l.type === "ACTIVITY_COMPLETE" && l.refType === "USER_ACTIVITY") {
          const a = actMap.get(l.refId);
          const actTitle = a?.title ?? "(삭제된 활동)";
          title = "활동 완료 리마인더";
          body = `아직 완료되지 않았어요: ${actTitle}`;
        }

        return {
          id: l.id,
          type: l.type, // "DDAY" | "ACTIVITY_COMPLETE"
          title,
          body,
          refType: l.refType,
          refId: l.refId,
          sendDate: l.sendDate,
          sentAt: l.sentAt,
        };
      });

      const nextCursorId = logs.length ? logs[logs.length - 1].id : null;

      return res.status(200).json({
        resultType: "SUCCESS",
        error: null,
        success: {
          notifications: items,
          nextCursorId,
        },
      });
    } catch (e) {
      console.error(e?.stack ?? e);
      return res.status(500).json({
        resultType: "FAIL",
        error: { errorCode: "N500", reason: "알림함 조회 실패", data: null },
        success: null,
      });
    }
  });
}
