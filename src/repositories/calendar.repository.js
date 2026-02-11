import { prisma } from "../db.config.js";

// 1. 유저 찾기
export const findUserById = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
  });
};

// 2. 리프레시 토큰 저장
export const updateUserRefreshToken = async (userId, refreshToken) => {
  return prisma.user.update({
    where: { id: userId },
    data: { refreshToken },
  });
};

// 내부 유틸: Google event start/end 파싱
const parseGoogleStartEnd = (event) => {
  const start = event?.start?.dateTime ?? event?.start?.date ?? null;
  const end = event?.end?.dateTime ?? event?.end?.date ?? null;

  const startAt = start ? new Date(start) : null;
  const endAt = end ? new Date(end) : null;

  if (!startAt || Number.isNaN(startAt.getTime())) return { startAt: null, endAt: null };
  if (!endAt || Number.isNaN(endAt.getTime())) return { startAt: null, endAt: null };

  return { startAt, endAt };
};

// 3. 구글 일정 Upsert (userId 보호 포함)
export const upsertUserActivity = async (userId, event) => {
  const googleEventId = event?.id;
  if (!googleEventId) throw new Error("INVALID_GOOGLE_EVENT");

  const { startAt, endAt } = parseGoogleStartEnd(event);
  if (!startAt || !endAt) throw new Error("INVALID_GOOGLE_EVENT_TIME");

  const title = event?.summary ?? "제목 없음";

  // upsert(where unique)만 쓰면 userId 분리가 안 되므로, 먼저 조회 후 userId 검증
  const existing = await prisma.userActivity.findUnique({
    where: { googleEventId },
  });

  if (existing) {
    if (existing.userId !== userId) {
      // 다른 user의 row를 덮어쓰는 사고 방지
      throw new Error("GOOGLE_EVENT_OWNERSHIP_MISMATCH");
    }

    return prisma.userActivity.update({
      where: { id: existing.id },
      data: {
        title,
        startAt,
        endAt,
        type: "GOOGLE",
      },
    });
  }

  return prisma.userActivity.create({
    data: {
      userId,
      googleEventId,
      title,
      startAt,
      endAt,
      type: "GOOGLE",
      status: "TODO",
    },
  });
};

// 4. 월간 일정 조회 (기간 겹치는 모든 일정)
export const findMonthlyActivities = async (userId, startDate, endDate) => {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    throw new Error("INVALID_START_DATE");
  }
  if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
    throw new Error("INVALID_END_DATE");
  }

  return prisma.userActivity.findMany({
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
  if (!(startOfDay instanceof Date) || Number.isNaN(startOfDay.getTime())) {
    throw new Error("INVALID_START_OF_DAY");
  }
  if (!(endOfDay instanceof Date) || Number.isNaN(endOfDay.getTime())) {
    throw new Error("INVALID_END_OF_DAY");
  }

  return prisma.userActivity.findMany({
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
  // 최소 검증
  const allowed = new Set(["MANUAL", "FIXED"]);
  const finalType = allowed.has(type) ? type : "MANUAL";

  return prisma.userActivity.create({
    data: {
      userId,
      title,
      startAt,
      endAt,
      type: finalType,
      status: "TODO",
    },
  });
};

// 7. 직접 일정 수정 (구글 일정 수정 막기 옵션 포함)
export const updateUserActivity = async (userId, eventId, data) => {
  const result = await prisma.userActivity.updateMany({
    where: {
      id: eventId,
      userId,
      googleEventId: null, // ✅ 구글 일정 수정 막기 (원하면 주석 제거하지 말고 유지)
    },
    data,
  });

  if (result.count === 0) return null;

  return prisma.userActivity.findFirst({
    where: { id: eventId, userId },
  });
};

// 8. 직접 일정 삭제 (구글 일정 삭제 막기 옵션 포함)
export const deleteUserActivity = async (userId, eventId) => {
  const result = await prisma.userActivity.deleteMany({
    where: {
      id: eventId,
      userId,
      googleEventId: null, // ✅ 구글 일정 삭제 막기
    },
  });

  return result.count > 0;
};
