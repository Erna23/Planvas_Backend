import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // 웹 애플리케이션 Google Client ID
const ACCESS_EXPIRES_IN = "30d"; // 데모용: 30일
export const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 2592000

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

if (!JWT_SECRET) {
  throw new Error("Missing env: JWT_SECRET");
}
if (!GOOGLE_CLIENT_ID) {
  throw new Error("Missing env: GOOGLE_CLIENT_ID (web client id)");
}


/**
 * Google ID Token 검증 → { email, name, oauthId(sub), provider }
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken) throw new Error("idToken is required");

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid token payload");

  const email = payload.email;
  const name = payload.name || payload.given_name || "사용자";
  const oauthId = payload.sub; // Google unique user id
  const provider = "google";

  if (!email || !oauthId) {
    throw new Error("Token payload missing email/sub");
  }

  return { email, name, oauthId, provider };
}

export function signAccessToken({ userId }) {
  return jwt.sign(
    { userId }, // payload 최소화
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

/**
 * Authorization: Bearer <token> 에서 token 추출
 */
function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

/**
 * JWT 인증 미들웨어 (GET /api/users/me 등에 사용)
 */
export function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        resultType: "FAIL",
        error: { errorCode: "A002", reason: "Authorization 헤더가 필요합니다.", data: null },
        success: null,
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded; // { userId, iat, exp }
    return next();
  } catch (e) {
    return res.status(401).json({
      resultType: "FAIL",
      error: { errorCode: "A003", reason: "토큰이 만료되었거나 유효하지 않습니다.", data: null },
      success: null,
    });
  }
}
