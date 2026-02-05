import { ok, fail } from "../utils/apiResponse.js";
import { authStub } from "../middlewares/authStub.js";
import { getCart, addCart, removeCart } from "../services/cart.service.js";

export function registerCartRoutes(app) {
  // 장바구니 목록
  app.get("/api/cart/activities", authStub, async (req, res) => {
    try {
      const tab = req.query.tab;
      if (!(tab === "GROWTH" || tab === "REST")) {
        return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));
      }

      const data = await getCart(req.userId, tab);
      return res.json(ok(data));
    } catch (e) {
      return res.status(500).json(fail("장바구니를 불러올 수 없습니다.", null));
    }
  });

  // 장바구니 담기
  app.post("/api/cart/activities", authStub, async (req, res) => {
    try {
      const activityId = Number(req.body?.activityId);
      if (!Number.isFinite(activityId)) {
        return res.status(400).json(fail("요청 값이 올바르지 않습니다.", null));
      }

      const result = await addCart(req.userId, activityId);

      if (result?.notFound) return res.status(404).json(fail("해당 활동을 찾을 수 없습니다.", null));
      if (result?.already) return res.status(409).json(fail("이미 장바구니에 담긴 활동입니다.", null));

      return res.json(
        ok({
          cartItemId: result.created.id,
          activityId,
          message: "장바구니에 추가되었습니다.",
        })
      );
    } catch (e) {
      return res.status(500).json(fail("장바구니 추가에 실패했습니다.", null));
    }
  });

  // 장바구니 삭제
  app.delete("/api/cart/activities/:cartItemId", authStub, async (req, res) => {
    try {
      const cartItemId = Number(req.params.cartItemId);
      const deleted = await removeCart(req.userId, cartItemId);
      if (!deleted) return res.status(404).json(fail("삭제할 활동을 찾을 수 없습니다.", null));
      return res.json(ok({ deleted: true }));
    } catch (e) {
      return res.status(500).json(fail("삭제할 활동을 찾을 수 없습니다.", null));
    }
  });
}
