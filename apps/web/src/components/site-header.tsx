"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

export default function SiteHeader() {
  const { status, user, signOut } = useAuth();
  const router = useRouter();
  const plannerHref = status === "guest" ? "/signin?next=%2Fplanner" : "/planner";

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-6">
        <Link className="text-lg font-semibold" href="/">
          Diet Designer
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-zinc-600 sm:flex">
          <Link className="hover:text-zinc-900" href="#features">
            Features
          </Link>
          <Link className="hover:text-zinc-900" href={plannerHref}>
            Planner
          </Link>
          <Link className="hover:text-zinc-900" href="/recipes">
            Recipes
          </Link>
          <Link className="hover:text-zinc-900" href="/dashboard">
            Dashboard
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm font-medium">
        {status === "loading" && (
          <span className="text-zinc-500">Checking session...</span>
        )}
        {status === "guest" && (
          <>
            <Link className="text-zinc-700 hover:text-zinc-900" href="/signin">
              Sign in
            </Link>
            <Link
              className="rounded-full bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-800"
              href="/signup"
            >
              Sign up
            </Link>
          </>
        )}
        {status === "authenticated" && (
          <>
            <span className="text-zinc-600">
              {user?.name ?? user?.email}
            </span>
            <button
              className="rounded-full border border-zinc-200 px-4 py-2 text-zinc-700 hover:border-zinc-300"
              type="button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
