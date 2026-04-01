"use client";

import Link from "next/link";
import { useAuth } from "../../components/auth-provider";

export default function DashboardPage() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
        <p className="text-sm text-zinc-500">Loading your dashboard...</p>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">You are not signed in.</h1>
          <p className="mt-3 text-zinc-600">
            Sign in with Google to access your personalized meal plans.
          </p>
          <Link
            className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
            href="/signin"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Welcome back,</h1>
        <p className="mt-2 text-lg text-zinc-700">
          {user?.name ?? user?.email}
        </p>
        <div className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
          <p>
            Your account is connected with Google. Next step: build your first
            diet plan.
          </p>
        </div>
      </div>
    </div>
  );
}
