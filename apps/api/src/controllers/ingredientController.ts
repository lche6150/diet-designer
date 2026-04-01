import { z } from "zod";
import type { Request, Response } from "express";
import { searchFoods } from "../services/usdaService";

const searchSchema = z.object({
  query: z.string().min(2),
});

export const searchIngredients = async (req: Request, res: Response) => {
  const { query } = searchSchema.parse({ query: req.query.query });
  const foods = await searchFoods(query);
  res.json({ foods });
};
