import { google } from "googleapis";
import { getGoogleTokens } from "../auth.config.js";
import * as calendarRepository from "../repositories/calendar.repository.js";

/**
 * 1. 구글 연동
 */
export const connectGoogleCalendar = async (userId, code) => {
  const { refreshToken } = await getGoogleTokens(code);

  if (refreshToken) {
    await calendarRepository.updateUserRefreshToken(userId, refreshToken);
    return true;
  }
  return false;
};

/**
 * 2. 연동 상태 조회
 */
export const getCalendarStatus = async (userId) => {
  const user = await calendarRepository.findUserById(userId);
  return {
    isConnected: !!user?.refreshToken,
  };
};

/**
 * 3. 캘린더 동기화 (Google -> DB 저장)
 * [수정됨] 
 * - 기존: Google API로 직접 조회 -> 전체 저장
 * - 변경: Controller에서 넘겨준 '선택된 일정(events)'을 -> DB에 저장
 */
export const syncGoogleEvents = async (userId, events) => {
  // 1. 저장할 일정이 없으면 0 리턴
  if (!events || events.length === 0) {
    return 0;
  }

  // 2. 받은 목록을 순회하며 DB에 저장 (Promise.all로 병렬 처리)
  // Repository의 upsertUserActivity 함수가 이미 Google Event 객체 구조를 처리하도록 되어있으므로 그대로 전달
  const promises = events.map((event) =>
    calendarRepository.upsertUserActivity(userId, event)
  );

  await Promise.all(promises);

  return events.length; // 저장된 개수 반환
};

/**
 * 4. 구글 일정 목록 조회 (DB 저장 X, 미리보기용)
 */
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

/**
 * 5. 월간 조회 (DB에서 조회)
 */
export const getMonthlyEvents = async (userId, year, month) => {
  // 해당 월의 1일
  const startDate = new Date(year, month - 1, 1);
  // 해당 월의 마지막 날 (0일은 전달의 마지막 날을 의미하지만, month가 다음달 인덱스이므로 현재달 마지막 날이 됨)
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return await calendarRepository.findMonthlyActivities(userId, startDate, endDate);
};

/**
 * 6. 일간 조회 (DB에서 조회)
 */
export const getDailyEvents = async (userId, dateStr) => {
  const targetDate = new Date(dateStr);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  return await calendarRepository.findDailyActivities(userId, startOfDay, endOfDay);
};