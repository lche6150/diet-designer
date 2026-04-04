"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthRedirect from "../../components/auth-redirect";
import GoogleAuthButton from "../../components/google-auth-button";
import { resolveRedirectPath } from "../../lib/auth";

export default function SignInPageContent() {
  const searchParams = useSearchParams();
  const redirectTo = resolveRedirectPath(searchParams.get("next"), "/");
  const signUpHref = `/signup?next=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthRedirect redirectTo={redirectTo}>
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="flex items-center justify-between px-6 py-4">
          <Link className="text-lg font-semibold" href="/">
            Diet Designer
          </Link>
          <Link
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
            href={signUpHref}
          >
            Create account
          </Link>
        </header>

        <main className="flex items-center justify-center px-6 py-20">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Welcome back
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Sign in to your plan</h1>
            <p className="mt-3 text-base text-zinc-600">
              Use Google to access your saved goals, meals, and preferences.
            </p>
            <GoogleAuthButton context="signin" redirectTo={redirectTo} />
            <p className="mt-6 text-xs text-zinc-500">
              By continuing, you agree to the Diet Designer Terms and Privacy
              Policy.
            </p>
          </div>
        </main>
      </div>
    </AuthRedirect>
  );
}
