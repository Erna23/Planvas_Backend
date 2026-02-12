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
 * 수정사항: eventColor, recurrenceRule을 DB에서 직접 참조하지 않고 기본값 처리
 */
export const calendarDayDetailResponseDTO = (events, dateStr) => {
    const items = (events ?? []).map((event) => {
        const type = event.type || (event.googleEventId ? "GOOGLE" : "MANUAL");

        const startVal = event.startAt ?? event.start?.dateTime ?? event.start?.date ?? null;
        const endVal = event.endAt ?? event.end?.dateTime ?? event.end?.date ?? null;

        return {
            itemId: String(event.id ?? event.googleEventId),
            title: event.title ?? event.summary ?? "제목 없음",
            startAt: toIsoString(startVal),
            endAt: toIsoString(endVal),
            isFixed: isFixedType(type),
            type,
            // ✅ DB 필드가 없을 수 있으므로 기본값 1 고정
            eventColor: 1,
            // ✅ DB 필드가 없을 수 있으므로 null 고정
            recurrenceRule: null
        };
    });

    return { date: dateStr, items };
};

/**
 * 2) 월간 조회 DTO (캘린더 뷰 메인)
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

        const rangeStart = startAt > monthStart ? startAt : monthStart;
        const rangeEnd = endAt < monthEnd ? endAt : monthEnd;

        let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 0, 0, 0, 0);
        const endCursor = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 0, 0, 0, 0);

        const title = event.title ?? "제목 없음";
        const type = event.type || (event.googleEventId ? "GOOGLE" : "MANUAL");
        const fixed = isFixedType(type);
        const itemId = String(event.id ?? event.googleEventId);

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
                        // ✅ 프리뷰에서도 기본값 사용
                        eventColor: 1
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

export const calendarResponseDTO = (events) => {
    return (events ?? []).map((event) => ({
        id: event.id,
        title: event.summary ?? "제목 없음",
    }));
};