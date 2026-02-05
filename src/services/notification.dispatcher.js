import { DateTime } from "luxon";
import { prisma } from "../db.config.js";

const TZ = "Asia/Seoul";

const REMINDER_TYPES = {
  DDAY: "D_DAY",
  ACTIVITY_COMPLETE: "ACTIVITY_COMPLETE",
};

function dayRange(dt) {
  const startDT = dt.setZone(TZ).startOf("day");
  const endDT = dt.setZone(TZ).endOf("day");
  return { startDT, start: startDT.toJSDate(), end: endDT.toJSDate() };
}

async function getEnabledUserIds(reminderType) {
  const rows = await prisma.reminder.findMany({
    where: { reminderType, isEnabled: true },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

/**
 * DDAY: GoalPeriod.endDate가 (오늘) 또는 (오늘+7일)인 경우 1회 생성
 * - NotificationLog에 create 시도 후, 중복(P2002)이면 skipped 처리
 */
export async function runDdayJob(now) {
  const { startDT, start, end } = dayRange(now);
  const sendDate = startDT.toJSDate();

  const userIds = await getEnabledUserIds(REMINDER_TYPES.DDAY);
  if (userIds.length === 0) return { created: 0, skipped: 0 };

  // endDate가 "오늘"인 목표
  const todayTargets = await prisma.goalPeriod.findMany({
    where: { userId: { in: userIds }, endDate: { gte: start, lte: end } },
    select: { id: true, userId: true },
  });

  // endDate가 "오늘 + 7일"인 목표
  const plus7 = startDT.plus({ days: 7 });
  const plus7Range = dayRange(plus7);

  const weekTargets = await prisma.goalPeriod.findMany({
    where: {
      userId: { in: userIds },
      endDate: { gte: plus7Range.start, lte: plus7Range.end },
    },
    select: { id: true, userId: true },
  });

  let created = 0;
  let skipped = 0;

  for (const t of [...todayTargets, ...weekTargets]) {
    try {
      await prisma.notificationLog.create({
        data: {
          userId: t.userId,
          type: "DDAY",
          refType: "GOAL_PERIOD",
          refId: t.id,
          sendDate,
        },
      });
      created += 1;
    } catch (e) {
      if (e?.code === "P2002") {
        skipped += 1;
      } else {
        throw e;
      }
    }
  }

  return { created, skipped };
}

/**
 * 활동 완료: endAt <= 오늘 && status != DONE 인 활동을 매일 21시 생성
 * - NotificationLog에 create 시도 후, 중복(P2002)이면 skipped 처리
 */
export async function runActivityCompleteJob(now) {
  const { startDT } = dayRange(now);
  const sendDate = startDT.toJSDate();

  const userIds = await getEnabledUserIds(REMINDER_TYPES.ACTIVITY_COMPLETE);
  if (userIds.length === 0) return { created: 0, skipped: 0 };

  const targets = await prisma.userActivity.findMany({
    where: {
      userId: { in: userIds },
      endAt: { lte: startDT.endOf("day").toJSDate() },
      NOT: { status: "DONE" }, // ✅ 너희 완료 status 값이 다르면 여기만 바꾸기
    },
    select: { id: true, userId: true },
  });

  let created = 0;
  let skipped = 0;

  for (const t of targets) {
    try {
      await prisma.notificationLog.create({
        data: {
          userId: t.userId,
          type: "ACTIVITY_COMPLETE",
          refType: "USER_ACTIVITY",
          refId: t.id,
          sendDate,
        },
      });
      created += 1;
    } catch (e) {
      if (e?.code === "P2002") {
        skipped += 1;
      } else {
        throw e;
      }
    }
  }

  return { created, skipped };
}
