import { prisma } from "../db.config.js";

export async function findActivities({ tab, categoryId, q, page, size, interestIds }) {
  const where = { tab };

  if (categoryId !== undefined) where.categoryId = categoryId;
  if (q) where.title = { contains: q };

  if (Array.isArray(interestIds) && interestIds.length > 0) {
    where.activityInterests = { some: { interestId: { in: interestIds } } };
  }

  const total = await prisma.activityCatalog.count({ where });

  const rows = await prisma.activityCatalog.findMany({
    where,
    orderBy: { id: "desc" },
    skip: page * size,
    take: size,
  });

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
