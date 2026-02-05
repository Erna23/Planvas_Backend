import { createMyActivity } from "../repositories/myActivity.repository.js";
import { findById } from "../repositories/activity.repository.js";

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
