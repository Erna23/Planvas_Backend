import { prisma } from "../db.config.js";
import { createMyActivity } from "../repositories/myActivity.repository.js";
import { findById } from "../repositories/activity.repository.js";
import * as calendarRepository from "../repositories/calendar.repository.js";
import { failPayload } from "../utils/apiResponse.js";
import { decideScheduleStatus } from "./scheduleOverlap.service.js";


export async function addMyActivity(userId, activityId, body) {

  const activity = await findById(activityId);
  if (!activity) return { notFound: true };

  const { goalId, startDate, endDate, point } = body || {};
  if (!goalId || !startDate || !endDate || !point) return { bad: true };

  // 1) 겹침 판정 먼저
  const decision = await decideScheduleStatus({
    prisma,
    userId,
    activityCatalog: activity, // findById가 tab/point/categoryId/description 포함해서 반환해야 함
    startDate,
    endDate,
  });

  // 2) CONFLICT면 여기서 막기 (아무 것도 생성 X)
  if (decision.status === "CONFLICT") {
    const err = new Error(decision.reason);
    err.statusCode = 409;
    err.payload = failPayload("SCHEDULE_CONFLICT", decision.reason, decision);
    throw err;
  }

  // 3) MyActivity 생성
  const created = await createMyActivity({
    userId,
    goalId,
    activityId,
    startDate,
    endDate,
    point,
  });

  // 4) 캘린더(UserActivity) 생성 (eventId)
  const ua = await calendarRepository.createUserActivity(userId, {
    title: activity.title,
    startAt: `${startDate}T00:00:00+09:00`,
    endAt: `${endDate}T23:59:59+09:00`,
    type: "ACTIVITY",
    category: activity.tab, // GROWTH/REST
    point,
    eventColor: 1,
    recurrenceRule: null,
  });

  // 5) MyActivity에 eventId 매핑 저장
  await prisma.myActivity.update({
    where: { id: created.id },
    data: { userActivityId: ua.id },
  });
  
  return {
    myActivityId: created.id,
    eventId: ua.id,
    activityId: activity.id,
    title: activity.title,
    category: activity.tab,
    point,
    startDate,
    endDate,
    // CAUTION/AVAILABLE 내려주기
    scheduleStatus: decision.status,
    scheduleReason: decision.reason,
  };
}