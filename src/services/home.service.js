import { prisma } from "../db.config.js"; // ActivityCatalog 접근용
import * as homeRepository from "../repositories/home.repository.js";

export const getHomeData = async (userId) => {
  const today = new Date();

  // --------------------------------------------------------
  // 1. 목표 가져오기 (기존 유지)
  // --------------------------------------------------------
  const recentGoal = await homeRepository.findRecentGoal(userId);

  // --------------------------------------------------------
  // 2. 진행률 계산 (기존 유지)
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // 3. 주간 요약 데이터 (기존 유지)
  // --------------------------------------------------------
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
  for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split("T")[0];

    const count = weeklyRaw.filter((a) => {
      const aDate = new Date(a.startAt);
      return aDate.toISOString().split("T")[0] === dateString;
    }).length;

    weeklyStats.push({ date: dateString, count });
  }

  // --------------------------------------------------------
  // 4. 오늘의 할 일 (기존 유지)
  // --------------------------------------------------------
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const todayTodos = await homeRepository.findTodayActivities(
    userId,
    startOfDay,
    endOfDay
  );

  // --------------------------------------------------------
  // 5. [수정됨] 추천 활동 (ActivityCatalog + 랜덤 로직)
  // --------------------------------------------------------
  // 기존 Repository 대신 Prisma를 직접 사용하여 'ActivityCatalog' 조회
  const count = await prisma.activityCatalog.count();

  // 데이터가 3개보다 적으면 처음부터, 많으면 랜덤 위치(skip) 계산
  const skip = count > 3 ? Math.floor(Math.random() * (count - 3)) : 0;

  const rawRecommendations = await prisma.activityCatalog.findMany({
    take: 3,
    skip: skip,
    orderBy: { id: 'asc' } // 랜덤 skip을 위해 정렬 기준 필요
  });

  // 프론트엔드가 쓰기 좋게 데이터 가공 (D-Day 계산 등)
  const recommendations = rawRecommendations.map(item => ({
    id: item.id,
    title: item.title,
    subTitle: item.organizer || "", // 주최사를 부제목으로
    imageUrl: item.thumbnailUrl,
    tags: item.tags,                // JSON 태그 배열 그대로 전달
    dDay: calculateDDay(item.recruitEndDate) // ★ D-Day 계산 함수 사용
  }));

  return {
    goal: recentGoal,
    progress,
    weeklyStats,
    todayTodos,
    recommendations // 가공된 추천 활동 전달
  };
};

// --------------------------------------------------------
// Helper: D-Day 계산 함수
// --------------------------------------------------------
function calculateDDay(targetDate) {
  if (!targetDate) return null;

  const now = new Date();
  const target = new Date(targetDate);

  // 시간 부분 무시하고 날짜만 비교하기 위해 setHours 초기화
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "마감";
  if (diffDays === 0) return "D-Day";
  return `D-${diffDays}`;
}