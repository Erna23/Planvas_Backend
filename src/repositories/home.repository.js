import { prisma } from "../db.config.js";

// 사용자의 이름 정보 조회
export const findUserInfo = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
};

// 최신 목표 조회
export const findRecentGoal = async (userId) => {
  return await prisma.goalPeriod.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

// 현재 진행 중인 목표 조회
export const findCurrentGoal = async (userId, today = new Date()) => {
  return await prisma.goalPeriod.findFirst({
    where: {
      userId,
      startDate: { lte: today },
      endDate: { gte: today },
    },
    orderBy: { startDate: "desc" },
  });
};

// 주간 일정 조회 (category 필드 추가)
export const findWeeklyActivities = async (userId, startDate, endDate) => {
  return await prisma.userActivity.findMany({
    where: {
      userId,
      startAt: { lte: endDate },
      endAt: { gte: startDate },
    },
    select: {
      id: true,
      title: true,
      type: true,
      category: true, // 💡 디자인 구분을 위해 추가
      startAt: true,
      endAt: true,
      status: true,
      googleEventId: true,
    },
    orderBy: { startAt: "asc" },
  });
};

// 오늘의 할 일 조회 (category 필드 추가)
export const findTodayActivities = async (userId, startOfDay, endOfDay) => {
  return await prisma.userActivity.findMany({
    where: {
      userId,
      startAt: { lte: endOfDay },
      endAt: { gte: startOfDay },
    },
    select: {
      id: true,
      title: true,
      type: true,
      category: true, // 💡 추가
      status: true,
      startAt: true,
      endAt: true,
      googleEventId: true,
    },
    orderBy: { startAt: "asc" },
  });
};

// 진행률 계산 - include를 사용하여 관계 데이터를 더 명확히 가져옴
export const findMyActivitiesForGoal = async (userId, goalId) => {
  return await prisma.myActivity.findMany({
    where: { userId, goalId },
    include: {
      Activity: {
        select: { tab: true }
      },
    },
  });
};

// 추천 활동
export const findRecommendations = async () => {
  return await prisma.activityCatalog.findMany({
    take: 3,
    select: {
      id: true,
      title: true,
      organizer: true,
      thumbnailUrl: true,
      tags: true,
      recruitEndDate: true,
      tab: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};