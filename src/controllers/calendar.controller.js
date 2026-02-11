import { requireAuth } from "../auth.config.js";
import {
    calendarResponseDTO,
    calendarMonthResponseDTO,
    calendarDayDetailResponseDTO,
} from "../dtos/calendar.dto.js";
import * as calendarService from "../services/calendar.service.js";

export function registerCalendarRoutes(app) {
    // 1. 연동 (Connect)
    app.post("/api/integrations/google-calendar/connect", requireAuth, async (req, res) => {
        try {
            await calendarService.connectGoogleCalendar(req.auth.userId, req.body.code);
            return res.status(200).json({ resultType: "SUCCESS", success: { message: "연동 성공" } });
        } catch (e) {
            return res.status(500).json({
                resultType: "FAIL",
                error: { errorCode: "C001", reason: e.message },
            });
        }
    });

    // 2. 연동 상태 조회 (Status)
    app.get("/api/integrations/google-calendar/status", requireAuth, async (req, res) => {
        try {
            const status = await calendarService.getCalendarStatus(req.auth.userId);
            return res.status(200).json({ resultType: "SUCCESS", success: status });
        } catch (e) {
            return res.status(500).json({
                resultType: "FAIL",
                error: { errorCode: "C005", reason: "상태 조회 실패" },
            });
        }
    });

    // 3. 구글 캘린더 일정 선택 저장 동기화 (Sync)
    app.post("/api/integrations/google-calendar/sync", requireAuth, async (req, res) => {
        try {
            const userId = req.auth.userId;
            const { events } = req.body;

            const savedCount = await calendarService.syncGoogleEvents(userId, events);

            return res.status(200).json({
                resultType: "SUCCESS",
                success: { savedCount },
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                resultType: "FAIL",
                error: { errorCode: "C003", reason: "동기화 실패" },
            });
        }
    });

    // 4. 가져올 일정 목록 조회 (Events - 미리보기)
    app.get("/api/integrations/google-calendar/events", requireAuth, async (req, res) => {
        try {
            const rawEvents = await calendarService.getGoogleEventsList(req.auth.userId);
            const formattedEvents = calendarResponseDTO(rawEvents);

            return res.status(200).json({
                resultType: "SUCCESS",
                success: { events: formattedEvents },
            });
        } catch (e) {
            if (e.message === "NOT_CONNECTED") {
                return res.status(400).json({
                    resultType: "FAIL",
                    error: { errorCode: "C002", reason: "연동 필요" },
                });
            }
            return res.status(500).json({
                resultType: "FAIL",
                error: { errorCode: "C006", reason: "목록 조회 실패" },
            });
        }
    });

    // 5. 월간 조회 (날짜별 개수 + 제목/고정여부 프리뷰)
    app.get("/api/calendar/month", requireAuth, async (req, res) => {
        try {
            const { year, month } = req.query;
            if (!year || !month) {
                return res.status(400).json({
                    resultType: "FAIL",
                    error: { reason: "요청 파라미터가 올바르지 않습니다." },
                });
            }

            const rawData = await calendarService.getMonthlyEvents(req.auth.userId, year, month);
            const resultData = calendarMonthResponseDTO(rawData, year, month, 3);

            return res.status(200).json({ resultType: "SUCCESS", error: null, success: resultData });
        } catch (e) {
            return res.status(500).json({ resultType: "FAIL", error: { reason: e.message } });
        }
    });

    // 6. 일간 조회
    app.get("/api/calendar/day", requireAuth, async (req, res) => {
        try {
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({
                    resultType: "FAIL",
                    error: { reason: "요청 파라미터가 올바르지 않습니다.", data: null },
                    success: null,
                });
            }

            const rawData = await calendarService.getDailyEvents(req.auth.userId, date);
            const resultData = calendarDayDetailResponseDTO(rawData, date);

            return res.status(200).json({ resultType: "SUCCESS", error: null, success: resultData });
        } catch (e) {
            return res.status(500).json({ resultType: "FAIL", error: { reason: e.message, data: null } });
        }
    });

    // 7. 직접 일정 추가 (Manual Create)
    app.post("/api/calendar/event", requireAuth, async (req, res) => {
        try {
            const userId = req.auth.userId;
            const { title, startAt, endAt, type } = req.body;

            if (!title || !startAt || !endAt) {
                return res.status(400).json({
                    resultType: "FAIL",
                    error: { reason: "title, startAt, endAt는 필수입니다." },
                });
            }

            const created = await calendarService.createManualEvent(userId, {
                title,
                startAt,
                endAt,
                type, // "MANUAL" or "FIXED" (없으면 MANUAL)
            });

            return res.status(201).json({ resultType: "SUCCESS", error: null, success: created });
        } catch (e) {
            return res.status(500).json({ resultType: "FAIL", error: { reason: e.message } });
        }
    });

    // 8. 직접 일정 수정 (Manual Update)
    app.patch("/api/calendar/event/:id", requireAuth, async (req, res) => {
        try {
            const userId = req.auth.userId;
            const eventId = Number(req.params.id);

            if (!eventId || Number.isNaN(eventId)) {
                return res.status(400).json({
                    resultType: "FAIL",
                    error: { reason: "event id가 올바르지 않습니다." },
                });
            }

            const updated = await calendarService.updateManualEvent(userId, eventId, req.body);
            return res.status(200).json({ resultType: "SUCCESS", error: null, success: updated });
        } catch (e) {
            return res.status(500).json({ resultType: "FAIL", error: { reason: e.message } });
        }
    });

    // 9. 직접 일정 삭제 (Manual Delete)
    app.delete("/api/calendar/event/:id", requireAuth, async (req, res) => {
        try {
            const userId = req.auth.userId;
            const eventId = Number(req.params.id);

            if (!eventId || Number.isNaN(eventId)) {
                return res.status(400).json({
                    resultType: "FAIL",
                    error: { reason: "event id가 올바르지 않습니다." },
                });
            }

            await calendarService.deleteManualEvent(userId, eventId);
            return res.status(200).json({
                resultType: "SUCCESS",
                error: null,
                success: { message: "삭제되었습니다." },
            });
        } catch (e) {
            return res.status(500).json({ resultType: "FAIL", error: { reason: e.message } });
        }
    });
}
