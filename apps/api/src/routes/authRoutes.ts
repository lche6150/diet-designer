import { Router } from "express";
import { googleLogin, getCurrentUser } from "../controllers/authController";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

router.post("/google", googleLogin);
router.get("/me", requireAuth, getCurrentUser);

export default router;
