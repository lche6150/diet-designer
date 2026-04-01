import { Router } from "express";
import { searchIngredients } from "../controllers/ingredientController";

const router = Router();

router.get("/search", searchIngredients);

export default router;
