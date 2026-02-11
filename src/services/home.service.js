import * as homeRepository from "../repositories/home.repository.js";

// ✅ 로컬 기준 YYYY-MM-DD (KST 안전)
const toLocalDateString = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ✅ 배열 방어
const safeArray = (v) => (Array.isArray(v) ? v : []);

// ✅ 일정이 특정 날짜(YYYY-MM-DD)와 "겹치는지" (KST 안전)
function overlapsDate(event, dateString) {
  // dateString 방어(혹시라도)
  if (typeof dateString !== "string") return false;

  const [y, m, d] = dateString.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;

  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

  const s = new Date(event?.startAt);
  const e = new Date(event?.endAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;

  return s <= dayEnd && e >= dayStart;
}

// D-Day 계산
function calculateDDay(targetDate) {
  if (!targetDate) return null;

  const now = new Date();
  const target = new Date(targetDate);

  if (Number.isNaN(target.getTime())) return null;

  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "마감";
  if (diffDays === 0) return "D-Day";
  return `D-${diffDays}`;
}

export const getHomeData = async (userId) => {
  const today = new Date();

  // ✅ 목표 상태 구분
  const currentGoal = await homeRepository.findCurrentGoal(userId, today);
  const recentGoal = await homeRepository.findRecentGoal(userId);

  let goalStatus = "NONE"; // NONE | ACTIVE | ENDED
  if (currentGoal) goalStatus = "ACTIVE";
  else if (recentGoal) goalStatus = "ENDED";

  const goal = currentGoal || null;

  // ✅ 진행률: MyActivity + Activity.tab (GROWTH/REST)
  let progress = { growthAchieved: 0, restAchieved: 0 };

  if (goal) {
    const myActs = safeArray(await homeRepository.findMyActivitiesForGoal(userId, goal.id));
    for (const a of myActs) {
      if (a?.Activity?.tab === "GROWTH") progress.growthAchieved += 1;
      if (a?.Activity?.tab === "REST") progress.restAchieved += 1;
    }
  }

  // ✅ 주간 일정: 오늘 기준 -3 ~ +3 (총 7일)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 3);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 3);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyRaw = safeArray(
    await homeRepository.findWeeklyActivities(userId, startOfWeek, endOfWeek)
  );

  const weeklyStats = [];
  for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
    const dateString = toLocalDateString(d);

    // ✅ 겹치는 일정 포함해서 날짜별 분배
    const dailySchedules = weeklyRaw.filter((a) => overlapsDate(a, dateString));

    weeklyStats.push({
      date: dateString,
      schedules: dailySchedules,
    });
  }

  // ✅ 오늘의 할 일
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const todayTodos = safeArray(await homeRepository.findTodayActivities(userId, startOfDay, endOfDay));

  // ✅ 추천 활동 (여기가 에러 원인 → 무조건 배열로 방어)
  const rawRecommendations = safeArray(await homeRepository.findRecommendations(3));

  const recommendations = rawRecommendations.map((item) => ({
    id: item.id,
    title: item.title,
    subTitle: item.organizer || "",
    imageUrl: item.thumbnailUrl,
    tags: Array.isArray(item.tags) ? item.tags : [],
    dDay: calculateDDay(item.recruitEndDate),
  }));

  return {
    goalStatus,
    goal,
    progress,
    weeklyStats,
    todayTodos,
    recommendations,
  };
};
