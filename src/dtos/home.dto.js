export const homeResponseDTO = (
  userName,
  goalStatus,
  goal,
  progress,
  weeklyStats,
  todayTodos,
  recommendations
) => {
  const weekly = Array.isArray(weeklyStats) ? weeklyStats : [];
  const todos = Array.isArray(todayTodos) ? todayTodos : [];
  const recs = Array.isArray(recommendations) ? recommendations : [];

  // 1. 현재 목표 가공
  let currentGoal = null;
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
      startDate: goal.startDate instanceof Date ? goal.startDate.toISOString().split("T")[0] : goal.startDate,
      endDate: goal.endDate instanceof Date ? goal.endDate.toISOString().split("T")[0] : goal.endDate,
      dDay: dDayValue < 0 ? "마감" : dDayValue === 0 ? "D-Day" : `D-${dDayValue}`,
      growthRatio: goal.growth,
      restRatio: goal.rest,
    };
  }

  const progressData = {
    growthAchieved: progress?.growthAchieved ?? 0,
    restAchieved: progress?.restAchieved ?? 0,
  };

  // 2. 주간 캘린더 요약 (상세 렌더링 필드 보강)
  const days = weekly.map((stat) => {
    const schedules = Array.isArray(stat?.schedules) ? stat.schedules : [];

    return {
      date: stat?.date,
      hasItems: stat?.hasItems ?? false,
      todoCount: stat?.todoCount ?? schedules.length,
      schedules: schedules.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,         // "FIXED" / "NORMAL"
        category: s.category, // "GROWTH" / "REST"
        point: s.point,
        color: s.color,
        startTime: s.startTime,
        endTime: s.endTime,
        completed: s.status === "DONE"
      })),
    };
  });

  // 3. 오늘의 할 일 가공
  const formattedTodos = todos.map((todo) => ({
    todoId: todo.todoId || todo.id,
    title: todo.title,
    type: todo.type,
    category: todo.category || "GROWTH",
    point: todo.point,
    color: todo.color,
    startTime: todo.startTime,
    endTime: todo.endTime,
    completed: todo.status === "DONE",
    recurrenceRule: todo.recurrenceRule ?? null,
  }));

  // 4. 추천 활동
  const formattedRecommendations = recs.map((rec) => ({
    activityId: rec.id,
    title: rec.title,
    subTitle: rec.organizer,
    dDay: rec.dDay,
    imageUrl: rec.imageUrl,
    tags: Array.isArray(rec.tags) ? rec.tags : [],
  }));

  return {
    userName,
    goalStatus,
    currentGoal,
    progress: progressData,
    weeklySummary: {
      weekStartDate: days[0]?.date || new Date().toISOString().split("T")[0],
      days,
    },
    todayTodos: formattedTodos,
    recommendations: formattedRecommendations,
  };
};