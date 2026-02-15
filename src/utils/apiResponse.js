// src/utils/apiResponse.js

function isExpressRes(obj) {
  return !!obj && typeof obj.status === "function" && typeof obj.json === "function";
}

/**
 * ok(data)  또는  ok(res, data, status)
 */
export function ok(a, b, c = 200) {
  // ok(res, data, status)
  if (isExpressRes(a)) {
    const res = a;
    const success = b;
    const status = c ?? 200;
    return res.status(status).json({
      resultType: "SUCCESS",
      error: null,
      success,
    });
  }

  // ok(data)
  const success = a;
  return {
    resultType: "SUCCESS",
    error: null,
    success,
  };
}

/**
 * fail(reason, data)  또는  fail(res, errorCode, reason, status, data)
 */
export function fail(a, b, c, d = 500, e = null) {
  // fail(res, errorCode, reason, status, data)
  if (isExpressRes(a)) {
    const res = a;
    const errorCode = b ?? "COMMON";
    const reason = c ?? "요청 처리 중 오류가 발생했습니다.";
    const status = d ?? 500;
    const data = e ?? null;

    return res.status(status).json({
      resultType: "FAIL",
      error: { errorCode, reason, data },
      success: null,
    });
  }

  // fail(reason, data) 구식
  const reason = a ?? "요청 처리 중 오류가 발생했습니다.";
  const data = b ?? null;

  return {
    resultType: "FAIL",
    error: { errorCode: "COMMON", reason, data },
    success: null,
  };
}

/**
 * 인증된 유저 ID 추출
 */
export function getAuthUserId(req) {
  return req?.auth?.userId ?? req?.user?.id ?? req?.auth?.id ?? null;
}
export function failPayload(errorCode = "COMMON", reason = "요청 처리 중 오류가 발생했습니다.", data = null) {
  return {
    resultType: "FAIL",
    error: { errorCode, reason, data },
    success: null,
  };
}
