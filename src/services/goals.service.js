import {
  parseGoalIdParam,
  validateCreateGoalBody,
  validateUpdateGoalBody,
  validateUpdateGoalRatioBody,
} from "../dtos/goals.dto.js";

import { findUserById, updateOnboardingStatus } from "../repositories/user.repository.js";
import {
  findCurrentGoalPeriodByUserId,
  findOngoingGoalPeriodByUserId,
  createGoalPeriod,
  findGoalPeriodById,
  updateGoalPeriod,
  updateGoalPeriodRatio,
  findActivitiesForGoalProgress,
  deleteGoalPeriod,
  findOverlappingGoalPeriodByUserId,
} from "../repositories/goals.repository.js";
import { getGrowthAndRest } from "../repositories/schedule.repository.js";
import { getGrowthAndRestPointFromActivities } from "../repositories/activity.repository.js";

const formatDateOnly = (d) => d.toISOString().slice(0, 10);

/**
 * 목표 종료일(00:00Z)을 다음날 00:00Z로 변환하여 쿼리 범위에 포함시킴
 */
function endDateToExclusive(endDate) {
  const endExclusive = new Date(endDate);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return endExclusive;
}

/**
 * 완료된 활동들의 카테고리를 분류하여 현재 달성 수치 계산
 */
function calcCurrentRatios(activities) {
  let growthCount = 0;
  let restCount = 0;

  for (const a of activities) {
    if (!a.completed) continue; 

    const category = a.Activity?.tab || a.activity?.tab;
    
    if (category === "GROWTH") growthCount += 1;
    if (category === "REST") restCount += 1;
  }

  return { 
    currentGrowthRatio: growthCount, 
    currentRestRatio: restCount 
  };
}

/**
 * POST /api/goals (목표 생성)
 */
export async function createGoalPeriodByUserId(userIdRaw, body) {
  const userId = Number(userIdRaw);
  
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

  const dto = validateCreateGoalBody(body);
  const overlap = await findOverlappingGoalPeriodByUserId(userId, dto.start, dto.end);

  if (overlap) {
    const err = new Error("Overlapping goal exists");
    err.statusCode = 409;
    err.payload = {
      resultType: "FAIL",
      error: {
        reason: "이미 해당 기간과 겹치는 목표가 존재합니다.",
        data: {
          overlappingGoalId: overlap.id,
          overlappingStartDate: overlap.startDate.toISOString().slice(0, 10),
          overlappingEndDate: overlap.endDate.toISOString().slice(0, 10),
        },
      },
      success: null,
    };
    throw err;
  }

  const presetType = dto.presetId != null ? "PRESET" : "CUSTOM";

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
 * PATCH /api/goals/:goalId (기간 및 이름 수정)
 */
export async function updateGoalPeriodByUserId(userIdRaw, goalIdParam, body) {
  const userId = Number(userIdRaw);
  const goalId = parseGoalIdParam(goalIdParam);
  const dto = validateUpdateGoalBody(body);

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

  if (Number(existing.userId) !== userId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "해당 목표에 대한 권한이 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

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

  // 3-1) 정책: 수정 후 기간이 다른 목표와 겹치면 제한 (자기 자신은 제외)
const overlap = await findOverlappingGoalPeriodByUserId(userId, nextStart, nextEnd, existing.id);

if (overlap) {
  const err = new Error("Overlapping goal exists");
  err.statusCode = 409;
  err.payload = {
    resultType: "FAIL",
    error: {
      reason: "이미 해당 기간과 겹치는 목표가 존재합니다.",
      data: {
        overlappingGoalId: overlap.id,
        overlappingStartDate: overlap.startDate.toISOString().slice(0, 10),
        overlappingEndDate: overlap.endDate.toISOString().slice(0, 10),
      },
    },
    success: null,
  };
  throw err;
}

  const updateData = {};
  if (dto.title != null) updateData.title = dto.title;
  if (dto.hasStart) updateData.startDate = dto.start;
  if (dto.hasEnd) updateData.endDate = dto.end;

  const updated = await updateGoalPeriod(goalId, updateData);

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

  let currentGrowthRatio = 0
  let currentRestRatio = 0
  let { growth, rest, activityIds } = await getGrowthAndRest(user, current.startDate, current.endDate);
  const activities = await getGrowthAndRestPointFromActivities(activityIds);

  currentGrowthRatio = growth + activities.growth;
  currentRestRatio = rest + activities.rest;

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
      currentGrowthRatio,
      currentRestRatio,
      presetType: current.presetType,
      presetId: current.presetId ?? null,
    },
  };
}

/**
 * PATCH /api/goals/:goalId/ratio (목표 비율 수정)
 */
export async function updateGoalRatioByUserId(userIdRaw, goalIdParam, body) {
  const userId = Number(userIdRaw);
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

  if (Number(existing.userId) !== userId) {
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
 * GET /api/goals/:goalId (목표 상세 조회)
 */
export async function getGoalDetailByUserId(userIdRaw, goalIdParam) {
  const userId = Number(userIdRaw);
  const goalId = parseGoalIdParam(goalIdParam);
  const goal = await findGoalPeriodById(goalId);

  if (!goal) {
    const err = new Error("Goal not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "목표 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  if (Number(goal.userId) !== userId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "해당 목표에 대한 권한이 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      goalId: goal.id,
      title: goal.title,
      startDate: formatDateOnly(goal.startDate),
      endDate: formatDateOnly(goal.endDate),
      growthRatio: goal.growth,
      restRatio: goal.rest,
      presetType: goal.presetType,
      presetId: goal.presetId ?? null,
    },
  };
}

/**
 * GET /api/goals/:goalId/progress (진행률 조회)
 */
export async function getGoalProgressByUserId(userIdRaw, goalIdParam) {
  const userId = Number(userIdRaw);
  const goalId = parseGoalIdParam(goalIdParam);
  const goal = await findGoalPeriodById(goalId);

  if (!goal) {
    const err = new Error("Goal not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "목표 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  if (Number(goal.userId) !== userId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "해당 목표에 대한 권한이 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  let currentGrowthRatio = 0
  let currentRestRatio = 0
  let { growth, rest, activityIds } = await getGrowthAndRest(user, current.startDate, current.endDate);
  const activities = await getGrowthAndRestPointFromActivities(activityIds);

  currentGrowthRatio = growth + activities.growth;
  currentRestRatio = rest + activities.rest;

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      goalId: goal.id,
      currentGrowthRatio,
      currentRestRatio,
    },
  };
}

/**
 * GET /api/goals/ratio-presets (비율 프리셋 목록 조회)
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
          description: "잠은 죽어서 잔다!\n이번 시즌, 후회 없이 모든 걸 쏟아붓습니다\n\n지금 편안하게 쉬는 것보다,\n미래의 압도적인 성취를 위해\n성장에 올인(All-in)하는 유형",
          growthRatio: 90,
          restRatio: 10,
          recommendedFor: "고시, 취준, 공모전 마감이 코앞인 전사들",
        },
        {
          presetId: 2,
          title: "밸런스 챌린저 🏃",
          description: "열심히 달리지만 번아웃은 사절!\n꽉 찬 일정 속, 전략적 휴식\n\n가장 표준적인 '성장 지향형' 모델\n주중엔 달리고 주말에는 확실히 쉬는 유형",
          growthRatio: 70,
          restRatio: 30,
          recommendedFor: "학점 관리와 대외활동을 병행하는\n프로 N잡러",
        },
        {
          presetId: 3,
          title: "황금 밸런스형 ⚖️",
          description: "성장도 휴식도 놓칠 수 없어!\n딱 반반, 완벽한 조화를 꿈꿉니다\n\n적극적으로 성장과 휴식을 탐색하는,\n이상적이고 건강한 루틴을 지향하는 유형",
          growthRatio: 50,
          restRatio: 50,
          recommendedFor: "방학을 알차게 보내고 싶지만,\n여행도 다니고 싶은 여유 있는 대학생",
        },
        {
          presetId: 4,
          title: "에너지 충전형 🔋",
          description: "지난 학기 너무 달린 나,\n이번엔 나를 돌보며 천천히 갑니다\n\n휴식이 메인이지만, '감'을 잃지 않기 위해\n최소한의 자기 개발은 유지하는 유형",
          growthRatio: 30,
          restRatio: 70,
          recommendedFor: "종강 직후 지친, 번아웃을 피하려는 대학생",
        },
        {
          presetId: 5,
          title: "슬로우 스타터 🐢",
          description: "무리하지 말고 딱 하나만!\n작은 습관부터 천천히 시작해볼까요?\n\n거창한 목표 대신 '하루 30분 독서' 같은\n작은 목표 하나에 집중이 필요한 유형",
          growthRatio: 20,
          restRatio: 80,
          recommendedFor: "무기력증을 극복하고 싶은 대학생,\n아주 작은 성취부터 맛보고 싶은 입문자",
        },
        {
          presetId: 6,
          title: "갭이어 탐험가 ✈️",
          description: "이번 시즌의 목표는 경험!\n마음껏 놀고, 보고, 느끼는 게 나의 스펙\n\n단순한 휴식이 아니라\n여행이나 새로운 경험을 통한\n'적극적인 휴식'으로 청춘을 즐기려는 유형",
          growthRatio: 10,
          restRatio: 90,
          recommendedFor: "배낭 여행, 워킹 홀리데이, 휴학 후\n자아를 찾는 여행자",
        },
      ],
    },
  };
}

/**
 * DELETE /api/goals/:goalId (목표 삭제)
 */
export async function deleteGoalByUserId(userIdRaw, goalIdParam) {
  const userId = Number(userIdRaw);
  const goalId = parseGoalIdParam(goalIdParam);

  const goal = await findGoalPeriodById(goalId);
  if (!goal) {
    const err = new Error("Goal not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "목표 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  if (Number(goal.userId) !== userId) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    err.payload = {
      resultType: "FAIL",
      error: { reason: "해당 목표에 대한 권한이 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  await deleteGoalPeriod(goalId);
  await updateOnboardingStatus(userId, false);

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      message: "목표가 성공적으로 삭제되었습니다.",
      deletedGoalId: goalId
    }
  };
}