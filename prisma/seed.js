import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.interest.createMany({
    data: [
      { id: 1, name: "개발/IT" },
      { id: 2, name: "마케팅" },
      { id: 3, name: "디자인" },
      { id: 4, name: "경영/사무" },
      { id: 5, name: "과학/공학" },
      { id: 6, name: "경제/금융" },
      { id: 7, name: "영상/콘텐츠" },
      { id: 8, name: "기획/마케팅/광고" },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
