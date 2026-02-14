import { requireAuth } from "../auth.config.js";
import {
    addFixedSchedule,
    getFixedSchedule,
    updateFixedSchedule,
    deleteFixedSchedule,
    getTodos,
    completeTodos,
    createMyActivity,
    getMyActivityInfo,
    updateMyActivity,
    deleteMyActivity,
    completeMyActivity
} from "../services/schedule.service.js";

export function registerScheduleRoutes(app) {
    // 고정 일정 CRUD
    app.post("/api/fixed-schedules", async (req, res) => {
        try {
            const userId = Number(req.query.userId);
            const result = await addFixedSchedule(userId, req.body);
            return res.status(200).json(result);
        } catch (e) {
            console.error("[POST /api/fixed-schedules]", e);
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    });

    app.get("/api/fixed-schedules", requireAuth, async (req, res) => {
        try {
            const result = await getFixedSchedule(req.auth.userId);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    });

    app.patch("/api/fixed-schedules/:id", requireAuth, async (req, res) => {
        try {
            const result = await updateFixedSchedule(req.auth.userId, req.parans.id, req.body);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    });

    app.delete("/api/fixed-schedules/:id", requireAuth, async (req, res) => {
        try {
            const result = await deleteMyActivity(req.auth.userId, req.params.id)
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    });


    // 할 일 추가, 완료
    app.get("/api/todos", requireAuth, async(req, res) => {
        try {
            const { date } = req.query;

            const result = await getTodos(req.auth.userId, date);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    })

    app.patch("/api/todos/:todoId", requireAuth, async (req, res) => {
        try {
            const result = await completeTodos(req.params.todoId);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    })

    // 내 활동 CRUD
    app.post("/api/my-activities", requireAuth, async(req, res) => {
        try {
            const result = await createMyActivity(req.auth.userId, req.body);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    })

    app.get("/api/my-activities/:id", requireAuth, async(req, res) => {
        try {
            const result = await getMyActivityInfo(req.auth.userId, req.params.id);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    })

    app.patch("/api/my-activities/:id", requireAuth, async(req, res) => {
        try {
            const result = await updateMyActivity(req.auth.userId, req.params.id, req.body);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    })

    app.delete("/api/my-activities/:id", requireAuth, async(req, res) => {
        try {
            const result = await deleteMyActivity(req.auth.userId, req.params.id);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    })

    app.patch("/api/my-activities/:id/complete", requireAuth, async (req, res) => {
        try {
            const result = await completeMyActivity(req.auth.userId, req.params.id);
            return res.status(200).json(result);
        } catch (e) {
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    })
}

function defaultSchedulesFail() {
    return {
        resultType: "FAIL",
        error: { reason: "목표 처리 중 서버 오류가 발생했습니다.", data: null },
        success: null,
    };
}