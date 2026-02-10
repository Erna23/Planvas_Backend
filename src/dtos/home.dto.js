export const homeResponseDTO = (
  goal,
  progress,
  weeklyStats,
  todayTodos,
  recommendations
) => {
  // map 안전장치
  const weekly = Array.isArray(weeklyStats) ? weeklyStats : [];
  const todos = Array.isArray(todayTodos) ? todayTodos : [];
  const recs = Array.isArray(recommendations) ? recommendations : [];

  // 1. 현재 목표
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
      startDate: goal.startDate.toISOString().split("T")[0],
      endDate: goal.endDate.toISOString().split("T")[0],
      dDay: dDayValue,
      growthRatio: goal.growth,
      restRatio: goal.rest,
    };

    progressData = {
      growthAchieved: progress?.growth ?? 0,
      restAchieved: progress?.rest ?? 0,
    };
  } else {
    progressData = { growthAchieved: 0, restAchieved: 0 };
  }

  // 2. 주간 캘린더 요약
  const days = weekly.map((stat) => {
    const schedules = Array.isArray(stat?.schedules)
      ? stat.schedules
      : [];

    return {
      date: stat?.date,
      hasItems: schedules.length > 0,
      todoCount: schedules.length,
      schedules: schedules.map((s) => ({
        id: s.id,
        title: s.title,
        category:
          s.type === "FIXED" ? "FIXED" : s.type || "GROWTH",
      })),
    };
  });

  // 3. 오늘의 할 일
  const formatTime = (date) =>
    new Date(date).toTimeString().slice(0, 5);

  const formattedTodos = todos.map((todo) => ({
    todoId: todo.id || todo.googleEventId,
    title: todo.title,
    category:
      todo.type === "FIXED" ? "FIXED" : todo.type || "GROWTH",
    scheduleTime: `${formatTime(todo.startAt)} - ${formatTime(
      todo.endAt
    )}`,
    completed: todo.status === "DONE",
  }));

  // 4. 추천 활동
  const formattedRecommendations = recs.map((rec) => ({
    activityId: rec.id,
    title: rec.title,
    subTitle: rec.subTitle,
    dDay: rec.dDay,
    imageUrl: rec.imageUrl,
    tags: Array.isArray(rec.tags) ? rec.tags : [],
  }));

  return {
    currentGoal,
    progress: progressData,
    weeklySummary: {
      weekStartDate:
        days[0]?.date ||
        new Date().toISOString().split("T")[0],
      days,
    },
    todayTodos: formattedTodos,
    recommendations: formattedRecommendations,
  };
};
