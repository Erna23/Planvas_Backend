import {
  googleOAuth2,
  signupWithGoogle,
  getMeByUserId,
  saveOnboardingByUserId,
  getMyInterestsByUserId,
} from "../services/user.service.js";

import { requireAuth } from "../auth.config.js";

export function registerUserRoutes(app) {
  // POST /api/users/oauth2/google
  app.post("/api/users/oauth2/google", async (req, res) => {
    try {
      const result = await googleOAuth2(req.body);
      return res.status(200).json(result);
    } catch (e) {
      console.error("[POST /api/users/oauth2/google] error:", e);
      return res.status(e.statusCode ?? 401).json(e.payload ?? defaultAuthFail());
    }
  });


  // POST /api/users (signup)
app.post("/api/users", async (req, res) => {
  console.log("[POST /api/users] raw body:", req.body);
  console.log(
    "[POST /api/users] idToken dot count:",
    (String(req.body?.idToken).match(/\./g) || []).length
  );
  console.log(
    "[POST /api/users] idToken starts:",
    String(req.body?.idToken).slice(0, 30)
  );

  try {
    const result = await signupWithGoogle(req.body);
    return res.status(201).json(result);
  } catch (e) {
    console.error("[POST /api/users] error object:", e);
    console.error("[POST /api/users] error payload:", e?.payload);

    return res.status(e.statusCode ?? 401).json(
      e.payload ?? defaultAuthFail()
    );
  }
});


  // GET /api/users/me
  app.get("/api/users/me", requireAuth, async (req, res) => {
    try {
      const result = await getMeByUserId(req.auth.userId);
      return res.status(200).json(result);
    } catch (e) {
      return res.status(e.statusCode ?? 500).json(e.payload ?? defaultAuthFail());
    }
  });

    // GET /api/users/me/interests
  app.get("/api/users/me/interests", requireAuth, async (req, res) => {
    try {
      const result = await getMyInterestsByUserId(req.auth.userId);
      return res.status(200).json(result);
    } catch (e) {
      console.error("[GET /api/users/me/interests] error:", e);
      return res.status(e.statusCode ?? 500).json(e.payload ?? defaultInterestsFail());
    }
  });

  // POST /api/users/me/onboarding
app.post("/api/users/me/onboarding", requireAuth, async (req, res) => {
  console.log("[ONBOARDING] req.auth =", req.auth);
  console.log("[ONBOARDING] userId =", req.auth?.userId);
  console.log("[ONBOARDING] typeof userId =", typeof req.auth?.userId);

  console.log("[ONBOARDING] body =", req.body);

  try {
    const result = await saveOnboardingByUserId(req.auth.userId, req.body);
    return res.status(200).json(result);
  } catch (e) {
    console.error("[ONBOARDING] error =", e);
    console.error("[ONBOARDING] error payload =", e?.payload);

    return res
      .status(e.statusCode ?? 500)
      .json(e.payload ?? defaultOnboardingFail());
  }
});

}

function defaultAuthFail() {
  return {
    resultType: "FAIL",
    error: { errorCode: "A001", reason: "유효하지 않은 Google ID Token입니다.", data: null },
    success: null,
  };
}

function defaultInterestsFail() {
  return {
    resultType: "FAIL",
    error: { errorCode: "I500", reason: "관심사 조회 중 서버 오류가 발생했습니다.", data: null },
    success: null,
  };
}

function defaultOnboardingFail() {
  return {
    resultType: "FAIL",
    error: { errorCode: "O500", reason: "온보딩 저장 중 서버 오류가 발생했습니다.", data: null },
    success: null,
  };
}