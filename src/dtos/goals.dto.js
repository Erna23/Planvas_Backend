function isISODateOnlyString(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function toDateOrThrow(dateStr, fieldName) {
  if (!isISODateOnlyString(dateStr)) {
    const err = new Error(`${fieldName} must be YYYY-MM-DD`);
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: `${fieldName} 형식이 올바르지 않습니다. (YYYY-MM-DD)`, data: null },
      success: null,
    };
    throw err;
  }

  // 날짜만 들어온 걸 UTC 00:00으로 고정
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    const err = new Error(`${fieldName} invalid date`);
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: `${fieldName} 날짜가 올바르지 않습니다.`, data: null },
      success: null,
    };
    throw err;
  }
  return d;
}

export function parseGoalIdParam(goalIdParam) {
  const id = Number(goalIdParam);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error("Invalid goalId");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "goalId가 올바르지 않습니다.", data: null },
      success: null,
    };
    throw err;
  }
  return id;
}

/**
 * POST /api/goals 바디 검증
 */
export function validateCreateGoalBody(body) {
  const presetId = body?.presetId;
  const title = body?.title;
  const startDateRaw = body?.startDate;
  const endDateRaw = body?.endDate;
  const targetGrowthRatio = body?.targetGrowthRatio;
  const targetRestRatio = body?.targetRestRatio;

  if (!title || typeof title !== "string") {
    const err = new Error("title is required");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "title이 필요합니다.", data: null },
      success: null,
    };
    throw err;
  }

  const start = toDateOrThrow(startDateRaw, "startDate");
  const end = toDateOrThrow(endDateRaw, "endDate");

  if (start.getTime() > end.getTime()) {
    const err = new Error("startDate > endDate");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "시작일은 종료일보다 이후일 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  // ratio는 들어오면 검증, 없으면 기본값 50/50
  if (targetGrowthRatio != null && typeof targetGrowthRatio !== "number") {
    const err = new Error("targetGrowthRatio must be number");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "targetGrowthRatio는 숫자여야 합니다.", data: null },
      success: null,
    };
    throw err;
  }
  if (targetRestRatio != null && typeof targetRestRatio !== "number") {
    const err = new Error("targetRestRatio must be number");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "targetRestRatio는 숫자여야 합니다.", data: null },
      success: null,
    };
    throw err;
  }
  if (
    typeof targetGrowthRatio === "number" &&
    typeof targetRestRatio === "number" &&
    targetGrowthRatio + targetRestRatio !== 100
  ) {
    const err = new Error("ratio sum must be 100");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "targetGrowthRatio + targetRestRatio 합은 100이어야 합니다.", data: null },
      success: null,
    };
    throw err;
  }

  return {
    presetId: typeof presetId === "number" ? presetId : null,
    title,
    start,
    end,
    targetGrowthRatio: typeof targetGrowthRatio === "number" ? targetGrowthRatio : 50,
    targetRestRatio: typeof targetRestRatio === "number" ? targetRestRatio : 50,
    startDateRaw,
    endDateRaw,
  };
}

/**
 * PATCH /api/goals/:goalId 바디 검증 (부분 수정)
 */
export function validateUpdateGoalBody(body) {
  const title = body?.title;
  const startDateRaw = body?.startDate;
  const endDateRaw = body?.endDate;

  if (title != null && typeof title !== "string") {
    const err = new Error("title must be string");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "title은 문자열이어야 합니다.", data: null },
      success: null,
    };
    throw err;
  }

  const hasStart = startDateRaw != null;
  const hasEnd = endDateRaw != null;

  const start = hasStart ? toDateOrThrow(startDateRaw, "startDate") : null;
  const end = hasEnd ? toDateOrThrow(endDateRaw, "endDate") : null;

  if (title == null && !hasStart && !hasEnd) {
    const err = new Error("No fields to update");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "변경할 값이 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  return {
    title: title ?? null,
    startDateRaw: hasStart ? startDateRaw : null,
    endDateRaw: hasEnd ? endDateRaw : null,
    start,
    end,
    hasStart,
    hasEnd,
  };
}

/**
 * PATCH /api/goals/:goalId/ratio 바디 검증
 */
export function validateUpdateGoalRatioBody(body) {
  const growthRatio = body?.growthRatio;
  const restRatio = body?.restRatio;

  if (typeof growthRatio !== "number" || typeof restRatio !== "number") {
    const err = new Error("ratio must be number");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "growthRatio와 restRatio는 숫자여야 합니다.", data: null },
      success: null,
    };
    throw err;
  }

  if (growthRatio < 0 || restRatio < 0) {
    const err = new Error("ratio must be non-negative");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "비율은 0 이상이어야 합니다.", data: null },
      success: null,
    };
    throw err;
  }

  if (growthRatio + restRatio !== 100) {
    const err = new Error("ratio sum must be 100");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "비율 합계는 100이어야 합니다.", data: null },
      success: null,
    };
    throw err;
  }

  return { growthRatio, restRatio };
}
