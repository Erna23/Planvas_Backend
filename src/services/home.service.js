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

  // 0. 사용자 이름 조회 추가
  const userInfo = await homeRepository.findUserInfo(userId);
  const userName = userInfo?.name || "사용자";

  // 시간대 문제를 방지하기 위한 기준 날짜 생성
  const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

  // 1. 목표 데이터 조회
  const currentGoal = await homeRepository.findCurrentGoal(userId, checkDate);
  const recentGoal = await homeRepository.findRecentGoal(userId);

  let goalStatus = "NONE";
  if (currentGoal) {
    goalStatus = "ACTIVE";
  } else if (recentGoal) {
    goalStatus = "ENDED";
  }

  const goal = currentGoal || null;

  // 2. 진행률 계산
  let progress = { growthAchieved: 0, restAchieved: 0 };
  if (goal) {
    const myActs = safeArray(await homeRepository.findMyActivitiesForGoal(userId, goal.id));
    for (const a of myActs) {
      const tab = a?.Activity?.tab || a?.activity?.tab;
      if (tab === "GROWTH") progress.growthAchieved += 1;
      if (tab === "REST") progress.restAchieved += 1;
    }
  }

  // 3. 주간 일정 요약 (일~토)
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();

  startOfWeek.setDate(today.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyRaw = safeArray(
    await homeRepository.findWeeklyActivities(userId, startOfWeek, endOfWeek)
  );

  const weeklyStats = [];
  let currentLoopDate = new Date(startOfWeek);
  for (let i = 0; i < 7; i++) {
    const dateString = toLocalDateString(currentLoopDate);

    const dailySchedules = weeklyRaw.filter((a) => overlapsDate(a, dateString));
    const hasFixedItem = dailySchedules.some(a => a.type === "FIXED");

    weeklyStats.push({
      date: dateString,
      hasItems: hasFixedItem,
      todoCount: dailySchedules.length,
      schedules: dailySchedules.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        category: s.category
      })),
    });

    currentLoopDate.setDate(currentLoopDate.getDate() + 1);
  }

  // 4. 오늘의 할 일
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const todayTodos = safeArray(await homeRepository.findTodayActivities(userId, startOfDay, endOfDay));

  // 5. 추천 활동
  const rawRecommendations = safeArray(await homeRepository.findRecommendations(3));
  const recommendations = rawRecommendations.map((item) => ({
    id: item.id,
    title: item.title,
    subTitle: item.organizer || "",
    imageUrl: item.thumbnailUrl,
    tags: Array.isArray(item.tags) ? item.tags : [],
    dDay: calculateDDay(item.recruit_end_date || item.recruitEndDate),
  }));

  return {
    userName, // 💡 최종 응답에 userName 포함
    goalStatus,
    goal,
    progress,
    weekStartDate: toLocalDateString(startOfWeek),
    weeklyStats,
    todayTodos,
    recommendations,
  };
};