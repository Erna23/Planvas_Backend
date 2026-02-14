import { ok, fail } from "../utils/apiResponse.js";
import { authStub } from "../middlewares/authStub.js";
// (import 쪽)
import { listActivities, recommendations, getDetail, listActivityCategories } from "../services/activity.service.js";
import { addMyActivity } from "../services/myActivity.service.js";

export function registerActivityRoutes(app) {
  // 활동 탐색 목록
  app.get("/api/activities", authStub, async (req, res) => {
    try {
      const tab = req.query.tab;
      const q = (req.query.q || "").toString().trim();
      const page = req.query.page !== undefined ? Number(req.query.page) : 0;
      const size = req.query.size !== undefined ? Number(req.query.size) : 20;
      const onlyAvailable = (req.query.onlyAvailable || "false").toString() === "true";

      const categoryId =
        req.query.categoryId !== undefined ? Number(req.query.categoryId) : undefined;

      if (!(tab === "GROWTH" || tab === "REST")) {
        return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));
      }

      const data = await listActivities({
        tab,
        categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
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
  app.get("/api/activities/recommendations", authStub, async (req, res) => {
    try {
      const tab = req.query.tab;
      const date = req.query.date ? req.query.date.toString() : undefined;

      if (tab !== undefined && !(tab === "GROWTH" || tab === "REST")) {
        return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));
      }

      const data = await recommendations({ tab, date });
      return res.json(ok(data));
    } catch (e) {
      return res.status(500).json(fail("추천 목록을 불러올 수 없습니다.", null));
    }
  });
  app.get("/api/activities/categories", authStub, async (req, res) => {
    try {
      const tab = req.query.tab;

      if (!(tab === "GROWTH" || tab === "REST")) {
        return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));
      }

      const data = await listActivityCategories({ tab });
      return res.json(ok(data));
    } catch (e) {
      return res.status(500).json(fail("카테고리 목록을 불러올 수 없습니다.", null));
    }
  });


  // 활동 상세
  app.get("/api/activities/:activityId", authStub, async (req, res) => {
    try {
      const activityId = Number(req.params.activityId);
      const data = await getDetail(activityId);
      if (!data) return res.status(404).json(fail("해당 활동을 찾을 수 없습니다.", null));
      return res.json(ok(data));
    } catch (e) {
      return res.status(500).json(fail("해당 활동을 찾을 수 없습니다.", null));
    }
  });

  // 내 일정(내 활동) 추가
  app.post("/api/activities/:activityId/my-activities", authStub, async (req, res) => {
    try {
      const activityId = Number(req.params.activityId);
      const result = await addMyActivity(req.userId, activityId, req.body);

      if (result?.notFound) return res.status(404).json(fail("해당 활동을 찾을 수 없습니다.", null));
      if (result?.bad) return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));

      return res.json(ok(result));
    } catch (e) {
      return res.status(500).json(fail("일정 추가에 실패했습니다.", null));
    }
  });
}
