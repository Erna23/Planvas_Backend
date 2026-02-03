/**
 * 시간 포맷 변환 (Date -> "HH:mm")
 * - 수정사항: "2024-01-25" 처럼 날짜만 있는 경우(종일 일정) 시간 파싱 에러 방지
 */
const formatTime = (date) => {
    if (!date) return "00:00"; 
    
    // Date 객체가 아니라 문자열로 들어올 수도 있음
    const d = new Date(date);
    
    // 유효하지 않은 날짜(Invalid Date)인 경우 처리
    if (isNaN(d.getTime())) return "00:00";

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
};

/**
 * [Response DTO]
 * 1. 일간 상세 조회용 (명세서 포맷 준수: itemId, startTime 등)
 */
export const calendarDayDetailResponseDTO = (events, dateStr) => {
    const items = events.map((event) => {
        // 타입 매핑
        let type = "MY_ACTIVITY";
        // DB 데이터(FIXED)이거나, 구글 ID가 있으면 구글 연동 일정으로 간주
        if (event.type === "FIXED" || event.googleEventId) {
            type = "FIXED_SCHEDULE";
        }

        // 시간 추출 (DB 데이터 우선, 없으면 구글 데이터)
        const startVal = event.startAt || event.start?.dateTime || event.start?.date;
        const endVal = event.endAt || event.end?.dateTime || event.end?.date;

        return {
            itemId: String(event.id || event.googleEventId),
            type: type,
            title: event.title || event.summary || "제목 없음",
            startTime: formatTime(startVal),
            endTime: formatTime(endVal),
            completed: event.status === "DONE", // DB 데이터 기준 완료 여부
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
    
    // 1. 날짜별 일정 개수를 미리 세어둡니다. (속도 향상)
    const countMap = {};
    
    events.forEach((event) => {
        const dateObj = new Date(event.startAt);
        // UTC 시간 보정을 위해 로컬 날짜 문자열로 변환 (YYYY-MM-DD)
        const dateKey = dateObj.toISOString().split('T')[0]; 
        
        // 날짜 키가 해당 월인지 확인
        // (DB 쿼리에서 이미 걸러져 오겠지만, 한 번 더 안전하게 체크)
        if (dateObj.getMonth() + 1 === parseInt(month)) {
             // 주의: ISOString은 UTC 기준이므로, 실제 서비스 시에는 
             // timezone offset을 고려하거나 getFullYear/Month/Date 사용 권장
             // 여기서는 간단하게 기존 로직 유지하되 map 방식 적용:
             const y = dateObj.getFullYear();
             const m = String(dateObj.getMonth() + 1).padStart(2, "0");
             const d = String(dateObj.getDate()).padStart(2, "0");
             const localDateKey = `${y}-${m}-${d}`;

             countMap[localDateKey] = (countMap[localDateKey] || 0) + 1;
        }
    });

    const days = [];

    // 2. 1일부터 말일까지 돌면서 Map에서 개수만 쏙 꺼냅니다.
    for (let i = 1; i <= lastDay; i++) {
        const dayString = String(i).padStart(2, "0");
        const monthString = String(month).padStart(2, "0");
        const dateStr = `${year}-${monthString}-${dayString}`;

        const count = countMap[dateStr] || 0;

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
        // 주의: 구글 미리보기 데이터(Raw)는 status가 'confirmed' 등으로 옴.
        // DB 데이터가 아닐 경우 isDone은 항상 false가 됨
        isDone: event.status === 'DONE', 
        type: event.type || "GOOGLE",
    }));
};