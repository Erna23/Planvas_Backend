import { requireAuth } from "../auth.config.js";
import {
    calendarResponseDTO,
    calendarMonthResponseDTO,
    calendarDayDetailResponseDTO,
} from "../dtos/calendar.dto.js";
import * as calendarService from "../services/calendar.service.js";
import { ok, fail, getAuthUserId } from "../utils/apiResponse.js";

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

            return ok(res, { events: formattedEvents }, 200);
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

            return ok(res, resultData, 200);
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

            return ok(res, resultData, 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C008", "일간 조회 실패", 500, e?.message ?? null);
        }
    });

    // 7) Manual Create (색상 및 반복 규칙 추가)
    app.post("/api/calendar/event", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            // ✅ eventColor, recurrenceRule 추가 추출
            const { title, startAt, endAt, type, eventColor, recurrenceRule } = req.body ?? {};
            if (!title || !startAt || !endAt) {
                return fail(res, "C400", "title, startAt, endAt는 필수입니다.", 400);
            }

            const created = await calendarService.createManualEvent(userId, {
                title,
                startAt,
                endAt,
                type,
                eventColor,      // ✅ 서비스 레이어로 전달
                recurrenceRule,   // ✅ 서비스 레이어로 전달
            });

            return ok(res, created, 201);
        } catch (e) {
            console.error(e);
            return fail(res, "C009", "일정 생성 실패", 500, e?.message ?? null);
        }
    });

    // 8) Manual Update (필드 유연성 확보)
    app.patch("/api/calendar/event/:id", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return fail(res, "AUTH001", "인증 정보가 없습니다.", 401);

            const eventId = Number(req.params.id);
            if (!Number.isFinite(eventId)) return fail(res, "C400", "event id가 올바르지 않습니다.", 400);

            // ✅ req.body 전체를 넘기도록 하여 eventColor, recurrenceRule 수정 대응
            const updated = await calendarService.updateManualEvent(userId, eventId, req.body ?? {});
            if (!updated) return fail(res, "C404", "수정할 일정이 없습니다.", 404);

            return ok(res, updated, 200);
        } catch (e) {
            console.error(e);
            return fail(res, "C010", "일정 수정 실패", 500, e?.message ?? null);
        }
    });

    // 9) Manual Delete
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
}
