import { Router } from "express";
import { generateMealPlanHandler } from "../controllers/mealPlanController";

const router = Router();

router.post("/generate", generateMealPlanHandler);

export default router;
