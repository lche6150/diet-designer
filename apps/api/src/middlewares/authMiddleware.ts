import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/tokenService";

export type AuthenticatedRequest = Request & {
  user?: ReturnType<typeof verifyAccessToken>;
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing authorization token" });
    return;
  }

  try {
    const token = header.replace("Bearer ", "");
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid authorization token" });
  }
};
