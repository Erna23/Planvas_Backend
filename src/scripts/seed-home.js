import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { prisma } from "../db.config.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("[Home Seed] JSON 데이터를 DB로 옮기는 작업을 시작합니다...");

    // process.cwd() 대신 "현재 스크립트 파일 기준" 경로
    const jsonPath = path.join(__dirname, "linkareer_activities.json");

    if (!fs.existsSync(jsonPath)) {
        console.error("[Error] linkareer_activities.json 파일을 찾을 수 없습니다!");
        console.error("찾는 경로:", jsonPath);
        return;
    }

    const fileContent = fs.readFileSync(jsonPath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    console.log(`JSON 파일 로드 성공! 총 ${jsonData.length}개의 데이터를 처리합니다.`);

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) return null;
        return parsed;
    };

    const activityData = jsonData.map((item) => {
        // 탭 자동 분류
        let targetTab = "GROWTH";
        const keywords =
            JSON.stringify(item.tags ?? []) + JSON.stringify(item.category ?? []);
        if (
            keywords.includes("여행") ||
            keywords.includes("휴식") ||
            keywords.includes("힐링")
        ) {
            targetTab = "REST";
        }

        return {
            title: item.title,
            organizer: item.organizer ?? "",         // ✅ undefined 방지
            description: item.description ?? null,
            thumbnailUrl: item.thumbnailUrl ?? null,
            externalUrl: item.url ?? null,

            startDate: parseDate(item.startDate),
            endDate: parseDate(item.endDate),
            recruitEndDate: parseDate(item.endDate2),

            tags: item.tags ?? [],                    // ✅ Json 필드 undefined 방지
            point: item.point ?? 10,

            tab: targetTab,
            type: "NORMAL",
            categoryId: null,
        };
    });

    try {
        const result = await prisma.activityCatalog.createMany({
            data: activityData,
            skipDuplicates: true,
        });

        console.log("[Success] DB 저장 완료!");
        console.log(`   - 성공적으로 저장된 데이터: ${result.count}개`);
    } catch (error) {
        console.error("[Error] DB 저장 중 문제가 발생했습니다.");
        console.error(error);
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
