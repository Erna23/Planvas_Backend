import { google } from "googleapis";
import { getGoogleTokens } from "../auth.config.js";
import * as calendarRepository from "../repositories/calendar.repository.js";

// 1. 구글 연동
export const connectGoogleCalendar = async (userId, code) => {
  const { refreshToken } = await getGoogleTokens(code);

  if (refreshToken) {
    await calendarRepository.updateUserRefreshToken(userId, refreshToken);
    return true;
  }
  return false;
};

// 2. 연동 상태 조회
export const getCalendarStatus = async (userId) => {
  const user = await calendarRepository.findUserById(userId);
  return { isConnected: !!user?.refreshToken };
};

// 3. 선택된 구글 일정 DB 저장
export const syncGoogleEvents = async (userId, events) => {
  if (!events || events.length === 0) return 0;
  await Promise.all(events.map((event) => calendarRepository.upsertUserActivity(userId, event)));
  return events.length;
};

// 4. 구글 일정 목록 조회(미리보기)
export const getGoogleEventsList = async (userId) => {
  const user = await calendarRepository.findUserById(userId);
  if (!user?.refreshToken) throw new Error("NOT_CONNECTED");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
  );
  oauth2Client.setCredentials({ refresh_token: user.refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const end = new Date();
  end.setMonth(now.getMonth() + 3);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    maxResults: 50,
    singleEvents: true,
    orderBy: "startTime",
  });

  return response.data.items || [];
};

// 5. 월간 조회(DB)
export const getMonthlyEvents = async (userId, year, month) => {
  const y = Number(year);
  const m = Number(month);

  const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);

  return await calendarRepository.findMonthlyActivities(userId, startDate, endDate);
};

// 6. 일간 조회(DB)
export const getDailyEvents = async (userId, dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);

  const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);

  return await calendarRepository.findDailyActivities(userId, startOfDay, endOfDay);
};

// 7. 직접 일정 생성 (색상 및 반복 규칙 추가)
export const createManualEvent = async (userId, { title, startAt, endAt, type, eventColor, recurrenceRule }) => {
  const eventType = type === "FIXED" ? "FIXED" : "MANUAL";

  const s = new Date(startAt);
  const e = new Date(endAt);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    throw new Error("startAt/endAt 날짜 형식이 올바르지 않습니다.");
  }
  if (e < s) {
    throw new Error("endAt은 startAt보다 빠를 수 없습니다.");
  }

  // ✅ 리포지토리 호출 시 신규 필드 전달
  return await calendarRepository.createUserActivity(userId, {
    title,
    startAt: s,
    endAt: e,
    type: eventType,
    eventColor,
    recurrenceRule
  });
};

// 8. 직접 일정 수정 (색상 및 반복 규칙 수정 대응)
export const updateManualEvent = async (userId, eventId, payload) => {
  const { title, startAt, endAt, type, eventColor, recurrenceRule } = payload;
  const data = {};

  if (title !== undefined) data.title = title;

  if (startAt !== undefined) {
    const s = new Date(startAt);
    if (isNaN(s.getTime())) throw new Error("startAt 날짜 형식이 올바르지 않습니다.");
    data.startAt = s;
  }

  if (endAt !== undefined) {
    const e = new Date(endAt);
    if (isNaN(e.getTime())) throw new Error("endAt 날짜 형식이 올바르지 않습니다.");
    data.endAt = e;
  }

  if (data.startAt && data.endAt && data.endAt < data.startAt) {
    throw new Error("endAt은 startAt보다 빠를 수 없습니다.");
  }

  if (type !== undefined) {
    if (type !== "MANUAL" && type !== "FIXED") {
      throw new Error("type은 MANUAL 또는 FIXED만 가능합니다.");
    }
    data.type = type;
  }

  // ✅ 신규 필드 업데이트 허용
  if (eventColor !== undefined) data.eventColor = eventColor;
  if (recurrenceRule !== undefined) data.recurrenceRule = recurrenceRule;

  const updated = await calendarRepository.updateUserActivity(userId, eventId, data);
  if (!updated) throw new Error("수정할 일정이 없거나 권한이 없습니다.");

  return updated;
};

// 9. 직접 일정 삭제
export const deleteManualEvent = async (userId, eventId) => {
  const ok = await calendarRepository.deleteUserActivity(userId, eventId);
  if (!ok) throw new Error("삭제할 일정이 없거나 권한이 없습니다.");
  return true;
};