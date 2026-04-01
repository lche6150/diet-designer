import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client();

export type GoogleProfile = {
  email: string;
  name?: string | null;
  picture?: string | null;
  googleId: string;
};

const getGoogleClientId = () => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is not set");
  }

  return googleClientId;
};

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: getGoogleClientId(),
  });

  const payload = ticket.getPayload();

  if (!payload?.email || !payload.sub) {
    throw new Error("Invalid Google token payload");
  }

  return {
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    googleId: payload.sub,
  };
};
