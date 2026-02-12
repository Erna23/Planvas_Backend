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
 * 수정사항: DB에서 가져온 실제 eventColor와 recurrenceRule을 반환합니다.
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
            // ✅ DB 필드의 실제 값을 반환하되, 없을 경우만 기본값 처리
            eventColor: event.eventColor ?? 1,
            recurrenceRule: event.recurrenceRule ?? null
        };
    });

    return { date: dateStr, items };
};

/**
 * 2) 월간 조회 DTO (캘린더 뷰 메인)
 */
export const calendarMonthResponseDTO = (events, year, month, previewLimit = 3) => {
    // ... (상단 로직 동일)

    for (const event of events ?? []) {
        // ... (중간 로직 동일)

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
                        // ✅ 프리뷰에서도 DB에 저장된 실제 색상 인덱스 반환
                        eventColor: event.eventColor ?? 1
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