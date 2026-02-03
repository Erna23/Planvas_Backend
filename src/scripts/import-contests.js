// src/scripts/import-contests.js  (이름은 유지해도 됨)
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { prisma } from "../db.config.js";

dotenv.config();

/**
 * 사용법:
 * 1) 공모전(GROWTH/CONTEST) 넣기:
 *    npm run import:contests -- ./linkareer_activities.json --reset --tab=GROWTH --type=CONTEST
 *
 * 2) 휴식(REST/NORMAL) 넣기:
 *    npm run import:contests -- ./휴식활동.json --reset --tab=REST --type=NORMAL
 */

const args = process.argv.slice(2);
const fileArg = args.find((a) => !a.startsWith("--")) || "./linkareer_activities.json";
const shouldReset = args.includes("--reset");

const tabArg = (args.find((a) => a.startsWith("--tab="))?.split("=")[1] || "GROWTH").toUpperCase();
const typeArg = (args.find((a) => a.startsWith("--type="))?.split("=")[1] || "CONTEST").toUpperCase();

// GROWTH 탭 카테고리 매핑(기존 유지)
const GROWTH_CATEGORY_ID_MAP = {
  "공모전": 2,
  "학회/동아리": 3,
  "대외활동": 4,
  "여행/자기계발": 5,
  "인턴십": 6,
  "교육/강연": 7,
  "어학/자격증": 8,
};

// REST 탭 카테고리 매핑(휴식활동.json 기준)
const REST_CATEGORY_ID_MAP = {
  "문화/예술": 1,
  "취미/여가": 2,
  "운동/건강": 3,
  "여행": 4,
};

function parseDate(v) {
  if (!v || v === "-") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickCategoryMap(tab) {
  return tab === "REST" ? REST_CATEGORY_ID_MAP : GROWTH_CATEGORY_ID_MAP;
}

function resolveCategoryId(categories = [], mapObj) {
  if (!Array.isArray(categories)) return null;

  // 기존 공모전 데이터처럼 "공모전"이 들어가면 공모전 우선
  if (categories.includes("공모전") && mapObj["공모전"]) return mapObj["공모전"];

  for (const c of categories) {
    if (mapObj[c]) return mapObj[c];
  }
  return null;
}

function buildDescription(item) {
  const meta = [];

  if (item.organizer) meta.push(`주관: ${item.organizer}`);
  if (item.field?.length) meta.push(`분야: ${item.field.join(", ")}`);
  if (item.category?.length) meta.push(`카테고리: ${item.category.join(", ")}`);
  if (item.tags?.length) meta.push(`태그: ${item.tags.join(" ")}`);

  // 휴식활동.json에 있는 운영 요일/시간 정보도 같이 붙이기
  if (item.days?.length) meta.push(`운영요일: ${item.days.join(", ")}`);
  if (item.time) meta.push(`시간: ${item.time}`);

  const metaBlock = meta.length ? meta.join("\n") + "\n\n" : "";
  return metaBlock + (item.description || "");
}

async function resetImportedActivities(tab, type) {
  // “외부에서 가져온 것만” reset: externalUrl이 있는 것만 삭제
  const targets = await prisma.activity.findMany({
    where: {
      tab,
      type,
      externalUrl: { not: null },
    },
    select: { id: true },
  });

  const ids = targets.map((x) => x.id);
  if (ids.length === 0) {
    console.log(`[import] reset: no activities to delete (tab=${tab}, type=${type})`);
    return;
  }

  const cartDel = await prisma.cartItem.deleteMany({ where: { activityId: { in: ids } } });
  const myDel = await prisma.myActivity.deleteMany({ where: { activityId: { in: ids } } });
  const actDel = await prisma.activity.deleteMany({ where: { id: { in: ids } } });

  console.log(
    `[import] reset: cartItem=${cartDel.count}, myActivity=${myDel.count}, activity=${actDel.count} (tab=${tab}, type=${type})`
  );
}

async function main() {
  const fullPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`JSON 파일을 찾을 수 없어요: ${fullPath}`);
  }

  const raw = fs.readFileSync(fullPath, "utf-8");
  const items = JSON.parse(raw);

  if (!Array.isArray(items)) {
    throw new Error("JSON 최상위는 배열이어야 해요. (예: [{...}, {...}])");
  }

  if (shouldReset) {
    await resetImportedActivities(tabArg, typeArg);
  }

  const categoryMap = pickCategoryMap(tabArg);

  let created = 0;
  let updated = 0;

  for (const item of items) {
    // dDay 기준은 endDate2 우선 (없으면 endDate)
    const deadline = parseDate(item.endDate2) || parseDate(item.endDate);
    let start = parseDate(item.startDate);
    if (start && deadline && start > deadline) start = null;

    const data = {
      title: item.title?.trim() || "(제목 없음)",
      tab: tabArg,
      type: typeArg,
      point: Number(item.point) || 10,
      thumbnailUrl: item.thumbnailUrl || null,
      description: buildDescription(item),
      startDate: start,
      endDate: deadline,
      externalUrl: item.url || null,
      categoryId: resolveCategoryId(item.category, categoryMap),
    };

    // externalUrl 기준 upsert (모델에 unique 없으니 findFirst + update/create)
    const existing = item.url
      ? await prisma.activity.findFirst({ where: { externalUrl: item.url } })
      : null;

    if (existing) {
      await prisma.activity.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.activity.create({ data });
      created += 1;
    }
  }

  console.log(`[import] done. created=${created}, updated=${updated}, total=${items.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
