import { prisma } from "../db.config.js";

// 1. 최신 목표(가장 최근 생성)
export const findRecentGoal = async (userId) => {
  return await prisma.goalPeriod.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

// ✅ 1-1. 진행중 목표(오늘이 기간 안)
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

// ✅ 4. 목표 진행률 계산용 (myactivity + activity 관계 이용)
export const findMyActivitiesForGoal = async (userId, goalId) => {
  return await prisma.myactivity.findMany({
    where: { userId, goalId },
    select: {
      id: true,
      activity: { // 스키마의 관계 설정에 따라 소문자 activity
        select: { tab: true }
      },
    },
  });
};

// 5. 추천 활동 조회 (스키마 필드명에 맞춤)
export const findRecommendations = async () => {
  return await prisma.activity.findMany({
    take: 3,
    select: {
      id: true,
      title: true,
      organizer: true,
      thumbnailUrl: true, // 스키마의 thumbnail_url @map 반영됨
      tags: true,
      recruit_end_date: true, // 스키마의 실제 필드명
      tab: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};