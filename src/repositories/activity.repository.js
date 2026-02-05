import { prisma } from "../db.config.js";

export async function findActivities({ tab, categoryId, q, page, size }) {
  const where = {
    tab,
    ...(Number.isFinite(categoryId) ? { categoryId } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
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
  return prisma.activity.findMany({
    where,
    orderBy: [
      { type: "desc" }, // CONTEST 우선 노출(원하면 서비스에서 정렬 변경 가능)
      { point: "desc" },
      { id: "desc" },
    ],
    take: 10,
  });
}

export async function findById(activityId) {
  return prisma.activity.findUnique({ where: { id: activityId } });
}
