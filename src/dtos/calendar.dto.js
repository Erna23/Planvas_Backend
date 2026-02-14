/**
 * 로컬 기준 YYYY-MM-DD 키 생성
 */
const toLocalDateKey = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

// 고정 여부 판별: FIXED 타입만 True
const isFixedType = (type) => type === "FIXED";

// 안전한 Date 객체 변환
const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

// ISO 8601 문자열 변환
const toIsoString = (v) => {
    const d = toDate(v);
    return d ? d.toISOString() : null;
};

/**
 * 1) 일간 상세 조회 DTO
 */
export const calendarDayDetailResponseDTO = (events, dateStr) => {
    const items = (events ?? []).map((event) => {
        const type = event.type || (event.googleEventId ? "GOOGLE" : "MANUAL");

        // DB 컬럼명(snake_case)과 DTO 필드명(camelCase) 혼용 방지
        const startVal = event.startAt ?? event.start_at ?? event.start?.dateTime ?? event.start?.date ?? null;
        const endVal = event.endAt ?? event.end_at ?? event.end?.dateTime ?? event.end?.date ?? null;

        return {
            itemId: String(event.id ?? event.googleEventId),
            title: event.title ?? event.summary ?? "제목 없음",
            startAt: toIsoString(startVal),
            endAt: toIsoString(endVal),
            isFixed: isFixedType(type),
            category: event.category ?? "GROWTH",
            status: event.status ?? "TODO",
            type,
            eventColor: event.eventColor ?? event.event_color ?? 1,
            recurrenceRule: event.recurrenceRule ?? event.recurrence_rule ?? null
        };
    });

    return {
        date: dateStr,
        todayTodos: items
    };
};

/**
 * 2) 월간 조회 DTO (캘린더 뷰 메인)
 */
export const calendarMonthResponseDTO = (events, year, month, previewLimit = 3) => {
    const y = parseInt(year);
    const m = parseInt(month);
    const dayMap = new Map();

    const ensure = (dateKey) => {
        if (!dayMap.has(dateKey)) {
            dayMap.set(dateKey, {
                date: dateKey,
                hasItems: true,
                itemCount: 0,
                schedulesPreview: [],
                moreCount: 0
            });
        }
        return dayMap.get(dateKey);
    };

    for (const event of events ?? []) {
        const itemId = String(event.id ?? event.googleEventId);
        const title = event.title ?? event.summary ?? "제목 없음";
        const type = event.type ?? "MANUAL";
        const fixed = isFixedType(type);

        // ReferenceError 해결: cursor 변수 초기화
        // DB 필드명이 start_at일 수도 있으므로 둘 다 체크
        let startVal = event.start_at ?? event.startAt;
        let endVal = event.end_at ?? event.endAt ?? startVal;

        let cursor = new Date(startVal);
        const endCursor = new Date(endVal);

        while (cursor <= endCursor) {
            if (cursor.getFullYear() === y && cursor.getMonth() === m - 1) {
                const dateKey = toLocalDateKey(cursor);
                const bucket = ensure(dateKey);

                bucket.itemCount += 1;

                if (bucket.schedulesPreview.length < previewLimit) {
                    bucket.schedulesPreview.push({
                        itemId,
                        title,
                        isFixed: fixed,
                        type,
                        eventColor: event.eventColor ?? event.event_color ?? 1,
                        recurrenceRule: event.recurrenceRule ?? event.recurrence_rule ?? null
                    });
                } else {
                    bucket.moreCount = bucket.itemCount - previewLimit;
                }
            }
            cursor.setDate(cursor.getDate() + 1);
            if (cursor > new Date(new Date(startVal).setFullYear(y + 1))) break;
        }
    }

    return {
        year: y,
        month: m,
        days: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    };
};

/**
 * 3) 기본 일정 응답 DTO (필요시 사용)
 * 컨트롤러에서 이 이름을 가져다 쓰고 있으므로 반드시 export가 필요합니다.
 */
export const calendarResponseDTO = (events) => {
    return (events ?? []).map((event) => ({
        id: event.id,
        title: event.title ?? event.summary ?? "제목 없음",
    }));
};