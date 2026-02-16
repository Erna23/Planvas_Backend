// src/services/scheduleOverlap.service.js

const GROWTH_STRICT_CATEGORY_IDS = new Set([102, 106]); // 교육/강연, 어학/자격증
const FLEXIBLE_KEYWORDS = ["상시", "예약제", "자유관람"];

const KOR_DAY_TO_JS = {
    "일": 0,
    "월": 1,
    "화": 2,
    "수": 3,
    "목": 4,
    "금": 5,
    "토": 6,
};

function parseDateOnlyToLocal(dateStr) {
  // "YYYY-MM-DD" => local Date(yyyy,mm-1,dd)
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

function hasAnyKeyword(text = "", keywords = []) {
    return keywords.some((k) => text.includes(k));
}

function toMin(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

function isIntervalOverlapped(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && aEnd >= bStart; // inclusive
}

function extractTimeLine(description = "") {
  // description 안에 "- 시간:" 라인 찾기
    const line = description
    .split("\n")
    .map((s) => s.trim())
    .find((s) => s.startsWith("- 시간:"));
    return line ? line.replace("- 시간:", "").trim() : "";
}

function parseDaysFromText(text = "") {
  // 예: "토, 일 10:00-15:00" / "매일 12:00-19:00" / "평일 09:00-18:00" / "주말 10:00-15:00"
    const days = new Set();

    if (!text) return days;

    if (text.includes("매일")) {
        [0, 1, 2, 3, 4, 5, 6].forEach((d) => days.add(d));
        return days;
    }
    if (text.includes("평일")) {
        [1, 2, 3, 4, 5].forEach((d) => days.add(d));
    }
    if (text.includes("주말")) {
        [0, 6].forEach((d) => days.add(d));
    }

  // "토, 일", "토요일", "일" 등
    for (const k of Object.keys(KOR_DAY_TO_JS)) {
        const re = new RegExp(`${k}(요일)?`, "g");
        if (re.test(text)) days.add(KOR_DAY_TO_JS[k]);
    }

    return days;
}

function parseTimeRange(text = "") {
  // "12:00-19:00" / "12:00~19:00" / "12:00 - 19:00"
    const m = text.match(/(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const start = `${m[1].padStart(2, "0")}:${m[2]}`;
    const end = `${m[3].padStart(2, "0")}:${m[4]}`;
    return { start, end };
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function clampRangeToDays(rangeStart, rangeEnd, maxDays = 400) {
  // 안전장치: 너무 긴 범위 루프 방지
    const days = Math.floor((startOfDay(rangeEnd) - startOfDay(rangeStart)) / (24 * 60 * 60 * 1000)) + 1;
    return Math.min(days, maxDays);
}

function parseRRule(rrule = "") {
  // "FREQ=DAILY;INTERVAL=1;BYDAY=MO,TU" 정도만 처리
    const parts = rrule.split(";").map((p) => p.trim()).filter(Boolean);
    const obj = {};
    for (const p of parts) {
        const [k, v] = p.split("=");
        if (!k || v == null) continue;
        obj[k] = v;
    }
    const freq = obj.FREQ || null;
    const interval = obj.INTERVAL ? Number(obj.INTERVAL) : 1;
    const byday = obj.BYDAY ? obj.BYDAY.split(",") : null; // ["MO","TU"]
    const until = obj.UNTIL ? obj.UNTIL : null; // (있으면 추후 확장)
    return { freq, interval, byday, until };
}

const RRULE_DAY_TO_JS = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };

function* generateOccurrencesWithinRange({ startAt, endAt, rrule, rangeStart, rangeEnd, maxOcc = 800 }) {
  // startAt/endAt의 "시간"을 유지하면서, range 내 발생 회차를 생성
    const rule = parseRRule(rrule);
    if (!rule.freq) return;

    const seed = new Date(startAt);
    const startTimeH = seed.getHours();
    const startTimeM = seed.getMinutes();

    const seedEnd = new Date(endAt);
    const endTimeH = seedEnd.getHours();
    const endTimeM = seedEnd.getMinutes();

    let produced = 0;

  // DAILY
    if (rule.freq === "DAILY") {
        const step = Math.max(1, rule.interval);
    // 발생 시작일을 rangeStart로 당겨서 시작
        let cur = startOfDay(seed);
    // cur를 rangeStart 이전이면 앞으로 이동
        while (cur < startOfDay(rangeStart)) cur = addDays(cur, step);

        while (cur <= rangeEnd && produced < maxOcc) {
            const occStart = new Date(cur);
            occStart.setHours(startTimeH, startTimeM, 0, 0);

            const occEnd = new Date(cur);
            occEnd.setHours(endTimeH, endTimeM, 0, 0);
            
            if (occEnd < occStart) occEnd.setDate(occEnd.getDate() + 1);

            if (isIntervalOverlapped(occStart, occEnd, rangeStart, rangeEnd)) {
                yield { occStart, occEnd };
                produced++;
            }
            cur = addDays(cur, step);
        }
        return;
    }

  // WEEKLY (BYDAY 없으면 seed 요일로)
    if (rule.freq === "WEEKLY") {
        const stepWeeks = Math.max(1, rule.interval);
        const byDays = (rule.byday && rule.byday.map((d) => RRULE_DAY_TO_JS[d]).filter((x) => x != null))
        || [seed.getDay()];

    // seed 주(week) 기준으로 rangeStart 주까지 이동
        let weekStart = startOfDay(seed);
    // weekStart를 seed가 속한 주의 일요일로 맞춤
        weekStart = addDays(weekStart, -weekStart.getDay());

    // rangeStart가 속한 주로 이동
        const rangeWeekStart = addDays(startOfDay(rangeStart), -startOfDay(rangeStart).getDay());
        while (weekStart < rangeWeekStart) weekStart = addDays(weekStart, stepWeeks * 7);

        while (weekStart <= rangeEnd && produced < maxOcc) {
            for (const wd of byDays) {
                const day = addDays(weekStart, wd);
                const occStart = new Date(day);
                occStart.setHours(startTimeH, startTimeM, 0, 0);

                const occEnd = new Date(day);
                occEnd.setHours(endTimeH, endTimeM, 0, 0);
                
                if (occEnd < occStart) occEnd.setDate(occEnd.getDate() + 1);
                
                if (isIntervalOverlapped(occStart, occEnd, rangeStart, rangeEnd)) {
                    yield { occStart, occEnd };
                    produced++;
                    if (produced >= maxOcc) return;
                }
            }
            weekStart = addDays(weekStart, stepWeeks * 7);
        }
    }
}

function activityNeedsStrictTimeCheck(activityCatalog) {
  // PM: "20점 관람만 시간까지 따져서 겹침"
  // 여기서는 "20점 + (요일/시간 파싱 가능) + (상시/예약제/자유관람 아님)" 인 경우만 strict 처리
    if (activityCatalog.tab !== "REST") return false;
    if (activityCatalog.point !== 20) return false;

    const desc = activityCatalog.description ?? "";
    if (hasAnyKeyword(desc, FLEXIBLE_KEYWORDS)) return false;

    const timeLine = extractTimeLine(desc);
    const days = parseDaysFromText(timeLine);
    const timeRange = parseTimeRange(timeLine);

    return days.size > 0 && !!timeRange;
}

function evaluateRestStatus({ activityCatalog, fixedSchedules, rangeStart, rangeEnd }) {
  // 10점은 무조건 가능
    if (activityCatalog.point === 10) {
        return { status: "AVAILABLE", reason: "휴식 10점은 시간 조절 가능" };
    }

    const desc = activityCatalog.description ?? "";

  // 상시/예약제/자유관람 키워드 포함이면 가능
    if (hasAnyKeyword(desc, FLEXIBLE_KEYWORDS)) {
        return { status: "AVAILABLE", reason: "상시/예약제/자유관람은 참여 시간 선택 가능" };
    }

  // 20점 관람만 strict time check
    if (activityCatalog.point === 20 && activityNeedsStrictTimeCheck(activityCatalog)) {
        const timeLine = extractTimeLine(desc);
        const days = parseDaysFromText(timeLine);         // Set(jsDay)
        const timeRange = parseTimeRange(timeLine);       // {start,end}

    // 고정일정(단발 + 반복)을 range 안에서 발생 회차로 보고 충돌 탐지
    for (const s of fixedSchedules) {
        const baseStart = new Date(s.startAt);
        const baseEnd = new Date(s.endAt);
        
        if (!s.recurrenceRule) {
        // 단발/기간 일정: 그 구간과 "해당 요일의 활동 시간창"이 겹치는지 검사
            const overlapDays = clampRangeToDays(
                new Date(Math.max(rangeStart.getTime(), baseStart.getTime())),
                new Date(Math.min(rangeEnd.getTime(), baseEnd.getTime())),
                400
            );

        let cursor = startOfDay(new Date(Math.max(rangeStart.getTime(), baseStart.getTime())));
        for (let i = 0; i < overlapDays; i++) {
            const wd = cursor.getDay();
            if (days.has(wd)) {
                const actStart = new Date(cursor);
                actStart.setHours(Number(timeRange.start.slice(0, 2)), Number(timeRange.start.slice(3, 5)), 0, 0);
                const actEnd = new Date(cursor);
                actEnd.setHours(Number(timeRange.end.slice(0, 2)), Number(timeRange.end.slice(3, 5)), 0, 0);
                if (actEnd < actStart) actEnd.setDate(actEnd.getDate() + 1);

                if (isIntervalOverlapped(actStart, actEnd, baseStart, baseEnd)) {
                    return { status: "CONFLICT", reason: "휴식 20점 관람: 요일&시간 겹침", conflictScheduleId: s.id };
                }
            }
            cursor = addDays(cursor, 1);
            if (cursor > rangeEnd) break;
        }
        continue;
    }

      // 반복 일정
    for (const { occStart, occEnd } of generateOccurrencesWithinRange({
        startAt: baseStart,
        endAt: baseEnd,
        rrule: s.recurrenceRule,
        rangeStart,
        rangeEnd,
        maxOcc: 800,
    })) {
        // 발생 회차의 날짜 기준으로 활동 시간창 만들어서 비교
        const dayCursor = startOfDay(occStart);
        const wd = dayCursor.getDay();
        if (!days.has(wd)) continue;

        const actStart = new Date(dayCursor);
        actStart.setHours(Number(timeRange.start.slice(0, 2)), Number(timeRange.start.slice(3, 5)), 0, 0);
        const actEnd = new Date(dayCursor);
        actEnd.setHours(Number(timeRange.end.slice(0, 2)), Number(timeRange.end.slice(3, 5)), 0, 0);
        if (actEnd < actStart) actEnd.setDate(actEnd.getDate() + 1);

        if (isIntervalOverlapped(actStart, actEnd, occStart, occEnd)) {
            return { status: "CONFLICT", reason: "휴식 20점 관람: 요일&시간 겹침(반복일정)", conflictScheduleId: s.id };
        }
    }
    }

    return { status: "AVAILABLE", reason: "휴식 20점 관람: 요일&시간 동시 겹침 없음" };
}

  // 나머지 휴식은 주의
    return { status: "CAUTION", reason: "휴식(10/상시/예약제/자유관람/관람20 strict 제외): 기간 내 고정 일정 존재" };
}

function evaluateGrowthStatus(activityCatalog) {
    if (GROWTH_STRICT_CATEGORY_IDS.has(activityCatalog.categoryId)) {
        return { status: "CONFLICT", reason: "성장(교육/강연, 어학/자격증)은 시간 조절 불가" };
    }
    return { status: "CAUTION", reason: "성장(기타/30점 포함): 기간 내 고정 일정 존재 → 주의" };
}

export async function fetchFixedSchedulesInRange({ prisma, userId, rangeStart, rangeEnd }) {
    return prisma.userActivity.findMany({
        where: {
        userId,
        type: { in: ["FIXED", "MANUAL"] },
        OR: [
            { recurrenceRule: { not: null }, startAt: { lte: rangeEnd } },
            { recurrenceRule: null, startAt: { lte: rangeEnd }, endAt: { gte: rangeStart } },
        ],
    },
    select: { id: true, startAt: true, endAt: true, type: true, recurrenceRule: true },
    });
}

/**
 * 메인 판정 함수
 */
export async function decideScheduleStatus({ prisma, userId, activityCatalog, startDate, endDate, fixedSchedules }) {
    const s = typeof startDate === "string" ? parseDateOnlyToLocal(startDate) : new Date(startDate);
    const e = typeof endDate === "string" ? parseDateOnlyToLocal(endDate) : new Date(endDate);

    const rangeStart = startOfDay(s);
    const rangeEnd = endOfDay(e);

    const schedules = fixedSchedules
    ? filterSchedulesByRange(fixedSchedules, rangeStart, rangeEnd)
    : await fetchFixedSchedulesInRange({ prisma, userId, rangeStart, rangeEnd });

    if (schedules.length === 0) {
        return { status: "AVAILABLE", reason: "기간이 전혀 겹치지 않음" };
    }

    if (activityCatalog.tab === "REST") {
        return evaluateRestStatus({ activityCatalog, fixedSchedules: schedules, rangeStart, rangeEnd });
    }
    if (activityCatalog.tab === "GROWTH") {
    return evaluateGrowthStatus(activityCatalog);
    }
    return { status: "CAUTION", reason: "알 수 없는 탭 → 주의" };
}
function filterSchedulesByRange(schedules, rangeStart, rangeEnd) {
    return (schedules ?? []).filter((s) => {
        const sStart = new Date(s.startAt);

    // 반복 일정: 시작이 rangeEnd 이전이면 range 내 발생 가능성(=generateOccurrences로 확인 가능)
        if (s.recurrenceRule) return sStart <= rangeEnd;

    // 단발/기간 일정: 구간이 겹칠 때만
        const sEnd = new Date(s.endAt);
        return sStart <= rangeEnd && sEnd >= rangeStart;
    });
}
