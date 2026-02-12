import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // --- 1. 유저 1 데이터 (활동 + 목표) ---
  console.log('유저 1 데이터 삽입 중...');

  // 기존 활동 삭제
  await prisma.userActivity.deleteMany({ where: { userId: 1 } });

  // 유저 1의 목표 (GoalPeriod) - ID 중복 방지를 위해 upsert 사용
  await prisma.goalPeriod.upsert({
    where: { id: 1 }, // 유저 1의 목표 ID를 1로 가정
    update: { title: "유저 1의 갓생 살기", startDate: new Date("2026-02-01"), endDate: new Date("2026-02-28") },
    create: {
      id: 1,
      userId: 1,
      title: "유저 1의 갓생 살기",
      startDate: new Date("2026-02-01T00:00:00Z"),
      endDate: new Date("2026-02-28T23:59:59Z"),
      growth: 70,
      rest: 30,
      presetType: "CUSTOM"
    }
  });

  const activityDataUser1 = [
    { userId: 1, title: "오전 운동 (유저1)", type: "FIXED", category: "GROWTH", startAt: new Date("2026-02-12T07:00:00Z"), endAt: new Date("2026-02-12T08:30:00Z"), eventColor: 3, status: "DONE" },
    { userId: 1, title: "팀 프로젝트 회의 (유저1)", type: "FIXED", category: "GROWTH", startAt: new Date("2026-02-12T13:00:00Z"), endAt: new Date("2026-02-12T15:00:00Z"), eventColor: 7, status: "TODO" },
    { userId: 1, title: "독서하기 (유저1)", type: "MANUAL", category: "GROWTH", startAt: new Date("2026-02-12T21:00:00Z"), endAt: new Date("2026-02-12T22:00:00Z"), eventColor: 8, status: "TODO" }
  ];

  for (const act of activityDataUser1) {
    await prisma.userActivity.create({ data: act });
  }
  console.log('유저 1 반영 완료');

  // --- 2. 유저 4 데이터 (유저 생성 + 활동 + 목표) ---
  console.log('유저 4(서영) 데이터 삽입 프로세스 시작...');

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

  // 유저 4의 목표 (ID 충복 방지를 위해 ID 4번으로 지정)
  await prisma.goalPeriod.upsert({
    where: { id: 4 },
    update: { title: "데모데이 성공하기" },
    create: {
      id: 4,
      userId: 4,
      title: "데모데이 성공하기",
      startDate: new Date("2026-02-01T00:00:00Z"),
      endDate: new Date("2026-02-28T23:59:59Z"),
      growth: 80,
      rest: 20,
      presetType: "CUSTOM"
    }
  });

  await prisma.userActivity.deleteMany({ where: { userId: 4 } });

  const activityDataUser4 = [
    { userId: 4, title: "카페 알바 (고정)", type: "FIXED", category: "GROWTH", startAt: new Date("2026-02-12T18:00:00Z"), endAt: new Date("2026-02-12T22:00:00Z"), eventColor: 1, status: "TODO" },
    { userId: 4, title: "데모데이 발표 세션", type: "FIXED", category: "GROWTH", startAt: new Date("2026-02-12T14:00:00Z"), endAt: new Date("2026-02-12T15:30:00Z"), eventColor: 10, status: "TODO" },
    { userId: 4, title: "방탈출 카페 (휴식)", type: "FIXED", category: "REST", startAt: new Date("2026-02-12T17:00:00Z"), endAt: new Date("2026-02-12T18:00:00Z"), eventColor: 2, status: "DONE" },
    { userId: 4, title: "발표 대본 최종 암기", type: "MANUAL", category: "GROWTH", startAt: new Date("2026-02-12T09:00:00Z"), endAt: new Date("2026-02-12T09:30:00Z"), eventColor: 4, status: "TODO" },
    { userId: 4, title: "서버 로그 모니터링", type: "MANUAL", category: "GROWTH", startAt: new Date("2026-02-12T10:00:00Z"), endAt: new Date("2026-02-12T10:30:00Z"), eventColor: 5, status: "DONE" },
    { userId: 4, title: "팀 피드백 정리", type: "MANUAL", category: "GROWTH", startAt: new Date("2026-02-12T16:00:00Z"), endAt: new Date("2026-02-12T16:30:00Z"), eventColor: 6, status: "TODO" }
  ];

  for (const act of activityDataUser4) {
    await prisma.userActivity.create({ data: act });
  }

  console.log('모든 데모 데이터 반영 완료!');
}

main()
  .catch((e) => {
    console.error('시드 작업 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });