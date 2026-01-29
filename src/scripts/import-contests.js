// src/scripts/import-contests.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { prisma } from "../db.config.js";

dotenv.config();

/**
 * 사용법:
 * 1) npm run import:contests -- ./linkareer_activities.json
 * 2) 기존 CONTEST 싹 지우고 다시 넣기:
 *    npm run import:contests -- ./linkareer_activities.json --reset
 */

const args = process.argv.slice(2);
const fileArg = args.find((a) => !a.startsWith("--")) || "./linkareer_activities.json";
const shouldReset = args.includes("--reset");

const CATEGORY_ID_MAP = {
  "공모전": 2,
  "학회/동아리": 3,
  "대외활동": 4,
  "인턴십": 6,
  "교육/강연": 7,
  "여행/자기계발": 5,
  "어학/자격증": 8,
};

function parseDate(v) {
  if (!v || v === "-") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveCategoryId(categories = []) {
  if (categories.includes("공모전")) return CATEGORY_ID_MAP["공모전"];
  for (const c of categories) {
    if (CATEGORY_ID_MAP[c]) return CATEGORY_ID_MAP[c];
  }
  return null;
}

function buildDescription(item) {
  const meta = [];
  if (item.organizer) meta.push(`주관: ${item.organizer}`);
  if (item.field?.length) meta.push(`분야: ${item.field.join(", ")}`);
  if (item.category?.length) meta.push(`카테고리: ${item.category.join(", ")}`);
  if (item.tags?.length) meta.push(`태그: ${item.tags.join(" ")}`);

  const metaBlock = meta.length ? meta.join("\n") + "\n\n" : "";
  return metaBlock + (item.description || "");
}

async function resetContests() {
  const contestIds = (
    await prisma.activity.findMany({
      where: { type: "CONTEST" },
      select: { id: true },
    })
  ).map((x) => x.id);

  if (contestIds.length === 0) {
    console.log("[import] reset: no CONTEST activities to delete");
    return;
  }

  const cartDel = await prisma.cartItem.deleteMany({
    where: { activityId: { in: contestIds } },
  });

  const myDel = await prisma.myActivity.deleteMany({
    where: { activityId: { in: contestIds } },
  });

  const actDel = await prisma.activity.deleteMany({
    where: { id: { in: contestIds } },
  });

  console.log(
    `[import] reset: cartItem=${cartDel.count}, myActivity=${myDel.count}, activity(CONTEST)=${actDel.count}`
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
    await resetContests();
  }

  let created = 0;
  let updated = 0;

  for (const item of items) {
    const deadline = parseDate(item.endDate2) || parseDate(item.endDate);
    let start = parseDate(item.startDate);
    if (start && deadline && start > deadline) start = null;

    const data = {
      title: item.title?.trim() || "(제목 없음)",
      tab: "GROWTH",
      type: "CONTEST",
      point: Number(item.point) || 10,
      thumbnailUrl: item.thumbnailUrl || null,
      description: buildDescription(item),
      startDate: start,
      endDate: deadline,
      externalUrl: item.url || null,
      categoryId: resolveCategoryId(item.category),
    };

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
