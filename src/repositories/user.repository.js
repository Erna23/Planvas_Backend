import { prisma } from "../db.config.js";

/**
 * User
 */
export async function findUserByProviderOauthId(provider, oauthId) {
  return prisma.user.findFirst({ where: { provider, oauthId } });
}

export async function createUser({ email, provider, oauthId, name }) {
  return prisma.user.create({ data: { email, provider, oauthId, name } });
}

export async function findUserById(id) {
  return prisma.user.findFirst({ where: { id } });
}

export async function markOnboardingCompleted(id) {
  return prisma.user.update({
    where: { id },
    data: { onboardingCompleted: true },
  });
}

/**
 * GoalPeriod
 */
export async function createGoalPeriod({
  userId,
  title,
  startDate,
  endDate,
  growth,
  rest,
  presetType,
}) {
  return prisma.goalPeriod.create({
    data: { userId, title, startDate, endDate, growth, rest, presetType },
  });
}

/**
 * UserProfile
 */
export async function upsertUserProfileInterests(userId, interests) {
  return prisma.userProfile.upsert({
    where: { userId },
    update: { interests },
    create: { userId, interests },
  });
}

/**
 * CalendarSetting
 */
export async function upsertCalendarSetting(userId, calendar) {
  return prisma.calendarSetting.upsert({
    where: { userId },
    update: {
      connect: !!calendar.connect,
      provider: calendar.provider ?? null,
      importFixedSchedules: !!calendar.importFixedSchedules,
      selectedEventIds: calendar.selectedEventIds ?? null,
      manualFixedSchedules: calendar.manualFixedSchedules ?? null,
    },
    create: {
      userId,
      connect: !!calendar.connect,
      provider: calendar.provider ?? null,
      importFixedSchedules: !!calendar.importFixedSchedules,
      selectedEventIds: calendar.selectedEventIds ?? null,
      manualFixedSchedules: calendar.manualFixedSchedules ?? null,
    },
  });
<<<<<<< HEAD
}
=======
}
>>>>>>> 27297438c8f56cd6e6e681e8d02f60699632b3e2
