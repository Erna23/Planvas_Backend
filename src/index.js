import express from 'express';
import dotenv from "dotenv";
import cors from "cors";
import passport from "passport";
import { googleStrategy, jwtStrategy } from "./auth.config.js";
import { prisma } from "./db.config.js";

const app = express();
const port = 3000;

dotenv.config();

passport.use(googleStrategy);
passport.use(jwtStrategy); 

app.use(cors());
app.use(express.json());

app.get("/oauth2/login/google", 
  passport.authenticate("google", { 
    session: false 
  })
);
app.get(
  "/oauth2/callback/google",
  passport.authenticate("google", {
	  session: false,
    failureRedirect: "/login-failed",
  }),
  (req, res) => {
    const tokens = req.user; 

    res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
          message: "Google 로그인 성공!",
          tokens: tokens, // { "accessToken": "...", "refreshToken": "..." }
      }
    });
  }
);

app.use(express.static("public")); // 정적 파일 접근
app.use(express.urlencoded({ extended: false })); // 단순 객체 문자열 형태로 본문 데이터 해석

app.use(passport.initialize());

const isLogin = passport.authenticate('jwt', { session: false });

app.get('/mypage', isLogin, (req, res) => {
  res.status(200).success({
    message: `인증 성공! ${req.user.name}님의 마이페이지입니다.`,
    user: req.user,
  });
});