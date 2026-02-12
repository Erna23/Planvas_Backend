function isRes(x) {
  return x && typeof x.status === "function" && typeof x.json === "function";
}

/**
 * ok(res, success, status?)  => res로 응답
 * ok(success)               => object 반환
 */
export function ok(a, b, status = 200) {
  if (isRes(a)) {
    const res = a;
    const success = b;
    return res.status(status).json({
      resultType: "SUCCESS",
      error: null,
      success,
    });
  }

  const success = a;
  return { resultType: "SUCCESS", error: null, success };
}

/**
 * fail(res, errorCode, reason, status?, data?) => res로 응답
 * fail(reason, data?)                         => object 반환
 */
export function fail(a, b, c, status = 500, data = null) {
  if (isRes(a)) {
    const res = a;
    const errorCode = b;
    const reason = c;
    return res.status(status).json({
      resultType: "FAIL",
      error: { errorCode, reason, data },
      success: null,
    });
  }

  const reason = a;
  const objData = b ?? null;
  return {
    resultType: "FAIL",
    error: { errorCode: null, reason, data: objData },
    success: null,
  };
}

export function getAuthUserId(req, fallback = 1) {
  return req?.user?.id ?? req?.auth?.userId ?? req?.auth?.id ?? fallback;
}

