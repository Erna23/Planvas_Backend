import { prisma } from "../db.config.js";

// 1. 최신 목표 조회
export const findRecentGoal = async (userId) => {
  return await prisma.goalPeriod.findFirst({
    where: { userId: userId },
    orderBy: { createdAt: "desc" },
  });
};

// 2. 주간 일정 조회 (날짜별 일정 유무 확인용)
export const findWeeklyActivities = async (userId, startDate, endDate) => {
  return await prisma.userActivity.findMany({
    where: {
      userId,
      startAt: { gte: startDate, lte: endDate },
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
      startAt: { gte: startOfDay, lte: endOfDay },
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


// 4. 진행률 계산을 위한 활동 집계
export const countDoneActivities = async (userId, startDate, endDate) => {
  return await prisma.userActivity.groupBy({
    by: ['type'],
    where: {
      userId: userId,
      status: "DONE", // 완료된 것만
      startAt: { gte: startDate, lte: endDate }
    },
    _count: {
      id: true
    }
  });
};

// 5. [수정됨] 추천 활동 조회
// Recommendation 테이블이 삭제되었으므로 ActivityCatalog 테이블을 조회해야 합니다.
export const findRecommendations = async (take = 3) => {
  return await prisma.activityCatalog.findMany({
    take,
    where: {
      recruitEndDate: { gte: new Date() },
    },
    select: {
      id: true,
      title: true,
      organizer: true,
      thumbnailUrl: true,
      tags: true,
      recruitEndDate: true,
    },
    orderBy: { createdAt: "desc" },
  });
};