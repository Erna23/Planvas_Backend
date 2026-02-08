import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../db.config.js";

async function main() {
  const count = await prisma.activityCatalog.count();
  if (count > 0) {
    console.log(`[seed] Activity already exists: ${count}. skip.`);
    return;
  }

  const items = [
    // REST
    {
      title: "산책 20분",
      tab: "REST",
      point: 10,
      thumbnailUrl: "https://placehold.co/200x200",
      description: "가벼운 산책으로 리프레시해요.",
      type: "NORMAL",
      categoryId: 23
    },
    {
      title: "스트레칭 15분",
      tab: "REST",
      point: 10,
      thumbnailUrl: "https://placehold.co/200x200",
      description: "몸을 풀어 컨디션을 올려요.",
      type: "NORMAL",
      categoryId: 21
    },

    // GROWTH 일반
    {
      title: "독서 30분",
      tab: "GROWTH",
      point: 30,
      thumbnailUrl: "https://placehold.co/200x200",
      description: "하루 30분 독서를 추천합니다.",
      type: "NORMAL",
      categoryId: 5
    },
    {
      title: "영어 단어 외우기",
      tab: "GROWTH",
      point: 20,
      thumbnailUrl: "https://placehold.co/200x200",
      description: "매일 20개씩 꾸준히!",
      type: "NORMAL",
      categoryId: 1
    },

    // GROWTH 공모전(임시)
    {
      title: "임시 공모전 A (PM 더미 오면 교체)",
      tab: "GROWTH",
      point: 30,
      thumbnailUrl: "https://placehold.co/200x200",
      description: "공모전 일정 카드 테스트용",
      type: "CONTEST",
      categoryId: 7,
      startDate: new Date("2026-02-01T00:00:00Z"),
      endDate: new Date("2026-02-20T00:00:00Z"),
      externalUrl: "https://example.com"
    },
    {
      title: "임시 공모전 B (PM 더미 오면 교체)",
      tab: "GROWTH",
      point: 10,
      thumbnailUrl: "https://placehold.co/200x200",
      description: "공모전 일정 카드 테스트용",
      type: "CONTEST",
      categoryId: 7,
      startDate: new Date("2026-01-10T00:00:00Z"),
      endDate: new Date("2026-01-25T00:00:00Z"),
      externalUrl: "https://example.com/contest-a"
    }
  ];

  await prisma.activityCatalog.createMany({ data: items });
  console.log(`[seed] inserted activities: ${items.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
