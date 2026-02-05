import { findActivities, findRecommendations, findById } from "../repositories/activity.repository.js";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffDays(fromYYYYMMDD, toYYYYMMDD) {
  const from = new Date(fromYYYYMMDD + "T00:00:00Z");
  const to = new Date(toYYYYMMDD + "T00:00:00Z");
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function attachScheduleFields(activity, baseDate = todayISO()) {
  const startDate = activity.startDate ? activity.startDate.toISOString().slice(0, 10) : null;
  const endDate = activity.endDate ? activity.endDate.toISOString().slice(0, 10) : null;

  let dDay = null;
  let scheduleStatus = "AVAILABLE";
  let tipMessage = null;

  if (endDate) {
    dDay = diffDays(baseDate, endDate);
    if (dDay < 0) {
      scheduleStatus = "UNAVAILABLE";
      tipMessage = "마감된 일정이에요.";
    } else if (dDay <= 3) {
      scheduleStatus = "CAUTION";
      tipMessage = "마감이 임박했어요! 일정 조정이 필요할 수 있어요.";
    }
  }

  return {
    activityId: activity.id,
    title: activity.title,
    category: activity.tab, // 네 명세: category에 GROWTH/REST 내려줌
    point: activity.point,
    thumbnailUrl: activity.thumbnailUrl ?? "string",

    // 와이어프레임 대응 확장 필드
    type: activity.type,
    categoryId: activity.categoryId ?? null,
    startDate,
    endDate,
    dDay,
    scheduleStatus,
    tipMessage,
    externalUrl: activity.externalUrl ?? null,
  };
}

export async function listActivities({ tab, categoryId, q, page, size, onlyAvailable }) {
  const { total, rows } = await findActivities({ tab, categoryId, q, page, size });

  let mapped = rows.map((a) => attachScheduleFields(a));
  if (onlyAvailable) mapped = mapped.filter((x) => x.scheduleStatus === "AVAILABLE");

  return {
    page,
    size,
    totalElements: total,
    activities: mapped,
  };
}

export async function recommendations({ tab, date }) {
  const rows = await findRecommendations({ tab });
  const baseDate = date || todayISO();

  return {
    activities: rows.map((a) => attachScheduleFields(a, baseDate)),
  };
}

export async function getDetail(activityId) {
  const a = await findById(activityId);
  if (!a) return null;

  const mapped = attachScheduleFields(a);
  return {
    activityId: mapped.activityId,
    title: mapped.title,
    category: mapped.category,
    point: mapped.point,
    description: a.description ?? null,
    thumbnailUrl: mapped.thumbnailUrl,

    // 확장
    type: mapped.type,
    startDate: mapped.startDate,
    endDate: mapped.endDate,
    dDay: mapped.dDay,
    scheduleStatus: mapped.scheduleStatus,
    tipMessage: mapped.tipMessage,
    categoryId: mapped.categoryId,
    externalUrl: mapped.externalUrl,

    // (선택) I102 점수 +/- UI용
    minPoint: 10,
    maxPoint: 50,
    defaultPoint: mapped.point,
  };
}
