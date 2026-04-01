import jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  userId: string;
  email: string;
};

const getJwtSecret = () => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set");
  }

  return jwtSecret;
};

export const signAccessToken = (payload: AuthTokenPayload) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
};
