export function toGoalReportDto(report, goal, recommend) {
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
                growthRatio: report.growth,
                restRatio: report.rest
            }
        },
        summary: {
            type: report.type,
            title: report.title,
            subTitle: report.subTitle
        },
        cta:{
            primary:{
                type: "RECOMMEND",
                focus: recommend.focus,
                label: recommend.text
            },
            secondary: {
                type: "SET_NEXT_GOAL",
                label: "다음 목표 기간 설정하러 가기"
            }
        }
    }
}