import { prisma } from "../db.config.js";
import { requireAuth } from "../auth.config.js";

function success(res, payload) {
  return res.status(200).json({
    resultType: "SUCCESS",
    error: null,
    success: payload,
  });
}

function fail(res, reason, status = 400) {
  return res.status(status).json({
    resultType: "FAIL",
    error: { reason, data: null },
    success: null,
  });
}

export function registerPushTokenRoutes(app) {
  // ✅ 토큰 등록
  app.post("/api/push-tokens", requireAuth, async (req, res) => {
    const { platform, token, environment } = req.body ?? {};

    if (!platform || !token || !environment) {
      return fail(res, "요청 값이 올바르지 않습니다.");
    }
    if (platform !== "IOS") {
      return fail(res, "platform 값이 올바르지 않습니다.");
    }
    if (!["SANDBOX", "PRODUCTION"].includes(environment)) {
      return fail(res, "environment 값이 올바르지 않습니다.");
    }

    try {
      // token이 unique라서 token 기준 upsert
      await prisma.pushToken.upsert({
        where: { token },
        update: {
          userId: req.auth.userId,
          platform,
          environment,
        },
        create: {
          userId: req.auth.userId,
          platform,
          token,
          environment,
        },
      });

      return success(res, { registered: true });
    } catch (e) {
      console.error(e?.stack ?? e);
      return fail(res, "푸시 토큰 등록에 실패했습니다.", 500);
    }
  });

  // ✅ 토큰 삭제
  app.delete("/api/push-tokens", requireAuth, async (req, res) => {
    const { platform, token } = req.body ?? {};

    if (!platform || !token) {
      return fail(res, "요청 값이 올바르지 않습니다.");
    }
    if (platform !== "IOS") {
      return fail(res, "platform 값이 올바르지 않습니다.");
    }

    try {
      const found = await prisma.pushToken.findUnique({ where: { token } });
      if (!found) {
        return fail(res, "삭제할 토큰을 찾을 수 없습니다.", 404);
      }

      // 본인 토큰만 삭제 허용 (안전)
      if (found.userId !== req.auth.userId) {
        return fail(res, "삭제할 토큰을 찾을 수 없습니다.", 404);
      }

      await prisma.pushToken.delete({ where: { token } });
      return success(res, { deleted: true });
    } catch (e) {
      console.error(e?.stack ?? e);
      return fail(res, "삭제할 토큰을 찾을 수 없습니다.", 500);
    }
  });
}
