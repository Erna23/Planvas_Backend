export const homeResponseDTO = (goal, progress, weeklyStats, todayTodos, recommendations) => {
  // 1. 현재 목표 (currentGoal)
  let currentGoal = null;
  let progressData = null;

  if (goal) {
    const now = new Date();
    const end = new Date(goal.endDate);
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - now;
    const dDayValue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    currentGoal = {
      goalId: goal.id,
      title: goal.title,
      startDate: goal.startDate.toISOString().split('T')[0],
      endDate: goal.endDate.toISOString().split('T')[0],
      dDay: dDayValue,
      growthRatio: goal.growth, // 목표 설정치 (예: 70%)
      restRatio: goal.rest      // 목표 설정치 (예: 30%)
    };

    // 2. 진행률 (실제 DB 데이터 매핑)
    progressData = {
      growthAchieved: progress.growth, // 실제 완료한 성장 활동 개수
      restAchieved: progress.rest      // 실제 완료한 휴식 활동 개수
    };
  }

  // 3. 주간 요약
  const days = weeklyStats.map(stat => ({
    date: stat.date,
    hasItems: stat.count > 0,
    todoCount: stat.count
  }));

  // 4. 오늘의 할 일
  const formattedTodos = todayTodos.map(todo => ({
    todoId: todo.id || todo.googleEventId,
    title: todo.title,
    category: todo.type === "FIXED" ? "FIXED" : (todo.type || "GROWTH"),
    completed: todo.status === "DONE"
  }));

  // 5. 추천 활동
  const formattedRecommendations = recommendations.map(rec => ({
    activityId: rec.id,
    title: rec.title,
    category: rec.category,
    point: rec.point
  }));

  return {
    currentGoal,
    progress: progressData,
    weeklySummary: {
      weekStartDate: days[0]?.date || new Date().toISOString().split('T')[0],
      days: days
    },
    todayTodos: formattedTodos,
    recommendations: formattedRecommendations
  };
};