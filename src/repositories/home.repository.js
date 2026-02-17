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

// 주간 일정 조회 (point, eventColor 필드 추가)
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
      category: true,
      startAt: true,
      endAt: true,
      status: true,
      point: true,
      eventColor: true,
      googleEventId: true,
    },
    orderBy: { startAt: "asc" },
  });
};

// 오늘의 할 일 조회 (point, eventColor 필드 추가)
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
      category: true,
      status: true,
      startAt: true,
      endAt: true,
      point: true,
      eventColor: true,
      googleEventId: true,
      recurrenceRule: true,
    },
    orderBy: { startAt: "asc" },
  });
};

// 진행률 계산
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

// 특정 일정 단건 조회 (상태 변경 전 확인용)
export const findActivityById = async (activityId) => {
  return await prisma.userActivity.findUnique({
    where: { id: parseInt(activityId) }, // activityId가 문자열로 올 수 있으므로 숫자로 변환
  });
};

// 일정 상태 업데이트 (TODO <-> DONE)
export const updateActivityStatus = async (activityId, status) => {
  return await prisma.userActivity.update({
    where: { id: parseInt(activityId) },
    data: { status },
  });
};