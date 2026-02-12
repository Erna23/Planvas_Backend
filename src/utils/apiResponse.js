/**
 * 성공 응답 형식
 * @param {object} res - Express response object
 * @param {object} success - 응답 데이터
 * @param {number} status - HTTP 상태 코드 (기본값 200)
 */
export function ok(res, success, status = 200) {
    return res.status(status).json({
        resultType: "SUCCESS",
        error: null,
        success,
    });
}

/**
 * 실패 응답 형식
 * @param {object} res - Express response object
 * @param {string} errorCode - 에러 코드 (예: 'H001')
 * @param {string} reason - 에러 사유
 * @param {number} status - HTTP 상태 코드 (기본값 500)
 * @param {object} data - 추가 에러 데이터 (선택 사항)
 */
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

/**
 * 인증된 유저 ID 추출 함수
 * @param {object} req - Express request object
 * @param {number} fallback - 인증 정보가 없을 때 사용할 기본값
 */
export function getAuthUserId(req) {
    return req?.auth?.userId ?? req?.user?.id ?? req?.auth?.id ?? null;
}