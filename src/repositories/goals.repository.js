import { prisma } from "../db.config.js";

/**
 * 진행 중 목표(현재 목표) 조회
 * - startDate <= now <= endDate
 */
export async function findCurrentGoalPeriodByUserId(userId, now = new Date()) {
  return prisma.goalPeriod.findFirst({
    where: {
      userId,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      userId: true,
      title: true,
      startDate: true,
      endDate: true,
      growth: true,
      rest: true,
      presetType: true,
      presetId: true,
      createdAt: true,
    },
  });
}

/**
 * (정책) 진행 중 목표 존재 여부 체크
 */
export async function findOngoingGoalPeriodByUserId(userId, now = new Date()) {
  return prisma.goalPeriod.findFirst({
    where: {
      userId,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    select: { id: true },
  });
}


/**
 * (정책) 기간 겹침 목표 존재 여부 체크
 * overlap 조건: existing.startDate <= newEnd  AND  existing.endDate >= newStart
 * excludeGoalId: PATCH 시 자기 자신 제외용
 */
export async function findOverlappingGoalPeriodByUserId(userId, newStart, newEnd, excludeGoalId = null) {
  return prisma.goalPeriod.findFirst({
    where: {
      userId,
      ...(excludeGoalId ? { id: { not: excludeGoalId } } : {}),
      startDate: { lte: newEnd },
      endDate: { gte: newStart },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      title: true,
    },
    orderBy: { startDate: "desc" },
  });
}


/**
 * 목표 생성
 * - schema에 presetType 기본값이 없다면, service에서 presetType을 넣거나 schema default를 추가해야 함.
 */
export async function createGoalPeriod({
  userId,
  presetId,
  presetType,
  title,
  startDate,
  endDate,
  targetGrowthRatio,
  targetRestRatio,
}) {
  return prisma.goalPeriod.create({
    data: {
      userId,
      title,
      startDate,
      endDate,
      growth: targetGrowthRatio,
      rest: targetRestRatio,
      presetType,
      ...(presetId != null ? { presetId } : {}),
    },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      growth: true,
      rest: true,
      createdAt: true,
    },
  });
}

/**
 * goalId로 목표 조회 (소유권 확인용)
 */
export async function findGoalPeriodById(goalId) {
  return prisma.goalPeriod.findFirst({
    where: { id: goalId },
    select: {
      id: true,
      userId: true,
      title: true,
      startDate: true,
      endDate: true,
      growth: true,
      rest: true,
      presetType: true,
      presetId: true,
      createdAt: true,
    },
  });
}

/**
 * 목표 기간/이름 부분 수정
 */
export async function updateGoalPeriod(goalId, data) {
  return prisma.goalPeriod.update({
    where: { id: goalId },
    data,
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      growth: true,
      rest: true,
      createdAt: true,
    },
  });
}

/**
 * 목표 비율만 수정
 */
export async function updateGoalPeriodRatio(goalId, growth, rest) {
  return prisma.goalPeriod.update({
    where: { id: goalId },
    data: { growth, rest },
    select: {
      id: true,
      growth: true,
      rest: true,
    },
  });
}

export async function findGoalReports(userId) {
  return prisma.goalPeriod.findMany({
    where: { userId: userId },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true
    }
  })
}

/**
 * 목표 기간 내 활동(성장/휴식) 조회
 * - FIXED 제외하고 GROWTH/REST만 계산용으로 가져옴
 */
export async function findActivitiesForGoalProgress(userId, startInclusive, endExclusive) {
  return prisma.userActivity.findMany({
    where: {
      userId,
      startAt: { gte: startInclusive, lt: endExclusive },
      category: { in: ["GROWTH", "REST"] },
    },
    select: {
      category: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });
}

/**
 * 목표 삭제
 */
export async function deleteGoalPeriod(goalId) {
  return prisma.goalPeriod.delete({
    where: { id: goalId },
  });
}