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

// ISO 8601 문자열 변환 (클라이언트 표준)
const toIsoString = (v) => {
    const d = toDate(v);
    return d ? d.toISOString() : null;
};

/**
 * 1) 일간 상세 조회 DTO
 * 경로: GET /api/calendar/day
 * 반영사항: eventColor, recurrenceRule 추가
 */
export const calendarDayDetailResponseDTO = (events, dateStr) => {
    const items = (events ?? []).map((event) => {
        const type = event.type || (event.googleEventId ? "GOOGLE" : "MANUAL");

        // DB 필드와 구글 API 필드 방어적 추출
        const startVal = event.startAt ?? event.start?.dateTime ?? event.start?.date ?? null;
        const endVal = event.endAt ?? event.end?.dateTime ?? event.end?.date ?? null;

        return {
            itemId: String(event.id ?? event.googleEventId),
            title: event.title ?? event.summary ?? "제목 없음",
            startAt: toIsoString(startVal),
            endAt: toIsoString(endVal),
            isFixed: isFixedType(type),
            type,
            eventColor: event.eventColor ?? 1,      // ✅ 색상 추가 (기본값 1)
            recurrenceRule: event.recurrenceRule ?? null // ✅ 반복 규칙 추가
        };
    });

    return { date: dateStr, items };
};

/**
 * 2) 월간 조회 DTO (캘린더 뷰 메인)
 * 경로: GET /api/calendar/month
 * 반영사항: 프리뷰에 eventColor 포함
 */
export const calendarMonthResponseDTO = (events, year, month, previewLimit = 3) => {
    const y = Number(year);
    const m = Number(month);

    const monthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    const lastDay = new Date(y, m, 0).getDate();

    const map = {};
    const ensure = (dateKey) => {
        if (!map[dateKey]) map[dateKey] = { count: 0, previews: [] };
        return map[dateKey];
    };

    for (const event of events ?? []) {
        const startAt = toDate(event.startAt);
        const endAt = toDate(event.endAt);
        if (!startAt || !endAt) continue;

        // 월 범위 클램핑
        const rangeStart = startAt > monthStart ? startAt : monthStart;
        const rangeEnd = endAt < monthEnd ? endAt : monthEnd;

        let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0, 0);
        const endCursor = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 0, 0, 0, 0);

        const title = event.title ?? "제목 없음";
        const type = event.type || (event.googleEventId ? "GOOGLE" : "MANUAL");
        const fixed = isFixedType(type);
        const itemId = String(event.id ?? event.googleEventId);
        const eventColor = event.eventColor ?? 1;

        while (cursor <= endCursor) {
            if (cursor.getFullYear() === y && cursor.getMonth() === m - 1) {
                const dateKey = toLocalDateKey(cursor);
                const bucket = ensure(dateKey);

                bucket.count += 1;
                if (bucket.previews.length < previewLimit) {
                    bucket.previews.push({
                        itemId,
                        title,
                        isFixed: fixed,
                        type,
                        eventColor // ✅ 프리뷰 바 색상 결정을 위해 추가
                    });
                }
            }
            cursor.setDate(cursor.getDate() + 1);
        }
    }

    const days = [];
    for (let i = 1; i <= lastDay; i++) {
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
        const bucket = map[dateStr];
        const itemCount = bucket?.count ?? 0;
        const schedulesPreview = bucket?.previews ?? [];

        days.push({
            date: dateStr,
            hasItems: itemCount > 0,
            itemCount,
            schedulesPreview,
            moreCount: Math.max(0, itemCount - schedulesPreview.length),
        });
    }

    return { year: y, month: m, days };
};

/**
 * 3) 구글 일정 미리보기 DTO
 */
export const calendarResponseDTO = (events) => {
    return (events ?? []).map((event) => ({
        id: event.id,
        title: event.summary ?? "제목 없음",
    }));
};