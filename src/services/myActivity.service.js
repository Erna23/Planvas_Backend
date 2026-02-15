import { createMyActivity } from "../repositories/myActivity.repository.js";
import { findById } from "../repositories/activity.repository.js";
import * as calendarRepository from "../repositories/calendar.repository.js";

export async function addMyActivity(userId, activityId, body) {

  const activity = await findById(activityId);
  if (!activity) return { notFound: true };

  const { goalId, startDate, endDate, point } = body || {};
  if (!goalId || !startDate || !endDate || !point) return { bad: true };

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
  };
}