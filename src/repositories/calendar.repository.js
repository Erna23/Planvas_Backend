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

// 3. 구글 일정 Upsert
export const upsertUserActivity = async (userId, event) => {
  const googleEventId = event?.id;
  if (!googleEventId) throw new Error("INVALID_GOOGLE_EVENT");

  const { startAt, endAt } = parseGoogleStartEnd(event);
  if (!startAt || !endAt) throw new Error("INVALID_GOOGLE_EVENT_TIME");

  const title = event?.summary ?? "제목 없음";

  const existing = await prisma.userActivity.findUnique({
    where: { googleEventId },
  });

  if (existing) {
    if (existing.userId !== userId) {
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

// 4. 월간 일정 조회
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

// 5. 일간 일정 조회
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
export const createUserActivity = async (userId, { title, startAt, endAt, type = "MANUAL", eventColor, recurrenceRule }) => {
  const allowed = new Set(["MANUAL", "FIXED"]);
  const finalType = allowed.has(type) ? type : "MANUAL";
  const finalColor = (eventColor >= 1 && eventColor <= 10) ? eventColor : 1;

  return prisma.userActivity.create({
    data: {
      userId,
      title,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      type: finalType,
      eventColor: finalColor, // 다시 추가
      recurrenceRule: recurrenceRule ?? null, // 다시 추가
      status: "TODO",
    },
  });
};

// 7. 직접 일정 수정
export const updateUserActivity = async (userId, eventId, data) => {
  if (data.eventColor && (data.eventColor < 1 || data.eventColor > 10)) {
    data.eventColor = 1;
  }

  const result = await prisma.userActivity.updateMany({
    where: { id: eventId, userId, googleEventId: null },
    data, // 이제 data 안에 eventColor가 있어도 에러가 나지 않습니다.
  });

  if (result.count === 0) return null;
  return prisma.userActivity.findFirst({ where: { id: eventId, userId } });
};

// 8. 직접 일정 삭제
export const deleteUserActivity = async (userId, eventId) => {
  const result = await prisma.userActivity.deleteMany({
    where: {
      id: eventId,
      userId,
      googleEventId: null,
    },
  });

  return result.count > 0;
};