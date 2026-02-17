import * as homeRepository from "../repositories/home.repository.js";

const toLocalDateString = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  let timeStr = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  
  if (timeStr === "24:00") timeStr = "00:00";
  return timeStr;
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

  const startOfWeek = new Date(today);
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

    const hasFixedItem = dailySchedules.some(a => a.type === "FIXED");

    weeklyStats.push({
      date: dateString,
      hasItems: hasFixedItem,
      todoCount: dailySchedules.length,
      schedules: dailySchedules.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type || "MANUAL",
        category: s.category || "GROWTH",
        status: s.status,
        point: s.point || 0,
        color: s.eventColor || 1,
        startTime: formatTime(s.startAt),
        endTime: formatTime(s.endAt)
      })),
    });
    currentLoopDate.setDate(currentLoopDate.getDate() + 1);
  }

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const rawTodayTodos = safeArray(await homeRepository.findTodayActivities(userId, startOfDay, endOfDay));
  const todayTodos = rawTodayTodos.map(t => ({
    todoId: t.id,
    title: t.title,
    category: t.category || "GROWTH",
    type: t.type || "MANUAL",
    status: t.status,
    point: t.point || 0,
    color: t.eventColor || 1,
    startTime: formatTime(t.startAt),
    endTime: formatTime(t.endAt),
    recurrenceRule: t.recurrenceRule ?? t.recurrence_rule ?? null,
  }));

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

export const patchScheduleStatus = async (userId, activityId) => {
  const activity = await homeRepository.findActivityById(activityId);
  if (!activity) throw new Error("NOT_FOUND");
  if (activity.userId !== userId) throw new Error("FORBIDDEN"); 
  const newStatus = activity.status === "DONE" ? "TODO" : "DONE";
  return await homeRepository.updateActivityStatus(activityId, newStatus);
};