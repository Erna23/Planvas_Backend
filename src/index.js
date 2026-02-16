import "dotenv/config";
import swaggerUi from "swagger-ui-express";
import { specs } from "../src/config/swagger.config.js";
import express from "express";
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

import { registerNotificationInboxRoutes } from "./controllers/notification.inbox.controller.js";
import { registerPushTokenRoutes } from "./controllers/pushToken.controller.js";

import { registerDevRoutes } from "./controllers/dev.controller.js";
import { registerDebugNotificationRoutes } from "./controllers/debug.notification.controller.js";

const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());

app.get("/api-docs/swagger.json", (req, res) => res.json(specs));
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
