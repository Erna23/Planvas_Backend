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

  // ✅ 여기서 겹침 판정 (create 전에!)
  const decision = await decideScheduleStatus({
    prisma,
    userId,
    activityCatalog: activity, // findById가 tab/point/categoryId/description 포함해서 반환해야 함
    startDate,
    endDate,
  });

  // ✅ CONFLICT면 409로 막기 (컨트롤러에서 e.statusCode/e.payload 반영 필요)
  if (decision.status === "CONFLICT") {
    const err = new Error(decision.reason);
    err.statusCode = 409;
    err.payload = failPayload("SCHEDULE_CONFLICT", decision.reason, decision);
    throw err;
  }

  const created = await createMyActivity({
    userId,
    goalId,
    activityId,
    startDate,
    endDate,
    point,
  });

  await calendarRepository.createUserActivity(userId, {
    title: activity.title,
    startAt: new Date(startDate),
    endAt: new Date(endDate),
    type: "NORMAL",              
    category: activity.tab,     
    eventColor: 1,               
  });


  return {
    myActivityId: created.id,
    activityId: activity.id,
    title: activity.title,
    category: activity.tab,
    point,
    startDate,
    endDate,
    // ✅ CAUTION/AVAILABLE 내려주기
    scheduleStatus: decision.status,
    scheduleReason: decision.reason,
  };
}