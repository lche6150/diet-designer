import { z } from "zod";
import type { Request, Response } from "express";
import { verifyGoogleIdToken } from "../services/googleAuthService";
import { upsertGoogleUser } from "../services/userService";
import { signAccessToken } from "../services/tokenService";
import prisma from "../prisma/client";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware";

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

export const googleLogin = async (req: Request, res: Response) => {
  const { idToken } = googleLoginSchema.parse(req.body);
  const profile = await verifyGoogleIdToken(idToken);
  const user = await upsertGoogleUser(profile);
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
  });

  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
};
