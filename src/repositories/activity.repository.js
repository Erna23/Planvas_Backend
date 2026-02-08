import { prisma } from "../db.config.js";

export async function findActivities({ tab, categoryId, q, page, size }) {
  const where = {
    tab,
    ...(Number.isFinite(categoryId) ? { categoryId } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.activityCatalog.count({ where }),
    prisma.activityCatalog.findMany({
      where,
      orderBy: [{ id: "desc" }],
      skip: page * size,
      take: size,
    }),
  ]);

  return { total, rows };
}

export async function findRecommendations({ tab }) {
  const where = tab ? { tab } : {};
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
