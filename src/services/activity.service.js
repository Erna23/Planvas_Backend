import {
  findActivities,
  findRecommendations,
  findById,
  countActivitiesByCategory,
  countActivitiesTotal,
} from "../repositories/activity.repository.js";
import { findUserInterestIds } from "../repositories/userProfile.repository.js";

const GROWTH_CATEGORY_LIST = [
  { id: 103, name: "공모전" },
  { id: 105, name: "학회/동아리" },
  { id: 101, name: "대외활동" },
  { id: 106, name: "어학/자격증" },
  { id: 104, name: "인턴십" },
  { id: 102, name: "교육/강연" },
];


const REST_CATEGORY_LIST = [
  { id: 201, name: "문화/예술" },
  { id: 202, name: "취미/여가" },
  { id: 203, name: "운동/건강" },
  { id: 204, name: "여행" },
];


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

export async function listActivities({ userId, tab, categoryId, q, page, size, onlyAvailable }) {
  const interestIds = tab === "GROWTH" ? await findUserInterestIds(userId) : [];

  const { total, rows } = await findActivities({
    tab,
    categoryId,
    q,
    page,
    size,
    interestIds, // ✅ 이거 추가
  });

  let mapped = rows.map((a) => attachScheduleFields(a));
  if (onlyAvailable) mapped = mapped.filter((x) => x.scheduleStatus === "AVAILABLE");

  return {
    page,
    size,
    totalElements: total,
    activities: mapped,
  };
}


export async function recommendations({ userId, tab, date }) {
  const interestIds = tab === "GROWTH" ? await findUserInterestIds(userId) : [];

  const rows = await findRecommendations({ tab, interestIds }); // ✅ interestIds 전달

  const baseDate = date || todayISO();
  return { activities: rows.map((a) => attachScheduleFields(a, baseDate)) };
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

export async function listActivityCategories({ userId, tab }) {
  const interestIds = tab === "GROWTH" ? await findUserInterestIds(userId) : [];

  const total = await countActivitiesTotal(tab, interestIds);       // ✅ interestIds 전달
  const rows = await countActivitiesByCategory(tab, interestIds);   // ✅ interestIds 전달

  const countMap = new Map(rows.map((r) => [r.categoryId, r._count._all]));
  const base = tab === "GROWTH" ? GROWTH_CATEGORY_LIST : REST_CATEGORY_LIST;

  return {
    tab,
    categories: [
      { id: 0, name: "전체", count: total },
      ...base.map((c) => ({
        id: c.id,
        name: c.name,
        count: countMap.get(c.id) ?? 0,
      })),
    ],
  };
}

