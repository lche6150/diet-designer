import AuthRedirect from "../../components/auth-redirect";
import GoogleAuthButton from "../../components/google-auth-button";

export default function SignInPage() {
  return (
    <AuthRedirect redirectTo="/">
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="flex items-center justify-between px-6 py-4">
          <a className="text-lg font-semibold" href="/">
            Diet Designer
          </a>
          <a className="text-sm font-medium text-zinc-700 hover:text-zinc-900" href="/signup">
            Create account
          </a>
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
            <GoogleAuthButton context="signin" redirectTo="/" />
            <p className="mt-6 text-xs text-zinc-500">
              By continuing, you agree to the Diet Designer Terms and Privacy Policy.
            </p>
          </div>
        </main>
      </div>
    </AuthRedirect>
  );
}
