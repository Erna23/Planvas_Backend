export const homeResponseDTO = (
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

  // 1. 현재 목표
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
      // 가끔 날짜 객체가 아닐 경우를 대비해 처리
      startDate: goal.startDate instanceof Date ? goal.startDate.toISOString().split("T")[0] : goal.startDate,
      endDate: goal.endDate instanceof Date ? goal.endDate.toISOString().split("T")[0] : goal.endDate,
      dDay: dDayValue,
      growthRatio: goal.growth,
      restRatio: goal.rest,
    };
  }

  // 1-1. 진행률
  const progressData = {
    growthAchieved: progress?.growthAchieved ?? 0,
    restAchieved: progress?.restAchieved ?? 0,
  };

  // 2. 주간 캘린더 요약
  const days = weekly.map((stat) => {
    const schedules = Array.isArray(stat?.schedules) ? stat.schedules : [];
    return {
      date: stat?.date,
      hasItems: stat?.hasItems ?? false,
      todoCount: stat?.todoCount ?? schedules.length,
      schedules: schedules.map((s) => ({
        id: s.id,
        title: s.title,
        category: s.type === "FIXED" ? "FIXED" : (s.type || "TODO"),
      })),
    };
  });

  // 3. 오늘의 할 일
  const formatTime = (date) => (date ? new Date(date).toTimeString().slice(0, 5) : "00:00");

  const formattedTodos = todos.map((todo) => ({
    todoId: todo.id || todo.googleEventId,
    title: todo.title,
    category: todo.type === "FIXED" ? "FIXED" : (todo.type || "GROWTH"),
    scheduleTime: `${formatTime(todo.startAt)} - ${formatTime(todo.endAt)}`,
    completed: todo.status === "DONE",
  }));

  // 4. 추천 활동 (⚠️ 서버 필드명 recruit_end_date 확인 필수)
  const formattedRecommendations = recs.map((rec) => {
    // recruit_end_date를 이용해 dDay를 계산하는 로직이 서비스단에 없다면 여기서 처리하거나,
    // 서비스단에서 이미 'dDay'라는 키로 계산해서 넘겨줬는지 확인해야 합니다.
    return {
      activityId: rec.id,
      title: rec.title,
      subTitle: rec.organizer || "", // 스키마에는 organizer로 되어 있습니다.
      // 서비스에서 계산된 dDay가 없다면 rec.recruit_end_date를 직접 내려주거나 계산 로직 필요
      dDay: rec.dDay || "마감임박",
      imageUrl: rec.thumbnailUrl || "", // 스키마에는 thumbnailUrl (또는 @map 된 필드)
      tags: Array.isArray(rec.tags) ? rec.tags : [],
    };
  });

  return {
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