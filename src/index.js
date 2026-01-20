import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { registerUserRoutes } from "./controllers/user.controller.js";
<<<<<<< HEAD
import { registerCalendarRoutes } from "./controllers/calendar.controller.js";
=======
>>>>>>> 27297438c8f56cd6e6e681e8d02f60699632b3e2

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

registerUserRoutes(app);
<<<<<<< HEAD
registerCalendarRoutes(app);
=======
>>>>>>> 27297438c8f56cd6e6e681e8d02f60699632b3e2

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
