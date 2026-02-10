import { prisma } from "../db.config.js";
import * as homeRepository from "../repositories/home.repository.js";

export const getHomeData = async (userId) => {
  const today = new Date();

  // 1. 최근 목표
  const recentGoal = await homeRepository.findRecentGoal(userId);

  // 2. 진행률
  let progress = { growth: 0, rest: 0 };

  if (recentGoal) {
    const counts = await homeRepository.countDoneActivities(
      userId,
      recentGoal.startDate,
      recentGoal.endDate
    );

    const growthData = counts.find((c) => c.type === "GROWTH");
    const restData = counts.find((c) => c.type === "REST");

    progress.growth = growthData ? growthData._count.id : 0;
    progress.rest = restData ? restData._count.id : 0;
  }

  // 3. 주간 일정
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 3);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 3);

  const weeklyRaw = await homeRepository.findWeeklyActivities(
    userId,
    startOfWeek,
    endOfWeek
  );

  const weeklyStats = [];
  for (
    let d = new Date(startOfWeek);
    d <= endOfWeek;
    d.setDate(d.getDate() + 1)
  ) {
    const dateString = d.toISOString().split("T")[0];
    const dailySchedules = weeklyRaw.filter((a) => {
      const aDate = new Date(a.startAt);
      return aDate.toISOString().split("T")[0] === dateString;
    });

    weeklyStats.push({
      date: dateString,
      schedules: dailySchedules,
    });
  }

  // 4. 오늘의 할 일
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const todayTodos = await homeRepository.findTodayActivities(
    userId,
    startOfDay,
    endOfDay
  );

  // 5. 추천 활동
  const rawRecommendations = await homeRepository.findRecommendations(3);

  const recommendations = rawRecommendations.map((item) => ({
    id: item.id,
    title: item.title,
    subTitle: item.organizer || "",
    imageUrl: item.thumbnailUrl,
    tags: Array.isArray(item.tags) ? item.tags : [],
    dDay: calculateDDay(item.recruitEndDate),
  }));

  return {
    goal: recentGoal,
    progress,
    weeklyStats,
    todayTodos,
    recommendations,
  };
};

// D-Day 계산
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