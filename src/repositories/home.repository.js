import { prisma } from "../db.config.js";

// 1. 최신 목표 조회
export const findRecentGoal = async (userId) => {
  return await prisma.goalPeriod.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

// 1-1. 현재 진행 중인 목표 조회
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

// 2. 주간 일정 조회
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
      startAt: true,
      endAt: true,
      status: true,
      googleEventId: true,
    },
    orderBy: { startAt: "asc" },
  });
};

// 3. 오늘의 할 일 조회
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
      status: true,
      startAt: true,
      endAt: true,
      googleEventId: true,
    },
    orderBy: { startAt: "asc" },
  });
};

// 4. 진행률 계산 (MyActivity 모델 사용)
export const findMyActivitiesForGoal = async (userId, goalId) => {
  return await prisma.myActivity.findMany({
    where: { userId, goalId },
    select: {
      id: true,
      Activity: { // 스키마 정의에 따른 관계 필드명 (대문자 A)
        select: { tab: true }
      },
    },
  });
};

// 5. 추천 활동 (ActivityCatalog 모델 사용)
export const findRecommendations = async () => {
  return await prisma.activityCatalog.findMany({
    take: 3,
    select: {
      id: true,
      title: true,
      organizer: true,
      thumbnailUrl: true,
      tags: true,
      recruitEndDate: true, // @map("recruit_end_date")에 따른 카멜케이스 사용
      tab: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};