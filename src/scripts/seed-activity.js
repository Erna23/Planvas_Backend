import { prisma } from "../db.config.js";

async function main() {
  const userId = 1;

  const now = new Date();

  // endAt을 "어제"로 만들어서 조건(endAt <= 오늘)을 무조건 만족하게 함
  const startAt = new Date(now);
  startAt.setDate(startAt.getDate() - 2);

  const endAt = new Date(now);
  endAt.setDate(endAt.getDate() - 1);

  const activity = await prisma.userActivity.create({
    data: {
      userId,
      title: "활동완료 리마인더 테스트",
      startAt,
      endAt,
      type: "FIXED",
      status: "TODO", // ✅ DONE이 아니면 됨
      googleEventId: null,
    },
  });

  console.log("✅ created userActivity:", activity);
}

main()
  .catch((e) => {
    console.error("❌ seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
