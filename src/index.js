import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { registerUserRoutes } from "./controllers/user.controller.js";
import { registerNotificationRoutes } from "./controllers/notification.controller.js";
import { registerCalendarRoutes } from "./controllers/calendar.controller.js";
import { registerGoalRoutes } from "./controllers/goals.controller.js";
//import { registerReportRoutes } from "./controllers/report.controller.js";
import { registerDevRoutes } from "./controllers/dev.controller.js";
import { registerDebugNotificationRoutes } from "./controllers/debug.notification.controller.js";
import { registerNotificationInboxRoutes } from "./controllers/notification.inbox.controller.js";
import { registerPushTokenRoutes } from "./controllers/pushToken.controller.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

registerUserRoutes(app);
registerNotificationRoutes(app);
registerCalendarRoutes(app);
registerGoalRoutes(app);
//registerReportRoutes(app);
registerDevRoutes(app);
registerDebugNotificationRoutes(app);
registerNotificationInboxRoutes(app);
registerPushTokenRoutes(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);

});
