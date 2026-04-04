"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveRedirectPath } from "../lib/auth";
import { useAuth } from "./auth-provider";

type AuthRequiredProps = {
  children: React.ReactNode;
  redirectPath?: string;
};

export default function AuthRequired({
  children,
  redirectPath = "/planner",
}: AuthRequiredProps) {
  const { status } = useAuth();
  const router = useRouter();
  const nextPath = resolveRedirectPath(redirectPath, "/planner");
  const signInHref = `/signin?next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    if (status === "guest") {
      router.replace(signInHref);
    }
  }, [router, signInHref, status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Checking your session…</h1>
          <p className="mt-3 text-zinc-600">
            Planner access is available to signed-in users only.
          </p>
        </div>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Redirecting to sign in…</h1>
          <p className="mt-3 text-zinc-600">
            The planner is only available to signed-in users.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
