import { google } from "googleapis";
import { getGoogleTokens } from "../auth.config.js";
import * as calendarRepository from "../repositories/calendar.repository.js";

// 1. 구글 연동 (기존과 동일)
export const connectGoogleCalendar = async (userId, code) => {
  const { refreshToken } = await getGoogleTokens(code);
  if (refreshToken) {
    await calendarRepository.updateUserRefreshToken(userId, refreshToken);
    return true;
  }
  return false;
};

// 2. 연동 상태 조회 (기존과 동일)
export const getCalendarStatus = async (userId) => {
  const user = await calendarRepository.findUserById(userId);
  return { isConnected: !!user?.refreshToken };
};

// 3. 구글 일정 DB 저장 (기존과 동일)
export const syncGoogleEvents = async (userId, events) => {
  if (!events || events.length === 0) return 0;
  await Promise.all(events.map((event) => calendarRepository.upsertUserActivity(userId, event)));
  return events.length;
};

// 4. 구글 일정 목록 조회 (기존과 동일)
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

// 5. 월간 조회 (기존과 동일)
export const getMonthlyEvents = async (userId, year, month) => {
  const y = Number(year);
  const m = Number(month);
  const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);
  return await calendarRepository.findMonthlyActivities(userId, startDate, endDate);
};

// 6. 일간 조회 (기존과 동일)
export const getDailyEvents = async (userId, dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
  return await calendarRepository.findDailyActivities(userId, startOfDay, endOfDay);
};

// 7. 직접 일정 생성 (eventColor, recurrenceRule 복구)
export const createManualEvent = async (
  userId,
  { title, startAt, endAt, type, eventColor, recurrenceRule, recurrenceEndAt, category }
) => {
  const eventType = type === "FIXED" ? "FIXED" : "MANUAL";
  const eventCategory = category === "REST" ? "REST" : "GROWTH";

  const s = new Date(startAt);
  const e = new Date(endAt);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    throw new Error("startAt/endAt 날짜 형식이 올바르지 않습니다.");
  }
  if (e < s) {
    throw new Error("endAt은 startAt보다 빠를 수 없습니다.");
  }

  // 반복 종료일이 있으면 RRULE 기반으로 다건 생성
  if (recurrenceRule && recurrenceEndAt) {
    const until = new Date(recurrenceEndAt);
    if (isNaN(until.getTime())) throw new Error("recurrenceEndAt 날짜 형식이 올바르지 않습니다.");
    if (until < s) throw new Error("recurrenceEndAt은 startAt보다 빠를 수 없습니다.");

    const rule = parseRRule(recurrenceRule);
    if (!rule) throw new Error("지원하지 않는 recurrenceRule 형식입니다. (지원: DAILY/WEEKLY/MONTHLY)");

    const occ = buildOccurrences({ startAt: s, endAt: e, rule, recurrenceEndAt: until });

    const createdItems = await Promise.all(
      occ.map(({ s: os, e: oe }) =>
        calendarRepository.createUserActivity(userId, {
          title,
          startAt: os,
          endAt: oe,
          type: eventType,
          category: eventCategory,
          eventColor: eventColor || 1,
          recurrenceRule: recurrenceRule || null,
        })
      )
    );

    // 응답: 기존 호환을 위해 첫 번째 item + 생성 개수/전체도 같이 제공(원하면 client가 활용)
    return {
      createdCount: createdItems.length,
      item: createdItems[0],
      items: createdItems,
    };
  }

  // 반복이 없으면 기존처럼 1건 생성
  return await calendarRepository.createUserActivity(userId, {
    title,
    startAt: s,
    endAt: e,
    type: eventType,
    category: eventCategory,
    eventColor: eventColor || 1,
    recurrenceRule: recurrenceRule || null,
  });
};

// 8. 직접 일정 수정 (eventColor, recurrenceRule 필드 허용)
export const updateManualEvent = async (userId, eventId, payload) => {
  const {
    title,
    startAt,
    endAt,
    type,
    category,
    point,
    status,
    eventColor,
    recurrenceRule,
  } = payload ?? {};

  const data = {};

  if (title !== undefined) data.title = title;

  // category 반영 (UserActivity 쪽에서만 NONE 허용하려면 여기서 허용)
  if (category !== undefined) {
    const allowedCategory = new Set(["GROWTH", "REST", "NONE"]); // NONE 필요 없으면 빼도 됨
    if (!allowedCategory.has(category)) {
      throw new Error("category는 GROWTH/REST/NONE만 가능합니다.");
    }
    data.category = category;
  }

  // point 반영
  if (point !== undefined) {
    const p = Number(point);
    if (!Number.isFinite(p)) throw new Error("point는 숫자여야 합니다.");
    data.point = p;
  }

  // status 반영
  if (status !== undefined) {
    const allowedStatus = new Set(["TODO", "DONE"]);
    if (!allowedStatus.has(status)) throw new Error("status는 TODO 또는 DONE만 가능합니다.");
    data.status = status;
  }

  // 색상 및 반복 규칙 업데이트 허용
  if (eventColor !== undefined) data.eventColor = eventColor;
  if (recurrenceRule !== undefined) data.recurrenceRule = recurrenceRule;

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

  // type: ACTIVITY 허용
  if (type !== undefined) {
    const allowedType = new Set(["MANUAL", "FIXED", "ACTIVITY"]);
    if (!allowedType.has(type)) {
      throw new Error("type은 MANUAL/FIXED/ACTIVITY만 가능합니다.");
    }
    data.type = type;
  }

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

// --- RRULE 파서 (최소 지원: FREQ, INTERVAL, BYDAY) ---
const parseRRule = (rrule) => {
  if (!rrule || typeof rrule !== "string") return null;
  const parts = rrule.split(";").map((s) => s.trim()).filter(Boolean);

  const map = {};
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (!k || v === undefined) continue;
    map[k.toUpperCase()] = v;
  }

  const freq = (map.FREQ || "").toUpperCase();         // DAILY | WEEKLY | MONTHLY
  const interval = Math.max(1, Number(map.INTERVAL || 1) || 1);
  const byday = map.BYDAY ? map.BYDAY.split(",").map(s => s.trim().toUpperCase()) : null; // MO,TU...

  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(freq)) return null;

  return { freq, interval, byday };
};

// 요일 문자열 -> JS 요일(0=일..6=토)
const dayCodeToJsDay = (code) => {
  const m = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };
  return m[code] ?? null;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const addMonths = (d, n) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};

// startAt 기준 “반복 발생 startAt들” 생성 (startAt 포함)
const buildOccurrences = ({ startAt, endAt, rule, recurrenceEndAt }) => {
  const durationMs = endAt.getTime() - startAt.getTime();
  const until = recurrenceEndAt;

  const occurrences = [];

  if (rule.freq === "DAILY") {
    let cur = new Date(startAt);
    while (cur <= until) {
      occurrences.push({ s: new Date(cur), e: new Date(cur.getTime() + durationMs) });
      cur = addDays(cur, rule.interval);
    }
    return occurrences;
  }

  if (rule.freq === "WEEKLY") {
    // BYDAY 없으면 startAt의 요일로
    const days = (rule.byday?.length ? rule.byday : [ ["SU","MO","TU","WE","TH","FR","SA"][startAt.getDay()] ])
      .map(dayCodeToJsDay)
      .filter((v) => v !== null);

    // 시작 주의 일요일(weekStart)로 맞추고, interval 주 단위로 전개
    const startWeekStart = addDays(startAt, -startAt.getDay());
    let weekStart = new Date(startWeekStart);

    while (weekStart <= until) {
      for (const jsDay of days) {
        const candidate = addDays(weekStart, jsDay);

        // 시간은 startAt의 시:분:초 유지 (candidate는 날짜만 맞춰졌으니 시간 덮어씌움)
        candidate.setHours(startAt.getHours(), startAt.getMinutes(), startAt.getSeconds(), startAt.getMilliseconds());

        if (candidate < startAt) continue;
        if (candidate > until) continue;

        occurrences.push({ s: new Date(candidate), e: new Date(candidate.getTime() + durationMs) });
      }
      weekStart = addDays(weekStart, 7 * rule.interval);
    }

    // 날짜 정렬
    occurrences.sort((a, b) => a.s - b.s);
    return occurrences;
  }

  if (rule.freq === "MONTHLY") {
    let cur = new Date(startAt);
    while (cur <= until) {
      occurrences.push({ s: new Date(cur), e: new Date(cur.getTime() + durationMs) });
      cur = addMonths(cur, rule.interval);
    }
    return occurrences;
  }

  return occurrences;
};
