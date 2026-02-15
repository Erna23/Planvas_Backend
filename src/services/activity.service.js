import {
  findActivities,
  findRecommendations,
  findById,
  countActivitiesByCategory,
  countActivitiesTotal,
} from "../repositories/activity.repository.js";
import { findUserInterestIds } from "../repositories/userProfile.repository.js";
import { prisma } from "../db.config.js";
import { decideScheduleStatus, fetchFixedSchedulesInRange } from "./scheduleOverlap.service.js";

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

async function attachScheduleFields(activity, { userId, baseDate = todayISO(), fixedSchedules = null } = {}) {
  const startDate = activity.startDate ? activity.startDate.toISOString().slice(0, 10) : null;
  const endDate = activity.endDate ? activity.endDate.toISOString().slice(0, 10) : null;

  let dDay = null;
  let scheduleStatus = "AVAILABLE";
  let tipMessage = null;

  // 1) 마감/임박 계산(기존 유지)
  if (endDate) {
    dDay = diffDays(baseDate, endDate);
    if (dDay < 0) {
      scheduleStatus = "UNAVAILABLE";
      tipMessage = "마감된 일정이에요.";
    }
  }

  // 2) 마감 아니고 + userId 있고 + 날짜 정보 있으면 => PM 겹침판정 적용
  if (scheduleStatus !== "UNAVAILABLE" && userId && startDate && endDate) {
    const decision = await decideScheduleStatus({
      prisma,
      userId,
      activityCatalog: activity,
      startDate,
      endDate,
      fixedSchedules, // ⭐ prefetch된 일정 재사용
    });

    if (decision.status === "CONFLICT") {
      scheduleStatus = "CONFLICT";
      tipMessage = decision.reason ?? "고정 일정과 겹쳐요.";
    } else if (decision.status === "CAUTION") {
      scheduleStatus = "CAUTION";
      tipMessage = decision.reason ?? "기간 내 고정 일정이 있어요. 조정이 필요할 수 있어요.";
    } else {
      scheduleStatus = "AVAILABLE";
      tipMessage = null;
    }
  }

  // 3) 마감 임박(dDay<=3)은 AVAILABLE일 때만 CAUTION으로 올리기(우선순위)
  if (scheduleStatus === "AVAILABLE" && dDay != null && dDay <= 3) {
    scheduleStatus = "CAUTION";
    tipMessage = "마감이 임박했어요! 일정 조정이 필요할 수 있어요.";
  }

  return {
    activityId: activity.id,
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
    externalUrl: activity.externalUrl ?? null,
  };
}


export async function listActivities({ userId, tab, categoryId, q, page, size, onlyAvailable }) {
  const interestIds = tab === "GROWTH" ? await findUserInterestIds(userId) : [];
  const { total, rows } = await findActivities({ tab, categoryId, q, page, size, interestIds });

  // ✅ 이번 페이지 활동들의 전체 기간 범위 계산
  const starts = rows.map(r => r.startDate).filter(Boolean);
  const ends = rows.map(r => r.endDate).filter(Boolean);

  let fixedSchedules = null;
  if (userId && starts.length && ends.length) {
    const minStart = new Date(Math.min(...starts.map(d => d.getTime())));
    const maxEnd = new Date(Math.max(...ends.map(d => d.getTime())));
    fixedSchedules = await fetchFixedSchedulesInRange({
      prisma,
      userId,
      rangeStart: startOfDayLocal(minStart),
      rangeEnd: endOfDayLocal(maxEnd),
    });
  }

  let mapped = await Promise.all(
    rows.map((a) => attachScheduleFields(a, { userId, fixedSchedules }))
  );

  if (onlyAvailable) mapped = mapped.filter((x) => x.scheduleStatus === "AVAILABLE");

  return { page, size, totalElements: total, activities: mapped };
}



export async function recommendations({ userId, tab, date }) {
  const interestIds = tab === "GROWTH" ? await findUserInterestIds(userId) : [];
  const rows = await findRecommendations({ tab, interestIds });

  const baseDate = date || todayISO();

  // 추천도 범위 기반으로 prefetch
  const starts = rows.map(r => r.startDate).filter(Boolean);
  const ends = rows.map(r => r.endDate).filter(Boolean);

  let fixedSchedules = null;
  if (userId && starts.length && ends.length) {
    const minStart = new Date(Math.min(...starts.map(d => d.getTime())));
    const maxEnd = new Date(Math.max(...ends.map(d => d.getTime())));
    fixedSchedules = await fetchFixedSchedulesInRange({
      prisma,
      userId,
      rangeStart: startOfDayLocal(minStart),
      rangeEnd: endOfDayLocal(maxEnd),
    });
  }

  return {
    activities: await Promise.all(rows.map((a) => attachScheduleFields(a, { userId, baseDate, fixedSchedules }))),
  };
}


export async function getDetail(userId, activityId) {
  const a = await findById(activityId);
  if (!a) return null;

  const mapped = await attachScheduleFields(a, { userId });

  return {
    activityId: mapped.activityId,
    title: mapped.title,
    category: mapped.category,
    point: mapped.point,
    description: a.description ?? null,
    thumbnailUrl: mapped.thumbnailUrl,
    type: mapped.type,
    startDate: mapped.startDate,
    endDate: mapped.endDate,
    dDay: mapped.dDay,
    scheduleStatus: mapped.scheduleStatus,
    tipMessage: mapped.tipMessage,
    categoryId: mapped.categoryId,
    externalUrl: mapped.externalUrl,
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
function startOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}


