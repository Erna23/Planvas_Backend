import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // ★ 추가됨

const ACCESS_EXPIRES_IN = "30d";
export const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

const REFRESH_EXPIRES_IN = "90d";
export const REFRESH_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 90;

const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  "postmessage"
);

if (!JWT_SECRET) {
  throw new Error("Missing env: JWT_SECRET");
}
if (!JWT_REFRESH_SECRET) {
  throw new Error("Missing env: JWT_REFRESH_SECRET");
}
if (!GOOGLE_CLIENT_ID) {
  throw new Error("Missing env: GOOGLE_CLIENT_ID");
}
if (!GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing env: GOOGLE_CLIENT_SECRET"); // ★ 체크 추가
}

/**
 * Google ID Token 검증 (로그인용)
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken) throw new Error("idToken is required");

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error("Invalid token payload");

  return {
    email: payload.email,
    name: payload.name || payload.given_name || "사용자",
    oauthId: payload.sub,
    provider: "google",
  };
}

/**
 * 연동용: Auth Code -> Refresh Token 교환
 */
export async function getGoogleTokens(code) {
  try {
    const { tokens } = await googleClient.getToken(code);
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
    };
  } catch (error) {
    console.error("Google Token Exchange Error:", error);
    throw new Error("구글 토큰 교환에 실패했습니다.");
  }
}

/**
 * 동기화용: 저장된 Refresh Token으로 클라이언트 생성
 */
export function getGoogleClient(refreshToken) {
  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/**
 * JWT Access Token 생성 (우리 서비스용)
 */
export function signAccessToken({ userId }) {
  return jwt.sign({ userId, tokenType: "access" }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken({ userId }) {
  return jwt.sign(
    { userId, tokenType: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

/**
 * Authorization 헤더 추출
 */
function extractBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

/**
 * JWT 인증 미들웨어
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

    // refresh 토큰으로 접근하는 실수 방지
    if (decoded?.tokenType && decoded.tokenType !== "access") {
      return res.status(401).json({
        resultType: "FAIL",
        error: { errorCode: "A003", reason: "유효하지 않은 토큰 타입입니다.", data: null },
        success: null,
      });
    }

    req.auth = decoded;
    req.userId = decoded.userId;
    return next();
  } catch (e) {
    return res.status(401).json({
      resultType: "FAIL",
      error: { errorCode: "A003", reason: "토큰이 만료되었거나 유효하지 않습니다.", data: null },
      success: null,
    });
  }
}