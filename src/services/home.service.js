import * as homeRepository from "../repositories/home.repository.js";

const toLocalDateString = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const safeArray = (v) => (Array.isArray(v) ? v : []);

function overlapsDate(event, dateString) {
  if (typeof dateString !== "string") return false;
  const [y, m, d] = dateString.split("-").map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
  const s = new Date(event?.startAt);
  const e = new Date(event?.endAt);
  return s <= dayEnd && e >= dayStart;
}

function calculateDDay(targetDate) {
  if (!targetDate) return null;
  const now = new Date();
  const target = new Date(targetDate);
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

  const userInfo = await homeRepository.findUserInfo(userId);
  const userName = userInfo?.name || "사용자";

  const currentGoal = await homeRepository.findCurrentGoal(userId, today);
  const recentGoal = await homeRepository.findRecentGoal(userId);
  const goal = currentGoal || null;
  const goalStatus = currentGoal ? "ACTIVE" : (recentGoal ? "ENDED" : "NONE");

  let progress = { growthAchieved: 0, restAchieved: 0 };
  if (goal) {
    const myActs = safeArray(await homeRepository.findMyActivitiesForGoal(userId, goal.id));
    myActs.forEach(a => {
      const tab = a?.Activity?.tab || a?.activity?.tab;
      if (tab === "GROWTH") progress.growthAchieved += 1;
      if (tab === "REST") progress.restAchieved += 1;
    });
  }

  // 3. 주간 일정 요약 (일요일 시작 고정)
  const startOfWeek = new Date(today);
  // getDay()는 일(0) ~ 토(6)를 반환하므로 일요일 시작에 완벽합니다.
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyRaw = safeArray(await homeRepository.findWeeklyActivities(userId, startOfWeek, endOfWeek));
  const weeklyStats = [];
  let currentLoopDate = new Date(startOfWeek);

  for (let i = 0; i < 7; i++) {
    const dateString = toLocalDateString(currentLoopDate);
    const dailySchedules = weeklyRaw.filter((a) => overlapsDate(a, dateString));

    // 지은님 요청: 고정 일정(FIXED) 여부
    const hasFixedItem = dailySchedules.some(a => a.type === "FIXED");

    weeklyStats.push({
      date: dateString,
      hasItems: hasFixedItem,
      todoCount: dailySchedules.length,
      schedules: dailySchedules.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        category: s.category || "GROWTH",
        status: s.status,
        // 시연 시 시간을 보기 좋게 출력하기 위한 포맷팅
        startTime: s.startAt ? new Date(s.startAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : null,
        endTime: s.endAt ? new Date(s.endAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) : null
      })),
    });
    currentLoopDate.setDate(currentLoopDate.getDate() + 1);
  }

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  const todayTodos = safeArray(await homeRepository.findTodayActivities(userId, startOfDay, endOfDay));

  const rawRecs = safeArray(await homeRepository.findRecommendations());
  const recommendations = rawRecs.map((item) => ({
    id: item.id,
    title: item.title,
    organizer: item.organizer || "",
    imageUrl: item.thumbnailUrl,
    tags: Array.isArray(item.tags) ? item.tags : [],
    dDay: calculateDDay(item.recruitEndDate || item.recruit_end_date),
  }));

  return {
    userName,
    goalStatus,
    goal,
    progress,
    weekStartDate: toLocalDateString(startOfWeek),
    weeklyStats,
    todayTodos,
    recommendations,
  };
};