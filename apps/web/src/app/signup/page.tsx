import { Suspense } from "react";
import SignUpPageContent from "./page-content";

const SignUpPageFallback = () => {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Get started
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Create your account</h1>
          <p className="mt-3 text-base text-zinc-600">
            Loading sign-up options...
          </p>
        </div>
      </main>
    </div>
  );
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpPageFallback />}>
      <SignUpPageContent />
    </Suspense>
  );
}
