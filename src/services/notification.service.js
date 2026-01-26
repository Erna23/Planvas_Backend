import { findRemindersByUserId } from "../repositories/notification.repository.js";

export async function getNotificationSettings(userId) {
    const reminders = await findRemindersByUserId(userId);

    const settings = {
    dDayReminderEnabled: true,
    activityCompleteReminderEnabled: true,
};

reminders.forEach((r) => {
    if (r.reminderType === "D_DAY") {
        settings.dDayReminderEnabled = r.isEnabled;
    } else if (r.reminderType === "ACTIVITY_COMPLETE") {
        settings.activityCompleteReminderEnabled = r.isEnabled;
    }
});

return {
    resultType: "SUCCESS",
    error: null,
    success: settings,
    };
}