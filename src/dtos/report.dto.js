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
            title: summary.msg.title,
            subTitle: summary.msg.subTitle
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
        title: "다음 시즌 더 선명한 성취를 위해 잠시 쉬어간 시즌이에요",
        subTitle: "성장과 휴식 모두 지키진 못했으나, 다음 시즌에는 더 나은 결과를 위해 노력해보는 건 어떠신가요?",
    },
    [SummaryType.GROWTH_LACK]: {
        title: "계획과는 조금 다르지만, 새로운 방향으로 나아갔던 기간이에요",
        subTitle: "의도했던 균형보다, 지금 내게 더 필요한 가치에 집중한 시간이에요",
    },
    [SummaryType.REST_LACK]: {
        title: "계획과는 조금 다르지만, 새로운 방향으로 나아갔던 기간이에요",
        subTitle: "의도했던 균형보다, 지금 내게 더 필요한 가치에 집중한 시간이에요",
    },
    [SummaryType.PERFECT]: {
        title: "바라는 모습 그대로, 일상을 완벽히 채워낸 기간이에요",
        subTitle: "성장과 휴식 모두 스스로 정한 기준을 성취로 바꿔낸 성공적인 시즌이네요!",
    },
}

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

