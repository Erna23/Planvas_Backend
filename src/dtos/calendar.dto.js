/**
 * 로컬 기준 YYYY-MM-DD 키
 */
const toLocalDateKey = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

// 고정 여부: FIXED만 고정으로 취급
const isFixedType = (type) => type === "FIXED";

// 안전한 Date 변환
const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

// ISO 문자열(스웨거 예시 형식에 맞게). invalid면 null
const toIsoString = (v) => {
    const d = toDate(v);
    return d ? d.toISOString() : null;
};

/**
 * 1) 일간 상세 조회 DTO (Swagger 정합)
 * success: { date, items: [{itemId,title,startAt,endAt,isFixed,type}] }
 */
export const calendarDayDetailResponseDTO = (events, dateStr) => {
    const items = (events ?? []).map((event) => {
        const type = event.type || (event.googleEventId ? "GOOGLE" : "MANUAL");

        // DB(UserActivity)는 startAt/endAt, 구글 원본은 start/end일 수 있어 방어
        const startVal = event.startAt ?? event.start?.dateTime ?? event.start?.date ?? null;
        const endVal = event.endAt ?? event.end?.dateTime ?? event.end?.date ?? null;

        return {
            itemId: String(event.id ?? event.googleEventId),
            title: event.title ?? event.summary ?? "제목 없음",
            startAt: toIsoString(startVal),
            endAt: toIsoString(endVal),
            isFixed: isFixedType(type),
            type,
        };
    });

    return { date: dateStr, items };
};

/**
 * 2) 월간 조회 DTO (Swagger 정합)
 * success: { year, month, days:[{date,hasItems,itemCount,schedulesPreview,moreCount}] }
 *
 * - "겹치는 일정"도 날짜별로 분배
 * - schedulesPreview: [{itemId,title,isFixed,type}]
 */
export const calendarMonthResponseDTO = (events, year, month, previewLimit = 3) => {
    const y = Number(year);
    const m = Number(month);

    const monthStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    const lastDay = new Date(y, m, 0).getDate();

    // { "YYYY-MM-DD": { count, previews[] } }
    const map = {};
    const ensure = (dateKey) => {
        if (!map[dateKey]) map[dateKey] = { count: 0, previews: [] };
        return map[dateKey];
    };

    for (const event of events ?? []) {
        const startAt = toDate(event.startAt);
        const endAt = toDate(event.endAt);
        if (!startAt || !endAt) continue;

        // 월 범위와 겹치는 구간으로 클램프
        const rangeStart = startAt > monthStart ? startAt : monthStart;
        const rangeEnd = endAt < monthEnd ? endAt : monthEnd;

        // 날짜 단위 순회(로컬 자정)
        let cursor = new Date(
            rangeStart.getFullYear(),
            rangeStart.getMonth(),
            rangeStart.getDate(),
            0, 0, 0, 0
        );
        const endCursor = new Date(
            rangeEnd.getFullYear(),
            rangeEnd.getMonth(),
            rangeEnd.getDate(),
            0, 0, 0, 0
        );

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
                    bucket.previews.push({ itemId, title, isFixed: fixed, type });
                }
            }
            cursor.setDate(cursor.getDate() + 1);
        }
    }

    const days = [];
    for (let i = 1; i <= lastDay; i++) {
        const dayString = String(i).padStart(2, "0");
        const monthString = String(m).padStart(2, "0");
        const dateStr = `${y}-${monthString}-${dayString}`;

        const bucket = map[dateStr];
        const itemCount = bucket?.count ?? 0;
        const schedulesPreview = bucket?.previews ?? [];
        const moreCount = Math.max(0, itemCount - schedulesPreview.length);

        days.push({
            date: dateStr,
            hasItems: itemCount > 0,
            itemCount,
            schedulesPreview,
            moreCount,
        });
    }

    return { year: y, month: m, days };
};

/**
 * 3) 구글 일정 미리보기 DTO (Swagger 정합)
 * success: { events: [{id, title}] }
 */
export const calendarResponseDTO = (events) => {
    return (events ?? []).map((event) => ({
        id: event.id,
        title: event.summary ?? "제목 없음",
    }));
};
