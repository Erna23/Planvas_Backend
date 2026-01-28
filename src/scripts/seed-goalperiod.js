import { prisma } from "../db.config.js";

async function main() {
  const userId = 1;

  // 오늘 날짜(로컬) 기준으로 endDate를 "오늘"로 맞춤
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 1);

  const endDateToday = new Date(now);
  endDateToday.setHours(0, 0, 0, 0); // 날짜 비교에 잘 걸리게

  const created = await prisma.goalPeriod.create({
    data: {
      userId,
      title: "DDAY 테스트",
      startDate,
      endDate: endDateToday,
      growth: 0,
      rest: 0,
      presetType: "CUSTOM",
      presetId: null,
    },
  });

  console.log("✅ created goalPeriod:", created);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
