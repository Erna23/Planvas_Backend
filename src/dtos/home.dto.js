const safeArray = (v) => (Array.isArray(v) ? v : []);

const safeDate = (v) => {
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatYMD = (v) => {
  const d = safeDate(v);
  return d ? d.toISOString().split("T")[0] : null;
};

const formatTime = (v) => {
  const d = safeDate(v);
  return d ? d.toTimeString().slice(0, 5) : "00:00";
};

export const homeResponseDTO = (goalStatus, goal, progress, weeklyStats, todayTodos, recommendations) => {
  const weekly = safeArray(weeklyStats);
  const todos = safeArray(todayTodos);
  const recs = safeArray(recommendations);

  let currentGoal = null;
  if (goal) {
    const now = new Date();
    const end = safeDate(goal.endDate);

    const now0 = new Date(now); now0.setHours(0, 0, 0, 0);
    const end0 = end ? new Date(end) : null;
    if (end0) end0.setHours(0, 0, 0, 0);

    const diffTime = end0 ? (end0 - now0) : 0;
    const dDayValue = end0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : null;

    currentGoal = {
      goalId: goal.id,
      title: goal.title,
      startDate: formatYMD(goal.startDate),
      endDate: formatYMD(goal.endDate),
      dDay: dDayValue,
      growthRatio: goal.growth,
      restRatio: goal.rest,
    };
  }

  const progressData = {
    growthAchieved: progress?.growthAchieved ?? 0,
    restAchieved: progress?.restAchieved ?? 0,
  };

  const days = weekly.map((stat) => {
    const schedules = safeArray(stat?.schedules);

    return {
      date: stat?.date ?? null,
      hasItems: schedules.length > 0,
      todoCount: schedules.length,
      schedules: schedules.map((s) => ({
        id: s?.id ?? null,
        title: s?.title ?? "제목 없음",
        category: s?.type === "FIXED" ? "FIXED" : (s?.type ?? "GROWTH"),
      })),
    };
  });

  const formattedTodos = todos.map((todo) => ({
    todoId: todo?.id ?? todo?.googleEventId ?? null,
    title: todo?.title ?? "제목 없음",
    category: todo?.type === "FIXED" ? "FIXED" : (todo?.type ?? "GROWTH"),
    scheduleTime: `${formatTime(todo?.startAt)} - ${formatTime(todo?.endAt)}`,
    completed: todo?.status === "DONE",
  }));

  const formattedRecommendations = recs.map((rec) => ({
    activityId: rec?.id ?? null,
    title: rec?.title ?? "제목 없음",
    subTitle: rec?.subTitle ?? "",
    dDay: rec?.dDay ?? null,
    imageUrl: rec?.imageUrl ?? null,
    tags: safeArray(rec?.tags),
  }));

  return {
    goalStatus,
    currentGoal,
    progress: progressData,
    weeklySummary: {
      weekStartDate: days[0]?.date ?? new Date().toISOString().split("T")[0],
      days,
    },
    todayTodos: formattedTodos,
    recommendations: formattedRecommendations,
  };
};
