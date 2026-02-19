import * as homeRepository from "../repositories/home.repository.js";
import { getGrowthAndRest } from "../repositories/schedule.repository.js";
import { getGrowthAndRestPointFromActivities } from "../repositories/activity.repository.js";

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

export const getHomeData = async (userIdRaw) => {
  const today = new Date();
  const userId = Number(userIdRaw);

  const userInfo = await homeRepository.findUserInfo(userId);
  const userName = userInfo?.name || "사용자";

  const currentGoal = await homeRepository.findCurrentGoal(userId, today);
  const recentGoal = await homeRepository.findRecentGoal(userId);


  const isMyCurrent = currentGoal && Number(currentGoal.userId) === userId;
  const isMyRecent = recentGoal && Number(recentGoal.userId) === userId;

  const goal = isMyCurrent ? currentGoal : null;
  const goalStatus = isMyCurrent ? "ACTIVE" : (isMyRecent ? "ENDED" : "NONE");

  let progress = { growthAchieved: 0, restAchieved: 0 };

  if (goal) {

    const { growth, rest, activityIds } = await getGrowthAndRest(userId, goal.startDate, goal.endDate);
    const activityInfo = await getGrowthAndRestPointFromActivities(activityIds);

    progress.growthAchieved = growth + activityInfo.growth;
    progress.restAchieved = rest + activityInfo.rest;

    const myActs = safeArray(await homeRepository.findMyActivitiesForGoal(userId, goal.id));
    myActs.forEach(a => {
      if (a.completed === true) {
        const tab = a.Activity?.tab || a.activity?.tab;
        if (tab === "GROWTH") progress.growthAchieved += 1;
        if (tab === "REST") progress.restAchieved += 1;
      }
    });
  }

  // 주간 활동 및 투두 조회 로직 (userId 변수 사용)
  const startOfWeek = new Date(today);
  const day = today.getDay(); // 0(일) ~ 6(토)
  
  // 일요일(0)이면 -6일, 그 외 요일은 (1 - 요일값)만큼 더해서 월요일로 맞춤
  const diff = (day === 0 ? -6 : 1) - day; 
  startOfWeek.setDate(today.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // 월요일로부터 6일 뒤는 일요일
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyRaw = safeArray(await homeRepository.findWeeklyActivities(userId, startOfWeek, endOfWeek));
  const weeklyStats = [];
  let currentLoopDate = new Date(startOfWeek);

  for (let i = 0; i < 7; i++) {
    const dateString = toLocalDateString(currentLoopDate);

    // 1. 해당 날짜 범위에 있는 모든 일정을 일차적으로 필터링
    const dailySchedulesRaw = weeklyRaw.filter((a) => overlapsDate(a, dateString));

    // 2. [수정] ACTIVITY 타입은 종료일(endAt)에만 표시되도록 추가 필터링
    const dailySchedules = dailySchedulesRaw.filter((s) => {
      if (s.type === "ACTIVITY") {
        const endDateString = toLocalDateString(new Date(s.endAt));
        return endDateString === dateString; // 오늘이 마지막 날인 경우만 포함
      }
      return true; // 다른 타입(FIXED, MANUAL 등)은 기존처럼 유지
    });

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
        endTime: formatTime(s.endAt),
        recurrenceRule: s.recurrenceRule ?? s.recurrence_rule ?? null,
      })),
    });
    currentLoopDate.setDate(currentLoopDate.getDate() + 1);
  }

  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const rawTodayTodos = safeArray(await homeRepository.findTodayActivities(userId, startOfDay, endOfDay));
  const todayString = toLocalDateString(today);

  // 2. 오늘의 할 일 목록 필터링 및 데이터 구성
  const todayTodos = rawTodayTodos
    .filter((t) => {
      if (t.type === "ACTIVITY") {
        const endDateString = toLocalDateString(new Date(t.endAt));
        return endDateString === todayString;
      }
      return true;
    })
    .map(t => ({
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
    goal: isMyCurrent ? currentGoal : (isMyRecent ? recentGoal : null),
    progress: progress, 
    weekStartDate: toLocalDateString(startOfWeek),
    weeklyStats,
    todayTodos,
    recommendations,
  };
};

export const patchScheduleStatus = async (userIdRaw, activityId) => {
  const userId = Number(userIdRaw);
  const activity = await homeRepository.findActivityById(activityId);
  if (!activity) throw new Error("NOT_FOUND");
  if (Number(activity.userId) !== userId) throw new Error("FORBIDDEN");

  const newStatus = activity.status === "DONE" ? "TODO" : "DONE";
  return await homeRepository.updateActivityStatus(activityId, newStatus);
};