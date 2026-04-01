import prisma from "../prisma/client";
import type { GoogleProfile } from "./googleAuthService";

export const upsertGoogleUser = async (profile: GoogleProfile) => {
  return prisma.user.upsert({
    where: { email: profile.email },
    update: {
      name: profile.name ?? undefined,
      googleId: profile.googleId,
      avatarUrl: profile.picture ?? undefined,
    },
    create: {
      email: profile.email,
      name: profile.name ?? undefined,
      googleId: profile.googleId,
      avatarUrl: profile.picture ?? undefined,
    },
  });
};
