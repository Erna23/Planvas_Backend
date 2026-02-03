import swaggerUi from "swagger-ui-express";
import { specs } from "../src/config/swagger.config.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { registerUserRoutes } from "./controllers/user.controller.js";
import { registerCalendarRoutes } from "./controllers/calendar.controller.js";
import { registerHomeRoutes } from "./controllers/home.controller.js";
import { registerGoalRoutes } from "./controllers/goals.controller.js";
import { registerReportRoutes } from "./controllers/report.controller.js";
import { registerScheduleRoutes } from "./controllers/schedule.controller.js";
import { registerActivityRoutes } from "./controllers/activity.controller.js";
import { registerCartRoutes } from "./controllers/cart.controller.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

console.log("Swagger Paths 찾은 개수:", Object.keys(specs.paths || {}).length);
console.log("Swagger Paths 목록:", Object.keys(specs.paths || {}));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

registerUserRoutes(app);
registerCalendarRoutes(app);
registerHomeRoutes(app);
registerGoalRoutes(app);
registerReportRoutes(app);
registerScheduleRoutes(app);
registerActivityRoutes(app);
registerCartRoutes(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

