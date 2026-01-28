import { findRemindersByUserId, upsertReminder } from "../repositories/notification.repository.js";

export async function getNotificationSettings(userId) {
  const reminders = await findRemindersByUserId(userId);

  const settings = {
    dDayReminderEnabled: true,
    activityCompleteReminderEnabled: true,
  };

  reminders.forEach((r) => {
    if (r.reminderType === "D_DAY") settings.dDayReminderEnabled = r.isEnabled;
    if (r.reminderType === "ACTIVITY_COMPLETE") settings.activityCompleteReminderEnabled = r.isEnabled;
  });

  return { resultType: "SUCCESS", error: null, success: settings };
}

export async function updateNotificationSettings(userId, body) {
  const { dDayReminderEnabled, activityCompleteReminderEnabled } = body ?? {};

  // “전달된 것만 수정” 정책
  if (typeof dDayReminderEnabled === "boolean") {
    await upsertReminder(userId, "D_DAY", dDayReminderEnabled);
  }
  if (typeof activityCompleteReminderEnabled === "boolean") {
    await upsertReminder(userId, "ACTIVITY_COMPLETE", activityCompleteReminderEnabled);
  }

  // 변경 후 최신값 다시 조회해서 반환
  return await getNotificationSettings(userId);
}
