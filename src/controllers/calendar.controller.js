import { requireAuth } from "../auth.config.js";
import {
    calendarResponseDTO,
    calendarMonthResponseDTO,
    calendarDayDetailResponseDTO,
} from "../dtos/calendar.dto.js";
import * as calendarService from "../services/calendar.service.js";
import { ok, fail, getAuthUserId } from "../utils/apiResponse.js";

// ===== KST(+09:00) 응답 변환 유틸 =====
const toKstIsoString = (value) => {
  if (!value) return value;

  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return value;

  // UTC -> KST(+9h)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("Z", "+09:00");
};

// 객체/배열 payload에서 특정 날짜 필드만 KST로 변환
const convertDatesToKstDeep = (payload) => {
  if (payload === null || payload === undefined) return payload;

  // Date 자체가 오면 변환
  if (payload instanceof Date) return toKstIsoString(payload);

  // 배열이면 재귀
  if (Array.isArray(payload)) {
    return payload.map(convertDatesToKstDeep);
  }

  // 객체면 날짜 필드만 변환 + 내부 재귀
  if (typeof payload === "object") {
    const out = { ...payload };

    // 흔히 내려주는 날짜 필드들만 변환 (안전하게)
    const dateKeys = ["startAt", "endAt", "createdAt", "updatedAt", "recurrenceEndAt"];

    for (const k of dateKeys) {
      if (k in out && out[k] !== null && out[k] !== undefined) {
        out[k] = toKstIsoString(out[k]);
      }
    }

    // 나머지 필드들도 중첩 구조면 재귀 변환
    for (const key of Object.keys(out)) {
      // dateKeys는 이미 처리했으니 스킵해도 되고, 중복 변환 방지 차원에서 스킵
      if (dateKeys.includes(key)) continue;
      out[key] = convertDatesToKstDeep(out[key]);
    }

    return out;
  }

  // string/number/boolean 등은 그대로
  return payload;
};


export function registerCalendarRoutes(app) {
    // 1) Connect
    app.post("/api/integrations/google-calendar/connect", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const code = req.body?.code;
            if (!code) return fail(res, "C400", "code는 필수입니다.", 400);

            await calendarService.connectGoogleCalendar(userId, code);
            return ok(res, { message: "연동 성공" }, 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C001", "연동 실패", 500, e?.message ?? null);
        }
    });

    // 2) Status
    app.get("/api/integrations/google-calendar/status", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const status = await calendarService.getCalendarStatus(userId); // { isConnected }
            return ok(res, status, 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C005", "상태 조회 실패", 500, e?.message ?? null);
        }
    });

    // 3) Events Preview
    app.get("/api/integrations/google-calendar/events", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const rawEvents = await calendarService.getGoogleEventsList(userId);
            const formattedEvents = calendarResponseDTO(rawEvents);

            return ok(res, convertDatesToKstDeep({ events: formattedEvents }), 200);
        } catch (e) {
            console.error(e);
            if (e?.message === "NOT_CONNECTED") {
                return fail(res, "C002", "연동 필요", 400);
            }
            return fail(res, "C006", "목록 조회 실패", 500, e?.message ?? null);
        }
    });

    // 4) Sync
    app.post("/api/integrations/google-calendar/sync", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const events = req.body?.events;
            if (!Array.isArray(events)) return fail(res, "C400", "events는 배열이어야 합니다.", 400);

            const savedCount = await calendarService.syncGoogleEvents(userId, events);
            return ok(res, { savedCount }, 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C003", "동기화 실패", 500, e?.message ?? null);
        }
    });

    // 5) Month
    app.get("/api/calendar/month", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const year = Number(req.query?.year);
            const month = Number(req.query?.month);
            if (!Number.isFinite(year) || !Number.isFinite(month)) {
                return fail(res, "C400", "year, month 파라미터가 올바르지 않습니다.", 400);
            }

            const rawData = await calendarService.getMonthlyEvents(userId, year, month);
            const resultData = calendarMonthResponseDTO(rawData, year, month, 3);

            return ok(res, convertDatesToKstDeep(resultData), 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C007", "월간 조회 실패", 500, e?.message ?? null);
        }
    });

    // 6) Day
    app.get("/api/calendar/day", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const date = req.query?.date;
            if (!date) return fail(res, "C400", "date 파라미터가 올바르지 않습니다.", 400);

            const rawData = await calendarService.getDailyEvents(userId, date);
            const resultData = calendarDayDetailResponseDTO(rawData, date);

            return ok(res, convertDatesToKstDeep(resultData), 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C008", "일간 조회 실패", 500, e?.message ?? null);
        }
    });

    // 7) Manual Create (eventColor, recurrenceRule 전달 활성화)
    app.post("/api/calendar/event", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const { title, startAt, endAt, type, eventColor, recurrenceRule, recurrenceEndAt,category } = req.body ?? {};

            if (!title || !startAt || !endAt) {
                return fail(res, "C400", "title, startAt, endAt는 필수입니다.", 400);
            }

            // 이제 서비스로 모든 필드를 넘겨줍니다.
            const created = await calendarService.createManualEvent(userId, {
                title,
                startAt,
                endAt,
                type,
                eventColor,
                recurrenceRule,
                recurrenceEndAt,
                category,
            });

            return ok(res, convertDatesToKstDeep(created), 201);
        } catch (e) {
            console.error(e);
            return fail(res, "C009", "일정 생성 실패", 500, e?.message ?? null);
        }
    });

    // 8) Manual Update (필드 차단 로직 제거)
    app.patch("/api/calendar/event/:id", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const eventId = Number(req.params.id);
            if (!Number.isFinite(eventId)) return fail(res, "C400", "event id가 올바르지 않습니다.", 400);

            // 이전의 Destructuring 제거: 이제 모든 필드를 payload로 전달합니다.
            const payload = req.body ?? {};

            const updated = await calendarService.updateManualEvent(userId, eventId, payload);
            if (!updated) return fail(res, "C404", "수정할 일정이 없습니다.", 404);

            return ok(res, convertDatesToKstDeep(updated), 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C010", "일정 수정 실패", 500, e?.message ?? null);
        }
    });

    // 9) Manual Delete (기존과 동일)
    app.delete("/api/calendar/event/:id", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const eventId = Number(req.params.id);
            if (!Number.isFinite(eventId)) return fail(res, "C400", "event id가 올바르지 않습니다.", 400);

            const deleted = await calendarService.deleteManualEvent(userId, eventId);
            if (!deleted) return fail(res, "C404", "삭제할 일정이 없습니다.", 404);

            return ok(res, { message: "삭제되었습니다." }, 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C011", "일정 삭제 실패", 500, e?.message ?? null);
        }
    });

    // 10) Event Detail (일정 상세 조회)
    app.get("/api/calendar/event/:id", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const eventId = Number(req.params.id);
            if (!Number.isFinite(eventId)) {
                return fail(res, "C400", "event id가 올바르지 않습니다.", 400);
            }

            // 서비스에서 요구 DTO 형태로 만들어서 반환하게 할 것
            const detail = await calendarService.getEventDetail(userId, eventId);
            if (!detail) return fail(res, "C404", "해당 일정을 찾을 수 없습니다.", 404);
            return ok(res, convertDatesToKstDeep(detail), 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C012", "일정 상세 조회 실패", 500, e?.message ?? null);
        }
    });
}

