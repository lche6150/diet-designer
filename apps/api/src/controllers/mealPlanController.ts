import { z } from "zod";
import type { Request, Response } from "express";
import { generateMealPlan } from "../services/spoonacularService";

const mealPlanSchema = z.object({
  calories: z.number().positive(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  ingredients: z.array(z.string()).optional(),
});

export const generateMealPlanHandler = async (req: Request, res: Response) => {
  const payload = mealPlanSchema.parse(req.body);
  const meals = await generateMealPlan(payload);
  res.json({ meals });
};
