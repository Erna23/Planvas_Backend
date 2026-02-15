import { ok, fail } from "../utils/apiResponse.js";
import { requireAuth } from "../auth.config.js";
import {
  listActivities,
  recommendations,
  getDetail,
  listActivityCategories,
} from "../services/activity.service.js";
import { addMyActivity } from "../services/myActivity.service.js";

export function registerActivityRoutes(app) {
  // 활동 탐색 목록
  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const tab = req.query.tab;
      const q = (req.query.q || "").toString().trim();
      const page = req.query.page !== undefined ? Number(req.query.page) : 0;
      const size = req.query.size !== undefined ? Number(req.query.size) : 20;
      const onlyAvailable = (req.query.onlyAvailable || "false").toString() === "true";

      const categoryIdRaw =
        req.query.categoryId !== undefined ? Number(req.query.categoryId) : undefined;

      const categoryId =
        Number.isFinite(categoryIdRaw) && categoryIdRaw !== 0 ? categoryIdRaw : undefined;


      if (!(tab === "GROWTH" || tab === "REST")) {
        return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));
      }

      const data = await listActivities({
        userId: req.userId,
        tab,
        categoryId,
        q: q || undefined,
        page: Number.isFinite(page) ? page : 0,
        size: Number.isFinite(size) ? size : 20,
        onlyAvailable,
      });

      return res.json(ok(data));
    } catch (e) {
      return res.status(500).json(fail("활동 목록을 불러올 수 없습니다.", null));
    }
  });

  // 추천 활동
  app.get("/api/activities/recommendations", requireAuth, async (req, res) => {
    try {
      const tab = (req.query.tab ?? "GROWTH").toString(); // ✅ default
      const date = req.query.date ? req.query.date.toString() : undefined;

      if (!(tab === "GROWTH" || tab === "REST")) {
        return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));
      }

      const data = await recommendations({ userId: req.userId, tab, date }); // ✅ 그대로
      return res.json(ok(data));
    } catch (e) {
      console.error("[recommendations error]", e); // ✅ 원인 확인용
      return res.status(500).json(fail("추천 목록을 불러올 수 없습니다.", null));
    }
  });

  app.get("/api/activities/categories", requireAuth, async (req, res) => {
    try {
      const tab = req.query.tab;

      if (!(tab === "GROWTH" || tab === "REST")) {
        return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));
      }

      const data = await listActivityCategories({ userId: req.userId, tab }); 
      return res.json(ok(data));
    } catch (e) {
      console.error("[categories]", e); 

      return res.status(500).json(fail("카테고리 목록을 불러올 수 없습니다.", null));
    }
  });

  // 활동 상세
  app.get("/api/activities/:activityId", requireAuth, async (req, res) => {
    try {
      const activityId = Number(req.params.activityId);
      const userId = req.userId; 

      const data = await getDetail(userId, activityId);
      if (!data) return res.status(404).json(fail("해당 활동을 찾을 수 없습니다.", null));
      return res.json(ok(data));
    } catch (e) {
      return res.status(500).json(fail("해당 활동을 찾을 수 없습니다.", null));
    }
  });


  // 내 일정(내 활동) 추가
  app.post("/api/activities/:activityId/my-activities", requireAuth, async (req, res) => {
    try {
      const activityId = Number(req.params.activityId);
      const result = await addMyActivity(req.userId, activityId, req.body);

      if (result?.notFound) return res.status(404).json(fail("해당 활동을 찾을 수 없습니다.", null));
      if (result?.bad) return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));

      return res.json(ok(result));
    } catch (e) {
      return res
      .status(e?.statusCode ?? 500)
      .json(e?.payload ?? fail("일정 추가에 실패했습니다.", null));
    }
  });
}
