import { fail } from "../utils/apiResponse.js";

export function authStub(req, res, next) {
  const auth = req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json(fail("인증이 필요합니다.", null));
  }

  const token = auth.slice("Bearer ".length).trim();

  // ✅ 개발용: Bearer test면 userId=1
  if (token === "test") {
    req.userId = 1;
    return next();
  }

  // ✅ 개발용: Bearer user-<숫자>면 그 숫자를 userId로 사용
  const m = token.match(/^user-(\d+)$/);
  if (m) {
    req.userId = Number(m[1]);
    return next();
  }

  return res.status(401).json(fail("유효하지 않은 토큰입니다.", null));
}
