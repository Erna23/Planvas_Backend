import * as homeRepository from "../repositories/home.repository.js";

export const getHomeData = async (userId) => {
  const today = new Date();
  
  // 1. 목표 가져오기
  const recentGoal = await homeRepository.findRecentGoal(userId);

  // 2. 진행률 계산 (목표가 있을 때만 DB 조회)
  let progress = { growth: 0, rest: 0 };
  
  if (recentGoal) {
    // DB에서 완료된 활동 개수 가져오기
    const counts = await homeRepository.countDoneActivities(
      userId, 
      recentGoal.startDate, 
      recentGoal.endDate
    );

    // counts 예시: [ { type: 'GROWTH', _count: { id: 5 } }, { type: 'REST', _count: { id: 2 } } ]
    const growthData = counts.find(c => c.type === 'GROWTH');
    const restData = counts.find(c => c.type === 'REST');

    progress.growth = growthData ? growthData._count.id : 0;
    progress.rest = restData ? restData._count.id : 0;
  }

  // 3. 주간 요약 데이터 생성 (오늘 기준 -3일 ~ +3일)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 3);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 3);

  const weeklyRaw = await homeRepository.findWeeklyActivities(userId, startOfWeek, endOfWeek);
  
  const weeklyStats = [];
  for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      
      const count = weeklyRaw.filter(a => {
          const aDate = new Date(a.startAt);
          return aDate.toISOString().split('T')[0] === dateString;
      }).length;

      weeklyStats.push({ date: dateString, count });
  }

  // 4. 오늘의 할 일
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  const todayTodos = await homeRepository.findTodayActivities(userId, startOfDay, endOfDay);

  // 5. 추천 활동 (DB 조회)
  const recommendations = await homeRepository.findRecommendations();

  return {
    goal: recentGoal,
    progress, // 계산된 진행률 전달
    weeklyStats,
    todayTodos,
    recommendations
  };
};