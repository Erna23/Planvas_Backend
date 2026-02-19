import { requireAuth } from "../auth.config.js";
import { ok, fail } from "../utils/apiResponse.js";
import {
    addTodos,
    getTodos,
    completeTodos,
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

    // 할 일 생성
    app.post("/api/todos", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return res.status(401).json(authFail());
            
            const date = req.query.date ? req.query.date.toString() : new Date().toString();
            const result = await addTodos(userId, req.body, date);
            return ok(res, result, 200);
        } catch (e) {
            console.error("[GET /api/todos]", e);
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    }); 

    // 할 일 조회
    app.get("/api/todos", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return res.status(401).json(authFail());
            
            const date = req.query.date ? req.query.date.toString() : new Date().toString();
            const result = await getTodos(userId, date);
            return ok(res, result, 200);
        } catch (e) {
            console.error("[GET /api/todos]", e);
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    });

    // 할 일 완료
    app.patch("/api/todos/:todoId", requireAuth, async (req, res) => {
        try {
            const todoId = Number(req.params.todoId);
            const result = await completeTodos(todoId);
            return ok(res, result, 200);
        } catch (e) {
            console.error("[PATCH /api/todos/:todoId]", e);
            return res.status(e.statusCode ?? 500).json(e.payload ?? defaultSchedulesFail());
        }
    });

    // 내 활동 완료 처리
    app.patch("/api/my-activities/:id/complete", requireAuth, async (req, res) => {
        try {
            const userId = getAuthUserId(req);
            if (!userId) return res.status(401).json(authFail());

            const result = await completeMyActivity(userId, req.params.id);
            return ok(res, result, 200);
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

