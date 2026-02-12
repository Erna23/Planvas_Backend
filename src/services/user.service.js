import { verifyGoogleIdToken, signAccessToken, EXPIRES_IN_SECONDS, signRefreshToken,
  REFRESH_EXPIRES_IN_SECONDS, } from "../auth.config.js";
import { parseIdTokenBody, validateOnboardingBody, validatePatchInterestsBody } from "../dtos/user.dto.js";
import {
  findUserByProviderOauthId,
  createUser,
  findUserById,
  markOnboardingCompleted,
  createGoalPeriod,
  upsertUserProfileInterests,
  upsertCalendarSetting,
  findUserProfileByUserId,
  findInterestsByIds,
} from "../repositories/user.repository.js";
import { findOverlappingGoalPeriodByUserId } from "../repositories/goals.repository.js";


/**
 * POST /api/users/oauth2/google
 * - Request: { idToken }
 * - 기존 유저: signupRequired=false + token 발급
 * - 신규 유저: signupRequired=true + provider/name 반환
 */
export async function googleOAuth2(body) {
  const { idToken } = parseIdTokenBody(body);

  let google;
  try {
    google = await verifyGoogleIdToken(idToken); // { email, name, oauthId, provider }
  } catch {
    throw authFailGoogle();
  }

  const { name, oauthId, provider } = google;

  // 기존 유저 여부 판단 (provider+oauthId)
  const existing = await findUserByProviderOauthId(provider, oauthId);

  if (!existing) {
    // 신규 유저: 회원가입 필요
    return {
      resultType: "SUCCESS",
      error: null,
      success: {
        signupRequired: true,
        provider,
        name,
      },
    };
  }

  // 기존 유저: 토큰 발급
  const token = signAccessToken({ userId: existing.id });
  const refreshToken = signRefreshToken({ userId: existing.id });

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      signupRequired: false,
      token,
      refreshToken,
      expiresIn: EXPIRES_IN_SECONDS,
      user: {
        userId: existing.id,
        name: existing.name,
        provider: existing.provider,
      },
    },
  };
}

/**
 * POST /api/users
 * - Request: { idToken }
 * - 신규 유저 생성 + token 발급
 */
export async function signupWithGoogle(body) {
  const { idToken } = parseIdTokenBody(body);

  let google;
  try {
    google = await verifyGoogleIdToken(idToken);
  } catch {
    throw authFailGoogle();
  }

  const { email, name, oauthId, provider } = google;

  // 중복 가입 방지
  const existing = await findUserByProviderOauthId(provider, oauthId);
  if (existing) {
    const err = new Error("Duplicate social account");
    err.statusCode = 409;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "U001", reason: "이미 등록된 소셜 로그인 계정입니다.", data: null },
      success: null,
    };
    throw err;
  }

  const created = await createUser({
    email: email ?? null,
    provider,
    oauthId,
    name,
  });

  const token = signAccessToken({ userId: created.id });
  const refreshToken = signRefreshToken({ userId: created.id });

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      message: "회원가입이 성공적으로 완료되었습니다.",
      token,
      refreshToken,
      expiresIn: EXPIRES_IN_SECONDS,
      user: {
        userId: created.id,
        name: created.name,
        provider: created.provider,
      },
    },
  };
}

/**
 * GET /api/users/me
 * - controller에서 requireAuth로 인증 후 userId 전달
 */
export async function getMeByUserId(userId) {
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "U404", reason: "사용자를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      user: {
        userId: user.id,
        name: user.name,
        provider: user.provider,
        createdAt: user.createdAt,
        onboardingCompleted: user.onboardingCompleted,
      },
    },
  };
}

/**
 * POST /api/users/me/onboarding
 * - controller에서 requireAuth로 인증 후 userId 전달
 */
export async function saveOnboardingByUserId(userId, body) {
  const { goalPeriod, calendar, profile } = validateOnboardingBody(body);

  const user = await findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "U404", reason: "사용자를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 이미 온보딩 저장된 사용자 방지
  if (user.onboardingCompleted) {
    const err = new Error("Already onboarded");
    err.statusCode = 409;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "O002", reason: "이미 온보딩이 저장된 사용자입니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 온보딩 시 생성하려는 목표가 기존 목표와 겹치는지 체크
  const start = new Date(goalPeriod.dateRange.startDate);
  const end = new Date(goalPeriod.dateRange.endDate);
  
  const overlap = await findOverlappingGoalPeriodByUserId(userId, start, end);
  if (overlap) {
    const err = new Error("Overlapping goal exists during onboarding");
    err.statusCode = 409;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "O003", reason: "이미 해당 기간에 목표가 존재합니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 1) goalPeriod 생성
  const createdGoalPeriod = await createGoalPeriod({
    userId,
    title: goalPeriod.title,
    startDate: new Date(goalPeriod.dateRange.startDate),
    endDate: new Date(goalPeriod.dateRange.endDate),
    growth: goalPeriod.ratio?.growth ?? 50,
    rest: goalPeriod.ratio?.rest ?? 50,
    presetType: goalPeriod.ratio?.presetType ?? "CUSTOM",
  });

  // 2) profile upsert (interests)
  if (profile?.interests) {
    await upsertUserProfileInterests(userId, profile.interests);
  }

  // 3) calendar upsert
  if (calendar) {
    await upsertCalendarSetting(userId, calendar);
  }

  // 4) user onboardingCompleted 표시
  await markOnboardingCompleted(userId);

  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      message: "온보딩 저장이 완료되었습니다.",
      goalPeriodId: createdGoalPeriod.id,
      onboardingCompleted: true,
    },
  };
}

/**
 * GET /api/users/me/interests
 * - controller에서 requireAuth로 인증 후 userId 전달
 */
export async function getMyInterestsByUserId(userId) {
  const user = await findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "U404", reason: "사용자 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  // profile.interests 는 온보딩에서 저장된 관심사 ID 배열(Int[])이라고 가정
  const profile = await findUserProfileByUserId(userId);
  const raw = profile?.interests;
  const interestIds =
    Array.isArray(raw) ? raw.map(Number).filter((n) => Number.isInteger(n)) : [];


  const interests = await findInterestsByIds(interestIds);

  return {
    resultType: "SUCCESS",
    error: null,
    success: { interests },
  };
}

/* ----------------- 공통 에러 유틸 ----------------- */

function authFailGoogle() {
  const err = new Error("Invalid Google ID Token");
  err.statusCode = 401;
  err.payload = {
    resultType: "FAIL",
    error: { errorCode: "A001", reason: "유효하지 않은 Google ID Token입니다.", data: null },
    success: null,
  };
  return err;
}

/**
 * PATCH /api/users/me/interests
 * - Request: { interestIds: number[] }
 * - Response: { interests: [{id, name}, ...] }
 */
export async function patchMyInterestsByUserId(userId, body) {
  const { interestIds } = validatePatchInterestsBody(body);

  const user = await findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    err.payload = {
      resultType: "FAIL",
      error: { errorCode: "U404", reason: "사용자 정보를 찾을 수 없습니다.", data: null },
      success: null,
    };
    throw err;
  }

  // 1) (선택) interest master에 존재하는 id만 남기기
  const existing = await findInterestsByIds(interestIds);
  const validIds = existing.map((x) => x.id);

  // 2) userProfile.interests upsert
  await upsertUserProfileInterests(userId, validIds);

  // 3) 최신 관심사 목록 반환
  return {
    resultType: "SUCCESS",
    error: null,
    success: {
      interests: existing, // id/name 형태로 반환
    },
  };
}
