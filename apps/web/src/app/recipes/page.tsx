import Link from "next/link";
import SiteHeader from "../../components/site-header";

export default function RecipesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />

      <main className="px-6 py-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Recipe library
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              Explore recipe recommendations matched to your nutrition goals.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-zinc-600">
              Diet Designer currently generates recipe suggestions through the meal
              planner. Choose your target calories and ingredients, then build a
              recipe set that fits your plan.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold">What you can do now</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-600">
              <p>Generate meal ideas based on calories and macros.</p>
              <p>Prioritize ingredients you want included in your meals.</p>
              <p>Review recipe nutrition, cooking time, and source links.</p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                href="/planner"
              >
                Open meal planner
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
                href="/dashboard"
              >
                View dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
