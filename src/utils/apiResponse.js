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