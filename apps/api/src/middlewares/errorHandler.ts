import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation error",
      issues: error.issues,
    });
    return;
  }

  res.status(500).json({ message: error.message || "Server error" });
};
