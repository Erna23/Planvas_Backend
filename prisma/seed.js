import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('유저 4(서영) 데이터 삽입 프로세스 시작...');

  // 1. 유저 4번이 있는지 확인하고, 없으면 생성 (에러 방지용)
  // 이미 있다면 update 로직을 통해 이름이 '서영'으로 유지됩니다.
  const targetUser = await prisma.user.upsert({
    where: { id: 4 },
    update: { name: '서영' },
    create: {
      id: 4,
      email: 'seoyoung@example.com',
      name: '서영',
      provider: 'GOOGLE',
      oauthId: 'demo_seoyoung_04'
    },
  });

  console.log(`대상 유저 확인 완료: ${targetUser.name} (ID: ${targetUser.id})`);

  // 2. 기존 활동 데이터 삭제 (유저 4번의 데이터만 깔끔하게 새로 세팅)
  await prisma.userActivity.deleteMany({
    where: { userId: 4 }
  });
  console.log('유저 4의 기존 활동 데이터를 정리했습니다.');

  // 3. 홈 화면 기획안 기반 데이터 (고정 일정, 일반 일정, 할 일)
  const activityData = [
    // 고정 일정 (FIXED)
    { userId: 4, title: "카페 알바 (고정)", type: "FIXED", category: "GROWTH", startAt: "2026-02-12T18:00:00Z", endAt: "2026-02-12T22:00:00Z", eventColor: 1, status: "TODO" },
    { userId: 4, title: "데모데이 발표 세션", type: "FIXED", category: "GROWTH", startAt: "2026-02-12T14:00:00Z", endAt: "2026-02-12T15:30:00Z", eventColor: 10, status: "TODO" },

    // 일반 일정 (FIXED)
    { userId: 4, title: "방탈출 카페 (휴식)", type: "FIXED", category: "REST", startAt: "2026-02-12T17:00:00Z", endAt: "2026-02-12T18:00:00Z", eventColor: 2, status: "DONE" },

    // 할 일 (MANUAL)
    { userId: 4, title: "발표 대본 최종 암기", type: "MANUAL", category: "GROWTH", startAt: "2026-02-12T09:00:00Z", endAt: "2026-02-12T09:30:00Z", eventColor: 4, status: "TODO" },
    { userId: 4, title: "서버 로그 모니터링", type: "MANUAL", category: "GROWTH", startAt: "2026-02-12T10:00:00Z", endAt: "2026-02-12T10:30:00Z", eventColor: 5, status: "DONE" },
    { userId: 4, title: "팀 피드백 정리", type: "MANUAL", category: "GROWTH", startAt: "2026-02-12T16:00:00Z", endAt: "2026-02-12T16:30:00Z", eventColor: 6, status: "TODO" }
  ];

  // 4. 데이터 삽입
  for (const act of activityData) {
    await prisma.userActivity.create({
      data: {
        userId: act.userId,
        title: act.title,
        type: act.type,
        category: act.category,
        startAt: new Date(act.startAt),
        endAt: new Date(act.endAt),
        eventColor: act.eventColor,
        status: act.status
      }
    });
  }

  console.log('데모 데이터가 성공적으로 반영되었습니다!');
}

main()
  .catch((e) => {
    console.error('시드 작업 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });