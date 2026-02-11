<<<<<<< HEAD
export function ok(res, success, status = 200) {
    return res.status(status).json({
        resultType: "SUCCESS",
        error: null,
        success,
    });
}

export function fail(res, errorCode, reason, status = 500, data = null) {
    return res.status(status).json({
        resultType: "FAIL",
        error: {
            errorCode,
            reason,
            data,
        },
        success: null,
    });
}
=======
export function ok(success) {
  return { resultType: "SUCCESS", error: null, success };
}

export function fail(reason, data = null) {
  return { resultType: "FAIL", error: { reason, data }, success: null };
}

export function getAuthUserId(req, fallback = 1) {
  return req?.auth?.userId ?? req?.auth?.id ?? fallback;
}
>>>>>>> feat/home
