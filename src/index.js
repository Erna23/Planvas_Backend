import swaggerUi from "swagger-ui-express";
import { specs } from "../src/config/swagger.config.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { registerUserRoutes } from "./controllers/user.controller.js";
import { registerNotificationRoutes } from "./controllers/notification.controller.js";
import { registerCalendarRoutes } from "./controllers/calendar.controller.js";
import { registerHomeRoutes } from "./controllers/home.controller.js";
import { registerGoalRoutes } from "./controllers/goals.controller.js";
import { registerReportRoutes } from "./controllers/report.controller.js";
import { registerScheduleRoutes } from "./controllers/schedule.controller.js";
import { registerActivityRoutes } from "./controllers/activity.controller.js";
import { registerCartRoutes } from "./controllers/cart.controller.js";

// 알림 기능에서 실제로 필요한 라우트들
import { registerNotificationInboxRoutes } from "./controllers/notification.inbox.controller.js";
import { registerPushTokenRoutes } from "./controllers/pushToken.controller.js";

// dev/debug 용 (운영에선 막기)
import { registerDevRoutes } from "./controllers/dev.controller.js";
import { registerDebugNotificationRoutes } from "./controllers/debug.notification.controller.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

console.log("Swagger Paths 찾은 개수:", Object.keys(specs.paths || {}).length);
console.log("Swagger Paths 목록:", Object.keys(specs.paths || {}));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

registerUserRoutes(app);
registerNotificationRoutes(app);
registerCalendarRoutes(app);
registerHomeRoutes(app);
registerGoalRoutes(app);
registerReportRoutes(app);
registerScheduleRoutes(app);
registerActivityRoutes(app);
registerCartRoutes(app);

// 알림함/푸시토큰 라우트
registerNotificationInboxRoutes(app);
registerPushTokenRoutes(app);

// 개발 환경에서만 dev/debug 라우트 열기
if (process.env.NODE_ENV !== "production") {
  registerDevRoutes(app);
  registerDebugNotificationRoutes(app);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

