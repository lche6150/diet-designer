"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

type AuthRedirectProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

export default function AuthRedirect({
  children,
  redirectTo = "/",
}: AuthRedirectProps) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTo);
    }
  }, [status, redirectTo, router]);

  if (status === "authenticated") {
    return null;
  }

  return <>{children}</>;
}
