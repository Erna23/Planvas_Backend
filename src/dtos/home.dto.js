export const homeResponseDTO = (goal, progress, weeklyStats, todayTodos, recommendations) => {
  // 1. 현재 목표 (currentGoal)
  let currentGoal = null;
  let progressData = null;

  if (goal) {
    const now = new Date();
    const end = new Date(goal.endDate);

    // 시간대 무시하고 날짜 차이만 계산
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

    // 2. 진행률 매핑
    progressData = {
      growthAchieved: progress.growth, // 실제 완료 개수
      restAchieved: progress.rest      // 실제 완료 개수
    };
  }

  // 3. 주간 요약 (캘린더 점 표시용)
  const days = weeklyStats.map(stat => ({
    date: stat.date,
    hasItems: stat.schedules.length > 0,
    todoCount: stat.schedules.length,
    // 캘린더에 표시할 일정 리스트 (id, title, category)
    schedules: stat.schedules.map(s => ({
      id: s.id,
      title: s.title,
      category: s.type === "FIXED" ? "FIXED" : (s.type || "GROWTH")
    }))
  }));

  // 4. 오늘의 할 일 (시간 포맷 추가)
  const formatTime = (date) => {
    return new Date(date).toTimeString().slice(0, 5); // "18:00" 형식 추출
  };

  const formattedTodos = todayTodos.map(todo => ({
    todoId: todo.id || todo.googleEventId,
    title: todo.title,
    category: todo.type === "FIXED" ? "FIXED" : (todo.type || "GROWTH"),
    scheduleTime: `${formatTime(todo.startAt)} - ${formatTime(todo.endAt)}`, // [추가] 화면 표시용 시간
    completed: todo.status === "DONE"
  }));

  // 5. [중요] 추천 활동 (Service 리턴값과 맞춤)
  const formattedRecommendations = recommendations.map(rec => ({
    activityId: rec.id,
    title: rec.title,
    subTitle: rec.subTitle, // 주최사 (예: SK하이닉스)
    dDay: rec.dDay,         // D-Day (예: "D-5" or "마감")
    imageUrl: rec.imageUrl, // 썸네일 이미지 URL
    tags: rec.tags          // 태그 배열 (예: ["#대외활동", "#IT"])
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