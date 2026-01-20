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
 * - 유저가 이미 연동된 상태인지 확인
 */
export const getCalendarStatus = async (userId) => {
  const user = await calendarRepository.findUserById(userId);
  return {
    isConnected: !!user?.refreshToken, // 토큰이 있으면 true, 없으면 false
  };
};

/**
 * 3. 캘린더 동기화 (Google -> DB 저장)
 */
export const syncGoogleEvents = async (userId) => {
  // 레포지토리 호출
  const user = await calendarRepository.findUserById(userId);
  
  if (!user?.refreshToken) {
    throw new Error("NOT_CONNECTED");
  }

  // 구글 클라이언트 설정
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
  );
  oauth2Client.setCredentials({ refresh_token: user.refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const now = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(now.getMonth() + 3);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: threeMonthsLater.toISOString(),
    maxResults: 200,
    singleEvents: true,
    orderBy: "startTime",
  });
  
  const events = response.data.items || [];

  // DB 저장 로직도 레포지토리에게 위임
  if (events.length > 0) {
    const promises = events.map((event) => 
      calendarRepository.upsertUserActivity(userId, event)
    );
    await Promise.all(promises);
  }

  return events.length;
};

/**
 * 4. 구글 일정 목록 조회 (DB 저장 X, 미리보기용)
 * - 동기화 버튼 누르기 전에 "이런 일정이 있어요" 보여주는 용도
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
    maxResults: 50, // 미리보기니까 적당히
    singleEvents: true,
    orderBy: "startTime",
  });

  return response.data.items || [];
};

/**
 * 5. 월간 조회 (DB에서 조회)
 */
export const getMonthlyEvents = async (userId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // 레포지토리 호출
  return await calendarRepository.findMonthlyActivities(userId, startDate, endDate);
};

/**
 * 6. 일간 조회 (DB에서 조회)
 */
export const getDailyEvents = async (userId, dateStr) => {
  const targetDate = new Date(dateStr);
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  // 레포지토리 호출
  return await calendarRepository.findDailyActivities(userId, startOfDay, endOfDay);
};