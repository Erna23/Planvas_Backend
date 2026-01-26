import {
  parseGoalIdParam,
  validateCreateGoalBody,
  validateUpdateGoalBody,
  validateUpdateGoalRatioBody,
} from "../dtos/goals.dto.js";

import { findUserById } from "../repositories/user.repository.js";
import {
  findCurrentGoalPeriodByUserId,
  findOngoingGoalPeriodByUserId,
  createGoalPeriod,
  findGoalPeriodById,
  updateGoalPeriod,
  updateGoalPeriodRatio,
} from "../repositories/goals.repository.js";

const formatDateOnly = (d) => d.toISOString().slice(0, 10);

/**
 * POST /api/goals
 */
export async function createGoalPeriodByUserId(userId, body) {
  // 1) 유저 확인
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "사용자 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 2) 바디 검증
  const dto = validateCreateGoalBody(body);

  // 3) 정책: 이미 진행 중 목표 있으면 생성 제한
  const ongoing = await findOngoingGoalPeriodByUserId(userId, new Date());
  if (ongoing) {
    const err = new Error("Ongoing goal exists");
    err.statusCode = 409;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "이미 진행 중인 목표가 존재합니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 4) presetType 결정
  // - schema에서 presetType @default("CUSTOM") 해뒀다면 아래는 그냥 CUSTOM로 고정해도 됨
  const presetType = dto.presetId != null ? "PRESET" : "CUSTOM";

  // 5) 생성
  const created = await createGoalPeriod({
    userId,
    presetId: dto.presetId,
    presetType,
    title: dto.title,
    startDate: dto.start,
    endDate: dto.end,
    targetGrowthRatio: dto.targetGrowthRatio,
    targetRestRatio: dto.targetRestRatio,
  });

  // 6) 응답
  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      goalId: created.id,
      title: created.title,
      startDate: dto.startDateRaw,
      endDate: dto.endDateRaw,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

/**
 * PATCH /api/goals/:goalId (기간/이름 수정)
 */
export async function updateGoalPeriodByUserId(userId, goalIdParam, body) {
  const goalId = parseGoalIdParam(goalIdParam);
  const dto = validateUpdateGoalBody(body);

  // 1) 목표 존재 확인
  const existing = await findGoalPeriodById(goalId);
  if (!existing) {
    const err = new Error("Goal not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "목표 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 2) 소유권 체크
  if (existing.userId !== userId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "해당 목표에 대한 권한이 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 3) 날짜 검증: 부분 수정이므로 기존값과 합쳐서 검증
  const nextStart = dto.hasStart ? dto.start : existing.startDate;
  const nextEnd = dto.hasEnd ? dto.end : existing.endDate;

  if (nextEnd.getTime() < nextStart.getTime()) {
    const err = new Error("endDate < startDate");
    err.statusCode = 400;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "종료일은 시작일보다 이전일 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 4) 업데이트 payload 구성
  const updateData = {};
  if (dto.title != null) updateData.title = dto.title;
  if (dto.hasStart) updateData.startDate = dto.start;
  if (dto.hasEnd) updateData.endDate = dto.end;

  const updated = await updateGoalPeriod(goalId, updateData);

  // 5) 응답
  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      goalId: updated.id,
      title: updated.title,
      startDate: dto.startDateRaw ?? formatDateOnly(updated.startDate),
      endDate: dto.endDateRaw ?? formatDateOnly(updated.endDate),
      growthRatio: updated.growth,
      restRatio: updated.rest,
    },
  };
}

/**
 * GET /api/goals/current (현재 목표 조회)
 */
export async function getCurrentGoalByUserId(userId) {
  const current = await findCurrentGoalPeriodByUserId(userId, new Date());

  if (!current) {
    return {
      resultType: "SUCCESS",
      error: null,
      success: { goalId: null },
    };
  }

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      goalId: current.id,
      title: current.title,
      startDate: formatDateOnly(current.startDate),
      endDate: formatDateOnly(current.endDate),
      growthRatio: current.growth,
      restRatio: current.rest,
    },
  };
}

/**
 * PATCH /api/goals/:goalId/ratio (성장/휴식 비율 변경)
 */
export async function updateGoalRatioByUserId(userId, goalIdParam, body) {
  const goalId = parseGoalIdParam(goalIdParam);
  const { growthRatio, restRatio } = validateUpdateGoalRatioBody(body);

  const existing = await findGoalPeriodById(goalId);
  if (!existing) {
    const err = new Error("Goal not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "목표 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  if (existing.userId !== userId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "해당 목표에 대한 권한이 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  const updated = await updateGoalPeriodRatio(goalId, growthRatio, restRatio);

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      goalId: updated.id,
      growthRatio: updated.growth,
      restRatio: updated.rest,
    },
  };
}

/**
 * GET /api/goals/ratio-presets
 * - 일단 고정 프리셋(서버 상수)로 제공
 * - 나중에 DB 테이블(GoalRatioPreset 등)로 옮겨도 API는 유지 가능
 */
export async function getGoalRatioPresets() {
  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      presets: [
        {
          presetId: 1,
          title: "파워 갓생러 🔥",
          description: "이번 시즌, 후회 없이 모든 걸 쏟아붓고 싶은 분",
          growthRatio: 90,
          restRatio: 10,
        },
        {
          presetId: 2,
          title: "밸런스 챌린저 🏃",
          description: "열심히 달리되 번아웃은 피하고 싶은 전략형",
          growthRatio: 70,
          restRatio: 30,
        },
        {
          presetId: 3,
          title: "황금 밸런스형 ⚖️",
          description: "성장과 휴식을 완벽하게 반반으로 가져가고 싶은 분",
          growthRatio: 50,
          restRatio: 50,
        },
        {
          presetId: 4,
          title: "에너지 충전형 🔋",
          description: "지친 상태에서 회복을 우선하며 천천히 가고 싶은 분",
          growthRatio: 30,
          restRatio: 70,
        },
        {
          presetId: 5,
          title: "슬로우 스타터 🐢",
          description: "무리하지 않고 아주 작은 목표부터 시작하고 싶은 분",
          growthRatio: 20,
          restRatio: 80,
        },
        {
          presetId: 6,
          title: "갭이어 탐험가 ✈️",
          description: "이번 시즌은 경험과 휴식이 최우선인 분",
          growthRatio: 10,
          restRatio: 90,
        },
      ],
    },
  };
}

