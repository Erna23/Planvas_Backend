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
    completeMyActivity,
} from "../services/schedule.service.js";

function getAuthUserId(req) {
  //  프로젝트 표준: req.userId
  //  혹시 다른 팀 코드가 req.auth.userId / req.user.id 쓰면 호환
    const raw = req.userId ?? req.auth?.userId ?? req.user?.id;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
}

export function registerScheduleRoutes(app) {
  // 고정 일정 CRUD
    app.post("/api/fixed-schedules", requireAuth, async (req, res) => {
        try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const result = await addFixedSchedule(userId, req.body);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[POST /api/fixed-schedules]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});

app.get("/api/fixed-schedules", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());
        
        const result = await getFixedSchedule(userId);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[GET /api/fixed-schedules]", e); // ✅ 로그도 남기고
        return res.status(e.statusCode ?? 500).json(
            e.payload ?? {
                resultType: "FAIL",
                error: {
                    reason: "목표 처리 중 서버 오류가 발생했습니다.",
                    data: { message: e?.message, name: e?.name }, // ✅ 이것만 추가
                },
            success: null,
        }
    );
}
});


app.patch("/api/fixed-schedules/:id", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const id = Number(req.params.id); // ✅ parans 오타 수정
        const result = await updateFixedSchedule(userId, id, req.body);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[PATCH /api/fixed-schedules/:id]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});

app.delete("/api/fixed-schedules/:id", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const id = Number(req.params.id);
        const result = await deleteFixedSchedule(userId, id); // ✅ deleteMyActivity 버그 수정
        return res.status(200).json(result);
    } catch (e) {
        console.error("[DELETE /api/fixed-schedules/:id]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }   
});

app.patch("/api/todos/:todoId", requireAuth, async (req, res) => {
    try {
        const todoId = Number(req.params.todoId);
        const result = await completeTodos(todoId);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[PATCH /api/todos/:todoId]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});


  // 할 일 조회
app.get("/api/todos", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const date = req.query.date ? req.query.date.toString() : undefined;
        const result = await getTodos(userId, date);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[GET /api/todos]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});


  // 내 활동 CRUD
app.post("/api/my-activities", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const result = await createMyActivity(userId, req.body);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[POST /api/my-activities]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});

app.get("/api/my-activities/:id", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const result = await getMyActivityInfo(userId, req.params.id);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[GET /api/my-activities/:id]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});

app.patch("/api/my-activities/:id", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const result = await updateMyActivity(userId, req.params.id, req.body);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[PATCH /api/my-activities/:id]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});

app.delete("/api/my-activities/:id", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const result = await deleteMyActivity(userId, req.params.id);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[DELETE /api/my-activities/:id]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});

app.patch("/api/my-activities/:id/complete", requireAuth, async (req, res) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json(authFail());

        const result = await completeMyActivity(userId, req.params.id);
        return res.status(200).json(result);
    } catch (e) {
        console.error("[PATCH /api/my-activities/:id/complete]", e);
        return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
    }
});
}

function authFail() {
    return {
        resultType: "FAIL",
        error: { reason: "인증 실패", data: null },
        success: null,
    };
}

function defaultSchedulesFail(e) {
    return {
        resultType: "FAIL",
        error: { reason: "목표 처리 중 서버 오류가 발생했습니다.", data: { message: e?.message, name: e?.name } },
        success: null,
    };
}

