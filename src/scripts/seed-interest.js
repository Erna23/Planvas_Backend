import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const interests = [
    { id: 1, name: '개발/IT' },
    { id: 2, name: '마케팅' },
    { id: 3, name: '디자인' },
    { id: 4, name: '경영/사무' },
    { id: 5, name: '과학/공학' },
    { id: 6, name: '경제/금융' },
    { id: 7, name: '영상/콘텐츠' },
    { id: 8, name: '기획/마케팅/광고' },
  ];

  console.log('관심사 마스터 데이터 삽입 시작...');

  for (const item of interests) {
    await prisma.interest.upsert({
      where: { id: item.id },
      update: { name: item.name },
      create: { id: item.id, name: item.name },
    });
  }

  console.log('데이터 삽입 완료!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });