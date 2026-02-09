import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// 경로가 맞는지 꼭 확인하세요! (src/scripts 폴더 기준)
import { prisma } from "../db.config.js";

dotenv.config();

async function main() {
  console.log("[Home Seed] JSON 데이터를 DB로 옮기는 작업을 시작합니다...");

  const jsonPath = path.join(process.cwd(), "linkareer_activities.json");

  if (!fs.existsSync(jsonPath)) {
    console.error("[Error] linkareer_activities.json 파일을 찾을 수 없습니다!");
    return;
  }

  const fileContent = fs.readFileSync(jsonPath, "utf-8");
  const jsonData = JSON.parse(fileContent);

  console.log(`JSON 파일 로드 성공! 총 ${jsonData.length}개의 데이터를 처리합니다.`);

  const parseDate = (dateStr) => {
    if (!dateStr) return null; // 값이 없으면 null
    const parsed = new Date(dateStr);
    
    // 변환했는데 "Invalid Date"가 나오면(NaN) 그냥 null로 처리
    if (isNaN(parsed.getTime())) {
      // console.warn(`날짜 변환 실패 (건너뜀): ${dateStr}`); // 필요하면 주석 해제해서 확인
      return null;
    }
    return parsed;
  };

  const activityData = jsonData.map((item) => {
    // 탭 자동 분류
    let targetTab = "GROWTH"; 
    const keywords = JSON.stringify(item.tags || []) + JSON.stringify(item.category || []);
    if (keywords.includes("여행") || keywords.includes("휴식") || keywords.includes("힐링")) {
      targetTab = "REST";
    }

    return {
      title: item.title,
      organizer: item.organizer,          
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      externalUrl: item.url,              

      // 강화된 날짜 변환 함수 사용
      startDate: parseDate(item.startDate),
      endDate: parseDate(item.endDate),
      recruitEndDate: parseDate(item.endDate2),  // ★ 여기가 에러 났던 곳

      tags: item.tags,                    
      point: item.point || 10,            

      tab: targetTab,                     
      type: "NORMAL",                     
      categoryId: null                    
    };
  });

  try {
    // 혹시 모르니 기존 데이터가 충돌나면 무시하도록 skipDuplicates 유지
    const result = await prisma.activityCatalog.createMany({
      data: activityData,
      skipDuplicates: true, 
    });

    console.log(`[Success] DB 저장 완료!`);
    console.log(`   - 성공적으로 저장된 데이터: ${result.count}개`);

  } catch (error) {
    console.error("[Error] DB 저장 중 문제가 발생했습니다.");
    console.error(error); // 에러 내용을 자세히 보여줌
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });