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
}

/**
 * UserProfile - Interests 조회
 * NOTE: Prisma 스키마에 따라 모델/필드명이 다르면 아래를 수정하세요.
 * - userProfile 모델명: UserProfile
 * - interests 필드: Int[] (혹은 Json)
 */
export async function findUserProfileByUserId(userId) {
  return prisma.userProfile.findFirst({ where: { userId } });
}

/**
 * Interest 마스터 테이블 조회
 * NOTE: Prisma 스키마에 따라 모델명이 interest가 아닐 수 있습니다.
 * ex) prisma.interest / prisma.interests / prisma.interestCategory ...
 */
export async function findInterestsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  return prisma.interest.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
}
