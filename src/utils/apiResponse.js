export function ok(success) {
  return { resultType: "SUCCESS", error: null, success };
}

export function fail(reason, data = null) {
  return { resultType: "FAIL", error: { reason, data }, success: null };
}

export function getAuthUserId(req, fallback = 1) {
  return req?.auth?.userId ?? req?.auth?.id ?? fallback;
}
