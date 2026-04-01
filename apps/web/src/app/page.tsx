import SiteHeader from "../components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />

      <main className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Personalized nutrition
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-zinc-900 sm:text-5xl">
            Build meal plans that match your goals, ingredients, and schedule.
          </h1>
          <p className="mt-5 text-lg text-zinc-600">
            Choose a diet style, set macro targets, and let Diet Designer recommend
            balanced meals you can actually cook.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
              href="/signup"
            >
              Get started
            </a>
            <a
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
              href="#features"
            >
              View features
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
