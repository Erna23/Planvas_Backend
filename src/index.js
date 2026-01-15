import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { prisma } from "./db.config.js";
import { verifyGoogleIdToken, signAccessToken, EXPIRES_IN_SECONDS, requireAuth } from "./auth.config.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * POST /api/users/oauth2/google
 * - Request: { idToken }
 * - 기존 유저: signupRequired=false + token 발급
 * - 신규 유저: signupRequired=true + provider/name 반환
 */
app.post("/api/users/oauth2/google", async (req, res) => {
  try {
    const { idToken } = req.body;

    const { email, name, oauthId, provider } = await verifyGoogleIdToken(idToken);

    // 기존 유저 여부 판단 (provider+oauthId)
    const existing = await prisma.user.findFirst({
      where: {
        provider,
        oauthId,
      },
    });

    if (!existing) {
      // 신규 유저: 회원가입 필요
      return res.status(200).json({
        resultType: "SUCCESS",
        error: null,
        success: {
          signupRequired: true,
          provider,
          name, // "지수님 환영해요"에 사용
        },
      });
    }

    // 기존 유저: 토큰 발급
    const token = signAccessToken({ userId: existing.id });

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        signupRequired: false,
        token,
        expiresIn: EXPIRES_IN_SECONDS,
        user: {
          userId: existing.id,
          name: existing.name,
          provider: existing.provider,
        },
      },
    });
  } catch (e) {
    return res.status(401).json({
      resultType: "FAIL",
      error: { errorCode: "A001", reason: "유효하지 않은 Google ID Token입니다.", data: null },
      success: null,
    });
  }
});

/**
 * POST /api/users
 */
app.post("/api/users", async (req, res) => {
  try {
    const { idToken } = req.body;

    const { email, name, oauthId, provider } = await verifyGoogleIdToken(idToken);

    // 중복 가입 방지
    const existing = await prisma.user.findFirst({ where: { provider, oauthId } });
    if (existing) {
      return res.status(409).json({
        resultType: "FAIL",
        error: { errorCode: "U001", reason: "이미 등록된 소셜 로그인 계정입니다.", data: null },
        success: null,
      });
    }

    const created = await prisma.user.create({
      data: {
        email,
        provider,
        oauthId,
        name,
      },
    });

    const token = signAccessToken({ userId: created.id });

    return res.status(201).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "회원가입이 성공적으로 완료되었습니다.",
        token,
        expiresIn: EXPIRES_IN_SECONDS,
        user: {
          userId: created.id,
          name: created.name,
          provider: created.provider,
        },
      },
    });
  } catch (e) {
    return res.status(401).json({
      resultType: "FAIL",
      error: { errorCode: "A001", reason: "유효하지 않은 Google ID Token입니다.", data: null },
      success: null,
    });
  }
});


/**
 * GET /api/users/me
 * Authorization: Bearer <token>
 */
app.get("/api/users/me", requireAuth, async (req, res) => {
  const userId = req.auth.userId;

  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({
      resultType: "FAIL",
      error: { errorCode: "U404", reason: "사용자를 찾을 수 없습니다.", data: null },
      success: null,
    });
  }

  // 데모/단순화: user만 반환 (원하면 interests/currentGoalPeriod 붙이면 됨)
  return res.status(200).json({
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
  });
});

app.post("/api/users/me/onboarding", requireAuth, async (req, res) => {
  if (user.onboardingCompleted) {
  return res.status(409).json({
    resultType: "FAIL",
    error: { errorCode: "O002", reason: "이미 온보딩이 저장된 사용자입니다.", data: null },
    success: null,
  });
}
  try {
    const userId = req.auth.userId;
    const { goalPeriod, calendar, profile } = req.body;

    // 최소 검증 (필요하면 더 강화)
    if (!goalPeriod?.title || !goalPeriod?.dateRange?.startDate || !goalPeriod?.dateRange?.endDate) {
      return res.status(400).json({
        resultType: "FAIL",
        error: { errorCode: "O001", reason: "온보딩 요청값이 올바르지 않습니다.", data: null },
        success: null,
      });
    }

    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        resultType: "FAIL",
        error: { errorCode: "U404", reason: "사용자를 찾을 수 없습니다.", data: null },
        success: null,
      });
    }

    // 1) goalPeriod 생성
    const createdGoalPeriod = await prisma.goalPeriod.create({
      data: {
        userId,
        title: goalPeriod.title,
        startDate: new Date(goalPeriod.dateRange.startDate),
        endDate: new Date(goalPeriod.dateRange.endDate),
        growth: goalPeriod.ratio?.growth ?? 50,
        rest: goalPeriod.ratio?.rest ?? 50,
        presetType: goalPeriod.ratio?.presetType ?? "CUSTOM",
      },
    });

    // 2) profile upsert (interests)
    if (profile?.interests) {
      await prisma.userProfile.upsert({
        where: { userId },
        update: { interests: profile.interests },
        create: { userId, interests: profile.interests },
      });
    }

    // 3) calendar upsert (통 저장)
    if (calendar) {
      await prisma.calendarSetting.upsert({
        where: { userId },
        update: {
          connect: !!calendar.connect,
          provider: calendar.provider ?? null,
          importFixedSchedules: !!calendar.importFixedSchedules,
          selectedEventIds: calendar.selectedEventIds ?? null,
          manualFixedSchedules: calendar.manualFixedSchedules ?? null,
        },
        create: {
          userId,
          connect: !!calendar.connect,
          provider: calendar.provider ?? null,
          importFixedSchedules: !!calendar.importFixedSchedules,
          selectedEventIds: calendar.selectedEventIds ?? null,
          manualFixedSchedules: calendar.manualFixedSchedules ?? null,
        },
      });
    }

    // 4) user onboardingCompleted 표시
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        message: "온보딩 저장이 완료되었습니다.",
        goalPeriodId: createdGoalPeriod.id,
        onboardingCompleted: true,
      },
    });
  } catch (e) {
    return res.status(500).json({
      resultType: "FAIL",
      error: { errorCode: "O500", reason: "온보딩 저장 중 서버 오류가 발생했습니다.", data: null },
      success: null,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});