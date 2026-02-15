import { prisma } from "../db.config.js";

export async function findActivities({ tab, categoryId, q, page, size, interestIds }) {
  const baseWhere = { tab };

  if (categoryId !== undefined) baseWhere.categoryId = categoryId;
  if (q) baseWhere.title = { contains: q };

  const offset = page * size;

  // 관심사 없으면 기본 목록
  if (!Array.isArray(interestIds) || interestIds.length === 0) {
    const total = await prisma.activityCatalog.count({ where: baseWhere });
    const rows = await prisma.activityCatalog.findMany({
      where: baseWhere,
      orderBy: { id: "desc" },
      skip: offset,
      take: size,
    });
    return { total, rows };
  }

  const interestFilter = {
    activityInterests: { some: { interestId: { in: interestIds } } },
  };

  const matchedWhere = { ...baseWhere, ...interestFilter };
  const nonMatchedWhere = { ...baseWhere, NOT: interestFilter };

  const [total, matchedTotal] = await Promise.all([
    prisma.activityCatalog.count({ where: baseWhere }),
    prisma.activityCatalog.count({ where: matchedWhere }),
  ]);

  // page 영역에 맞춰서 "매칭 먼저, 부족하면 비매칭으로 채우기"
  let rows = [];
  if (offset < matchedTotal) {
    const mTake = Math.min(size, matchedTotal - offset);
    const matched = await prisma.activityCatalog.findMany({
      where: matchedWhere,
      orderBy: { id: "desc" },
      skip: offset,
      take: mTake,
    });
    rows = rows.concat(matched);

    const remain = size - matched.length;
    if (remain > 0) {
      const nonMatched = await prisma.activityCatalog.findMany({
        where: nonMatchedWhere,
        orderBy: { id: "desc" },
        skip: 0,
        take: remain,
      });
      rows = rows.concat(nonMatched);
    }
  } else {
    const nSkip = offset - matchedTotal;
    rows = await prisma.activityCatalog.findMany({
      where: nonMatchedWhere,
      orderBy: { id: "desc" },
      skip: nSkip,
      take: size,
    });
  }

  return { total, rows };
}


export async function findRecommendations({ tab, interestIds }) {
  const where = tab ? { tab } : {};

  if (tab === "GROWTH" && Array.isArray(interestIds) && interestIds.length > 0) {
    where.activityInterests = {
      some: { interestId: { in: interestIds } },
    };
  }

  return prisma.activityCatalog.findMany({
    where,
    orderBy: [
      { type: "desc" },
      { point: "desc" },
      { id: "desc" },
    ],
    take: 10,
  });
}


export async function findById(activityId) {
  return prisma.activityCatalog.findUnique({ where: { id: activityId } });
}
export async function groupActivityCategories(tab) {
  return prisma.activityCatalog.groupBy({
    by: ["categoryId"],
    where: {
      tab,
      categoryId: { not: null },
    },
    _count: { _all: true },
    orderBy: { categoryId: "asc" },
  });
}
export async function countActivitiesByCategory(tab, interestIds) {
  const where = { tab, categoryId: { not: null } };

  if (Array.isArray(interestIds) && interestIds.length > 0) {
    where.activityInterests = { some: { interestId: { in: interestIds } } };
  }

  return prisma.activityCatalog.groupBy({
    by: ["categoryId"],
    where,
    _count: { _all: true },
    orderBy: { categoryId: "asc" },
  });
}

export async function countActivitiesTotal(tab, interestIds) {
  const where = { tab };
  if (Array.isArray(interestIds) && interestIds.length > 0) {
    where.activityInterests = { some: { interestId: { in: interestIds } } };
  }
  return prisma.activityCatalog.count({ where });
}
