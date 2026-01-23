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
