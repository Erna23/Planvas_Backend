import { prisma } from "../db.config.js";

// 1. 유저 찾기
export const findUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
};

// 2. 리프레시 토큰 저장
export const updateUserRefreshToken = async (userId, refreshToken) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { refreshToken },
  });
};

// 3. 구글 일정 Upsert (✅ type을 GOOGLE로 세팅 권장)
export const upsertUserActivity = async (userId, event) => {
  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;

  return await prisma.userActivity.upsert({
    where: { googleEventId: event.id },
    update: {
      title: event.summary || "제목 없음",
      startAt: new Date(start),
      endAt: new Date(end),
      type: "GOOGLE",
    },
    create: {
      userId,
      googleEventId: event.id,
      title: event.summary || "제목 없음",
      startAt: new Date(start),
      endAt: new Date(end),
      type: "GOOGLE",
      status: "TODO",
    },
  });
};

// 4. 월간 일정 조회 (기간 겹치는 모든 일정)
export const findMonthlyActivities = async (userId, startDate, endDate) => {
  return await prisma.userActivity.findMany({
    where: {
      userId,
      startAt: { lte: endDate },
      endAt: { gte: startDate },
    },
    orderBy: { startAt: "asc" },
  });
};

// 5. 일간 일정 조회 (기간 겹치는 모든 일정)
export const findDailyActivities = async (userId, startOfDay, endOfDay) => {
  return await prisma.userActivity.findMany({
    where: {
      userId,
      startAt: { lte: endOfDay },
      endAt: { gte: startOfDay },
    },
    orderBy: { startAt: "asc" },
  });
};

// 6. 직접 일정 생성
export const createUserActivity = async (userId, { title, startAt, endAt, type = "MANUAL" }) => {
  return await prisma.userActivity.create({
    data: {
      userId,
      title,
      startAt,
      endAt,
      type, // "MANUAL" | "FIXED"
      status: "TODO",
    },
  });
};

// 7. 직접 일정 수정
export const updateUserActivity = async (userId, eventId, data) => {
  const result = await prisma.userActivity.updateMany({
    where: {
      id: eventId,
      userId,
      // 구글 일정 수정/삭제 막고 싶으면:
      // googleEventId: null,
    },
    data,
  });

  if (result.count === 0) return null;

  return await prisma.userActivity.findFirst({
    where: { id: eventId, userId },
  });
};

// 8. 직접 일정 삭제
export const deleteUserActivity = async (userId, eventId) => {
  const result = await prisma.userActivity.deleteMany({
    where: {
      id: eventId,
      userId,
      // googleEventId: null,
    },
  });

  return result.count > 0;
};
