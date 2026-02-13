export function toGoalReportDto(goal, growth, rest, summary) {
    return {
        goal: {
            goalId: goal.id,
            title: goal.title,
            startDate: goal.startDate,
            endDate: goal.endDate
        },
        ratio: {
            target: {
                growthRatio: goal.growth,
                restRatio: goal.rest
            },
            actual: {
                growthRatio: growth,
                restRatio: rest
            }
        },
        summary: {
            type: summary.type,
            title: summary.msg?.title ?? "",
            subTitle: summary.msg?.subTitle ?? ""
        },
        cta: {
            primary: {
                type: "RECOMMEND",
                focus: summary.recommend.focus,
                label: summary.recommend.text
            },
            secondary: {
                type: "SET_NEXT_GOAL",
                label: "다음 목표 기간 설정하러 가기"
            }
        }
    }
}

const Recommend = {
    ALL: "ALL",
    GROWTH: "GROWTH",
    REST: "REST",
    NONE: "NONE",
};

const SummaryType = {
    ALL_LACK: "ALL_LACK",
    GROWTH_LACK: "GROWTH_LACK",
    REST_LACK: "REST_LACK",
    PERFECT: "PERFECT",
};

const SUMMARY_MESSAGE = {
    [SummaryType.ALL_LACK]: {
        title: "이번 주는 전체적으로 활동이 부족해요",
        subTitle: "성장/휴식 활동을 조금씩 추가해보는 건 어때요?",
    },
    [SummaryType.GROWTH_LACK]: {
        title: "성장 활동이 목표에 비해 부족해요",
        subTitle: "간단한 성장 활동부터 하나 추가해보세요!",
    },
    [SummaryType.REST_LACK]: {
        title: "휴식 활동이 목표에 비해 부족해요",
        subTitle: "컨디션을 위해 휴식도 일정에 넣어주세요 🙂",
    },
    [SummaryType.PERFECT]: {
        title: "목표에 아주 잘 맞게 진행 중이에요!",
        subTitle: "좋아요! 지금 페이스를 유지해보세요 🔥",
    },
};

export async function getSummaryDto(goal, actualGrowth, actualRest) {
    let recommend;
    let type;
    if (actualGrowth + actualRest < 50) {
        type = "ALL_LACK"
        recommend = {
            focus: Recommend.ALL,
            text: "새로운 활동 탐색하기"
        }
    } else if (goal.growth > goal.rest && actualGrowth / goal.growth * 100 < 40) {
        type = "GROWTH_LACK"
        recommend = {
            focus: Recommend.GROWTH,
            text: "새로운 성장 활동 탐색하기"
        }
    } else if (goal.rest > goal.growth && actualRest / goal.rest * 100 < 40) {
        type = "REST_LACK"
        recommend = {
            focus: Recommend.REST,
            text: "새로운 휴식 활동 탐색하기"
        }
    } else {
        type = "PERFECT"
        recommend = {
            focus: Recommend.NONE,
            text: "새로운 활동 탐색하기"
        }
    }

    return {
        type: type,
        msg: SUMMARY_MESSAGE[type],
        recommend: recommend
    }
}

