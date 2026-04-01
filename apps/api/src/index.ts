import "./env";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import ingredientRoutes from "./routes/ingredientRoutes";
import mealPlanRoutes from "./routes/mealPlanRoutes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/mealplan", mealPlanRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("API running on port", PORT);
});
