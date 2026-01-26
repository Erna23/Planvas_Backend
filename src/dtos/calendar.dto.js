/**
 * 시간 포맷 변환 (Date -> "HH:mm")
 */
const formatTime = (date) => {
  if (!date) return "00:00"; // 방어 코드
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

/**
 * [Response DTO]
 * 1. 일간 상세 조회용 (명세서 포맷 준수: itemId, startTime 등)
 * ★ 이 함수가 없어서 에러가 났던 것입니다!
 */
export const calendarDayDetailResponseDTO = (events, dateStr) => {
  const items = events.map((event) => {
    // 타입 매핑
    let type = "MY_ACTIVITY";
    if (event.type === "FIXED" || event.googleEventId) {
      type = "FIXED_SCHEDULE";
    }

    // 시간 추출 (DB 데이터 or 구글 데이터)
    const startVal = event.startAt || event.start?.dateTime || event.start?.date;
    const endVal = event.endAt || event.end?.dateTime || event.end?.date;

    return {
      itemId: String(event.id || event.googleEventId),
      type: type,
      title: event.title || event.summary || "제목 없음",
      startTime: formatTime(startVal),
      endTime: formatTime(endVal),
      completed: event.status === "DONE",
    };
  });

  return {
    date: dateStr,
    items: items,
  };
};

/**
 * [Response DTO]
 * 2. 월간 달력 조회용 (날짜별 일정 개수)
 */
export const calendarMonthResponseDTO = (events, year, month) => {
  const lastDay = new Date(year, month, 0).getDate();
  const days = [];

  for (let i = 1; i <= lastDay; i++) {
    const dayString = String(i).padStart(2, "0");
    const monthString = String(month).padStart(2, "0");
    const dateStr = `${year}-${monthString}-${dayString}`;

    const count = events.filter((event) => {
      const eventDate = new Date(event.startAt);
      return (
        eventDate.getFullYear() === parseInt(year) &&
        eventDate.getMonth() + 1 === parseInt(month) &&
        eventDate.getDate() === i
      );
    }).length;

    days.push({
      date: dateStr,
      hasItems: count > 0,
      itemCount: count,
    });
  }

  return { year: parseInt(year), month: parseInt(month), days: days };
};

/**
 * [Response DTO]
 * 3. 단순 목록 조회용 (미리보기 등)
 */
export const calendarResponseDTO = (events) => {
  return events.map((event) => ({
    id: event.id || event.googleEventId,
    title: event.title || event.summary || "제목 없음",
    start: event.startAt || (event.start?.dateTime || event.start?.date),
    end: event.endAt || (event.end?.dateTime || event.end?.date),
    isDone: event.status === 'DONE' ? true : false,
    type: event.type || "GOOGLE",
  }));
};