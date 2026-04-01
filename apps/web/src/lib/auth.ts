export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
};

const tokenStorageKey = "dietDesignerToken";
const userStorageKey = "dietDesignerUser";

export const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(tokenStorageKey);
};

export const getStoredUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(userStorageKey);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
};

export const storeAuthSession = (token: string, user: AuthUser) => {
  localStorage.setItem(tokenStorageKey, token);
  localStorage.setItem(userStorageKey, JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem(tokenStorageKey);
  localStorage.removeItem(userStorageKey);
};

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const fetchCurrentUser = async (token: string) => {
  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user session");
  }

  const payload = (await response.json()) as { user: AuthUser };
  return payload.user;
};
