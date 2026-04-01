"use client";

import { useState } from "react";
import SiteHeader from "../../components/site-header";
import IngredientSearch, {
  type IngredientResult,
} from "../../components/ingredient-search";
import NutritionCalculator from "../../components/nutrition-calculator";
import type { NutritionResult } from "../../lib/nutrition";
import { apiBaseUrl } from "../../lib/auth";

type MealPlanRecipe = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  nutrition: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
};

type MealPlanStatus = "idle" | "loading" | "error" | "success";

export default function PlannerPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [nutritionResult, setNutritionResult] =
    useState<NutritionResult | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<
    IngredientResult[]
  >([]);
  const [mealPlanStatus, setMealPlanStatus] = useState<MealPlanStatus>("idle");
  const [mealPlanError, setMealPlanError] = useState<string | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlanRecipe[]>([]);

  const canContinue = Boolean(nutritionResult);

  const generateMealPlan = async () => {
    if (!nutritionResult) {
      return;
    }

    setMealPlanStatus("loading");
    setMealPlanError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/mealplan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: nutritionResult.calories,
          protein: nutritionResult.proteinGrams,
          carbs: nutritionResult.carbGrams,
          fat: nutritionResult.fatGrams,
          ingredients: selectedIngredients.map((item) => item.name),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? "Failed to generate meal plan");
      }

      const payload = (await response.json()) as { meals: MealPlanRecipe[] };
      setMealPlan(payload.meals ?? []);
      setMealPlanStatus("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate meal plan";
      setMealPlanStatus("error");
      setMealPlanError(message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />
      <main className="px-6 py-12">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Step 1 · Your profile
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Calculate your daily nutrition target.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-zinc-600">
              Tell us your basics and activity level so we can estimate calories
              and macros before building your meal plan.
            </p>
          </div>

          <section>
            <NutritionCalculator onResultChange={setNutritionResult} />
            <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Step 1 {canContinue ? "complete" : "in progress"}
                </p>
                <p className="text-xs text-zinc-500">
                  {canContinue
                    ? "You can continue to ingredient selection."
                    : "Fill in all fields to unlock the next step."}
                </p>
              </div>
              <button
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  canContinue
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "cursor-not-allowed bg-zinc-200 text-zinc-500"
                }`}
                type="button"
                onClick={() => setStep(2)}
                disabled={!canContinue}
              >
                Continue to ingredients
              </button>
            </div>
          </section>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Step 2 · Preferences
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                Tell us which ingredients you want to include.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                We will prioritize these foods when building meal suggestions.
              </p>
            </div>

            {step === 2 ? (
              <div className="space-y-6">
                <IngredientSearch onSelectionChange={setSelectedIngredients} />
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        Generate your meal plan
                      </p>
                      <p className="text-xs text-zinc-500">
                        Uses your calorie target and preferred ingredients.
                      </p>
                    </div>
                    <button
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                        mealPlanStatus === "loading"
                          ? "cursor-wait bg-zinc-200 text-zinc-500"
                          : "bg-emerald-600 text-white hover:bg-emerald-500"
                      }`}
                      type="button"
                      onClick={generateMealPlan}
                      disabled={mealPlanStatus === "loading"}
                    >
                      {mealPlanStatus === "loading"
                        ? "Generating..."
                        : "Generate meal plan"}
                    </button>
                  </div>
                  {mealPlanError ? (
                    <p className="mt-4 text-sm text-red-600">{mealPlanError}</p>
                  ) : null}
                </div>

                {mealPlanStatus === "success" && mealPlan.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    {mealPlan.map((meal) => (
                      <article
                        key={meal.id}
                        className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
                      >
                        {meal.image ? (
                          <img
                            src={meal.image}
                            alt={meal.title}
                            className="h-40 w-full object-cover"
                          />
                        ) : null}
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-900">
                              {meal.title}
                            </h3>
                            <p className="mt-1 text-xs text-zinc-500">
                              {meal.readyInMinutes
                                ? `${meal.readyInMinutes} min`
                                : "Quick meal"}
                              {meal.servings ? ` · ${meal.servings} servings` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
                            <span className="rounded-full bg-zinc-100 px-2 py-1">
                              Calories {meal.nutrition.calories ?? "—"}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2 py-1">
                              Protein {meal.nutrition.protein ?? "—"}g
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2 py-1">
                              Carbs {meal.nutrition.carbs ?? "—"}g
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2 py-1">
                              Fat {meal.nutrition.fat ?? "—"}g
                            </span>
                          </div>
                          {meal.sourceUrl ? (
                            <a
                              className="mt-auto text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                              href={meal.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View recipe
                            </a>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
                {mealPlanStatus === "success" && mealPlan.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                    No recipes matched the current filters. Try removing some
                    ingredients or adjusting your macro targets.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                Complete step 1 to unlock ingredient selection.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
