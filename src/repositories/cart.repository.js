import { prisma } from "../db.config.js";

export async function getCartItems(userId, tab) {
  return prisma.cartItem.findMany({
    where: {
      userId,
      activity: { tab },
    },
    include: { activity: true },
    orderBy: { id: "desc" },
  });
}

export async function existsInCart(userId, activityId) {
  const row = await prisma.cartItem.findUnique({
    where: { userId_activityId: { userId, activityId } },
  });
  return !!row;
}

export async function addToCart(userId, activityId) {
  return prisma.cartItem.create({
    data: { userId, activityId },
  });
}

export async function deleteCartItem(userId, cartItemId) {
  const row = await prisma.cartItem.findFirst({
    where: { id: cartItemId, userId },
  });
  if (!row) return null;

  await prisma.cartItem.delete({ where: { id: cartItemId } });
  return row;
}
