// src/repositories/calendar.repository.js
import { prisma } from "../db.config.js";

// 1. 유저 찾기 (토큰 확인용)
export const findUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
};

// 2. 유저 정보 업데이트 (리프레시 토큰 저장)
export const updateUserRefreshToken = async (userId, refreshToken) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: refreshToken },
  });
};

// 3. 일정 저장 (Upsert)
// 서비스가 반복문 돌면서 이 함수를 여러 번 호출하거나, 
// createMany를 쓸 수도 있지만, 여기선 하나씩 처리하는 로직을 감쌉니다.
export const upsertUserActivity = async (userId, event) => {
  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;

  return await prisma.userActivity.upsert({
    where: { googleEventId: event.id },
    update: {
      title: event.summary || "제목 없음",
      startAt: new Date(start),
      endAt: new Date(end),
    },
    create: {
      userId: userId,
      googleEventId: event.id,
      title: event.summary || "제목 없음",
      startAt: new Date(start),
      endAt: new Date(end),
      type: "FIXED",
      status: "TODO",
    },
  });
};

// 4. 월간 일정 조회
export const findMonthlyActivities = async (userId, startDate, endDate) => {
  return await prisma.userActivity.findMany({
    where: {
      userId: userId,
      startAt: { gte: startDate },
      endAt: { lte: endDate },
    },
    orderBy: { startAt: "asc" },
  });
};

// 5. 일간 일정 조회
export const findDailyActivities = async (userId, startOfDay, endOfDay) => {
  return await prisma.userActivity.findMany({
    where: {
      userId: userId,
      startAt: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { startAt: "asc" },
  });
};