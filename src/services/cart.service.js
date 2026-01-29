import { getCartItems, existsInCart, addToCart, deleteCartItem } from "../repositories/cart.repository.js";
import { findById } from "../repositories/activity.repository.js";

function attachCardFields(activity) {
  const startDate = activity.startDate ? activity.startDate.toISOString().slice(0, 10) : null;
  const endDate = activity.endDate ? activity.endDate.toISOString().slice(0, 10) : null;

  let dDay = null;
  let scheduleStatus = "AVAILABLE";
  let tipMessage = null;

  if (endDate) {
    const baseISO = new Date().toISOString().slice(0, 10);
    const from = new Date(baseISO + "T00:00:00Z");
    const to = new Date(endDate + "T00:00:00Z");
    dDay = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    if (dDay < 0) {
      scheduleStatus = "UNAVAILABLE";
      tipMessage = "마감된 일정이에요.";
    } else if (dDay <= 3) {
      scheduleStatus = "CAUTION";
      tipMessage = "마감이 임박했어요! 일정 조정이 필요할 수 있어요.";
    }
  }

  return {
    title: activity.title,
    category: activity.tab,
    point: activity.point,
    thumbnailUrl: activity.thumbnailUrl ?? "string",

    type: activity.type,
    categoryId: activity.categoryId ?? null,
    startDate,
    endDate,
    dDay,
    scheduleStatus,
    tipMessage,
  };
}

export async function getCart(userId, tab) {
  const rows = await getCartItems(userId, tab);

  return {
    tab,
    items: rows.map((row) => ({
      cartItemId: row.id,
      activityId: row.activityId,
      ...attachCardFields(row.activity),
    })),
  };
}

export async function addCart(userId, activityId) {
  const activity = await findById(activityId);
  if (!activity) return { notFound: true };

  const exists = await existsInCart(userId, activityId);
  if (exists) return { already: true };

  const created = await addToCart(userId, activityId);
  return { created };
}

export async function removeCart(userId, cartItemId) {
  return deleteCartItem(userId, cartItemId);
}
