import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { registerUserRoutes } from "./controllers/user.controller.js";
import { registerCalendarRoutes } from "./controllers/calendar.controller.js";
import { registerGoalRoutes } from "./controllers/goals.controller.js";
import { registerReportRoutes } from "./controllers/report.controller.js";
import { registerScheduleRoutes } from "./controllers/schedule.controller.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

registerUserRoutes(app);
registerCalendarRoutes(app);
registerGoalRoutes(app);
registerReportRoutes(app);
registerScheduleRoutes(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
