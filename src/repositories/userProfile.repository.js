import { prisma } from "../db.config.js";

// user_profile.interests(JSON) -> number[] 로 정규화해서 반환
export async function findUserInterestIds(userId) {
  if (!userId) return [];

  // ✅ user_profile 테이블은 user_id가 UNIQUE라서 findUnique 가능
  const profile = await prisma.userProfile.findUnique({
    where: { userId },          // ⚠️ 여기 키가 userId 여야 함 (Prisma 필드명)
    select: { interests: true },
  });

  const raw = profile?.interests;
  if (!raw) return [];

  const normalize = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    if (typeof arr[0] === "number") return arr.filter(Number.isFinite);
    if (typeof arr[0] === "object" && arr[0] && "id" in arr[0]) {
      return arr.map((x) => Number(x.id)).filter(Number.isFinite);
    }
    return [];
  };

  // 1) [1,4,7]
  if (Array.isArray(raw)) return normalize(raw);

  // 2) { interests: [...] }
  if (typeof raw === "object" && raw && Array.isArray(raw.interests)) {
    return normalize(raw.interests);
  }

  return [];
}
