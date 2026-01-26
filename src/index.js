import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { registerUserRoutes } from "./controllers/user.controller.js";
import { registerNotificationRoutes } from "./controllers/notification.controller.js";
import { registerCalendarRoutes } from "./controllers/calendar.controller.js";
import { registerGoalRoutes } from "./controllers/goals.controller.js";
import { registerReportRoutes } from "./controllers/report.controller.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

registerUserRoutes(app);
registerNotificationRoutes(app);
registerCalendarRoutes(app);
registerGoalRoutes(app);
registerReportRoutes(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
