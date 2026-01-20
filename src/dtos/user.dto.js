/**
 * Auth DTO
 */
export function parseIdTokenBody(body) {
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== "string") {
    const err = new Error("idToken is required");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "A400", reason: "idToken이 필요합니다.", data: null },
      success: null,
    };
    throw err;
  }
  return { idToken };
}

/**
 * Onboarding DTO
 */
export function validateOnboardingBody(body) {
  const goalPeriod = body?.goalPeriod;
  const calendar = body?.calendar;
  const profile = body?.profile;

  if (
    !goalPeriod?.title ||
    !goalPeriod?.dateRange?.startDate ||
    !goalPeriod?.dateRange?.endDate
  ) {
    const err = new Error("Invalid onboarding body");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "O001", reason: "온보딩 요청값이 올바르지 않습니다.", data: null },
      success: null,
    };
    throw err;
  }

  return { goalPeriod, calendar, profile };
<<<<<<< HEAD
}
=======
}
>>>>>>> 27297438c8f56cd6e6e681e8d02f60699632b3e2
