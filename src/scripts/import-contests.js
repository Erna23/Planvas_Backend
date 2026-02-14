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
const GROWTH_CATEGORY_ID_BY_NAME = {
  "공모전": 103,
  "학회/동아리": 105,
  "대외활동": 101,
  "어학/자격증": 106,
  "교육/강연": 102,
  "인턴십": 104,
  "인턴/현장실습": 104, // alias
};

// REST 탭 카테고리 매핑(휴식활동.json 기준)
const REST_CATEGORY_ID_BY_NAME = {
  "문화/예술": 201,
  "취미/여가": 202,
  "운동/건강": 203,
  "여행": 204,
};
const GROWTH_PRIORITY = ["공모전","학회/동아리","대외활동","어학/자격증","인턴십","인턴/현장실습","교육/강연"];
const REST_PRIORITY = ["문화/예술","취미/여가","운동/건강","여행"];

function parseDate(v) {
  if (!v || v === "-") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pickCategoryMap(tab) {
  return tab === "REST" ? REST_CATEGORY_ID_BY_NAME : GROWTH_CATEGORY_ID_BY_NAME;
}

function pickPriority(tab) {
  return tab === "REST" ? REST_PRIORITY : GROWTH_PRIORITY;
}

function resolveCategoryId(categoryArr, mapObj, priority) {
  if (!Array.isArray(categoryArr)) return null;

  // ✅ 우선순위대로 먼저 매칭 (UI 탭 순서 보장)
  for (const name of priority) {
    const id = mapObj[name];
    if (id && categoryArr.includes(name)) return id;
  }

  // ✅ 그래도 없으면 그냥 처음 매칭되는 거
  for (const name of categoryArr) {
    const id = mapObj[name];
    if (id) return id;
  }

  return null; // 못 맞추면 null
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
// ✅ item.field[] 기반으로 Interest 테이블 upsert 해서 id 목록 만들기
async function ensureInterestIds(fieldArr = []) {
  if (!Array.isArray(fieldArr)) return [];

  const ids = [];
  for (const raw of fieldArr) {
    const name = (raw || "").toString().trim();
    if (!name) continue;

    const row = await prisma.interest.upsert({
      where: { name },
      update: {},           // 이미 있으면 그대로
      create: { name },     // 없으면 생성
      select: { id: true },
    });

    ids.push(row.id);
  }

  // 중복 제거
  return [...new Set(ids)];
}

// ✅ 특정 activityId의 매핑을 "완전히 교체" (deleteMany -> createMany)
async function replaceActivityInterests(activityId, interestIds = []) {
  await prisma.activityInterest.deleteMany({ where: { activityId } });

  if (!Array.isArray(interestIds) || interestIds.length === 0) return;

  await prisma.activityInterest.createMany({
    data: interestIds.map((interestId) => ({ activityId, interestId })),
    skipDuplicates: true,
  });
}

async function resetImportedActivities(tab, type) {
  // “외부에서 가져온 것만” reset: externalUrl이 있는 것만 삭제
  const targets = await prisma.activityCatalog.findMany({
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
  const actDel = await prisma.activityCatalog.deleteMany({ where: { id: { in: ids } } });

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
  const priority = pickPriority(tabArg);
  
  let created = 0;
  let updated = 0;

  for (const item of items) {
    // dDay 기준은 endDate2 우선 (없으면 endDate)
    const deadline = parseDate(item.endDate2) || parseDate(item.endDate);
    let start = parseDate(item.startDate);
    if (start && deadline && start > deadline) start = null;

    const interestIds = await ensureInterestIds(item.field ?? []);

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
      categoryId: resolveCategoryId(item.category, categoryMap, priority),

    };

    // externalUrl 기준 upsert (모델에 unique 없으니 findFirst + update/create)
    const existing = item.url
      ? await prisma.activityCatalog.findFirst({ where: { externalUrl: item.url } })
      : null;

    let saved;
    
    if (existing) {
      saved = await prisma.activityCatalog.update({
        where: { id: existing.id },
        data,
        select: { id: true },
      });
      updated += 1;
    } else {
      saved = await prisma.activityCatalog.create({
        data,
        select: { id: true },
      });
      created += 1;
    }
    
    await replaceActivityInterests(saved.id, interestIds);

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
