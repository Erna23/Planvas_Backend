export function ok(success) {
    return { resultType: "SUCCESS", error: null, success };
}

export function fail(reason, data = null) {
    return { resultType: "FAIL", error: { reason, data }, success: null };
}
