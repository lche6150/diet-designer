"use client";

import { useEffect, useMemo, useState } from "react";
import {
  activityOptions,
  calculateNutrition,
  Goal,
  NutritionResult,
} from "../lib/nutrition";

type FormState = {
  age: string;
  weightKg: string;
  heightCm: string;
  gender: "male" | "female";
  activity: (typeof activityOptions)[number]["value"];
  goal: Goal;
};

const defaultForm: FormState = {
  age: "",
  weightKg: "",
  heightCm: "",
  gender: "male",
  activity: "moderate",
  goal: "maintain",
};

const numberFormatter = new Intl.NumberFormat("en-US");

type NutritionCalculatorProps = {
  onResultChange?: (result: NutritionResult | null) => void;
};

export default function NutritionCalculator({
  onResultChange,
}: NutritionCalculatorProps) {
  const [form, setForm] = useState<FormState>(defaultForm);

  const result = useMemo<NutritionResult | null>(() => {
    const age = Number(form.age);
    const weightKg = Number(form.weightKg);
    const heightCm = Number(form.heightCm);

    const validNumbers =
      Number.isFinite(age) &&
      Number.isFinite(weightKg) &&
      Number.isFinite(heightCm) &&
      age > 0 &&
      weightKg > 0 &&
      heightCm > 0;

    if (!validNumbers) {
      return null;
    }

    return calculateNutrition({
      age,
      weightKg,
      heightCm,
      gender: form.gender,
      activity: form.activity,
      goal: form.goal,
    });
  }, [form]);

  useEffect(() => {
    onResultChange?.(result);
  }, [onResultChange, result]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">Daily nutrition calculator</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Share your body metrics and activity level. We will estimate your
          calories and macro split for the day.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Age
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              name="age"
              type="number"
              min={10}
              placeholder="e.g. 28"
              value={form.age}
              onChange={handleInputChange}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Gender
            <select
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              name="gender"
              value={form.gender}
              onChange={handleInputChange}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Weight (kg)
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              name="weightKg"
              type="number"
              min={30}
              step="0.1"
              placeholder="e.g. 68"
              value={form.weightKg}
              onChange={handleInputChange}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            Height (cm)
            <input
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              name="heightCm"
              type="number"
              min={120}
              placeholder="e.g. 175"
              value={form.heightCm}
              onChange={handleInputChange}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 sm:col-span-2">
            Activity level
            <select
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              name="activity"
              value={form.activity}
              onChange={handleInputChange}
            >
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 sm:col-span-2">
            Goal
            <select
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              name="goal"
              value={form.goal}
              onChange={handleInputChange}
            >
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain weight</option>
              <option value="gain">Build muscle</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-8">
        <h3 className="text-lg font-semibold text-emerald-900">Your estimate</h3>
        <p className="mt-2 text-sm text-emerald-800">
          Results update instantly once all fields are filled in.
        </p>

        {result ? (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl bg-white/80 p-4">
              <p className="text-sm font-medium text-emerald-900">Daily calories</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">
                {numberFormatter.format(result.calories)} kcal
              </p>
              <p className="mt-2 text-xs text-emerald-700">
                BMR: {numberFormatter.format(result.bmr)} kcal · TDEE:
                {" "}
                {numberFormatter.format(result.tdee)} kcal
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/80 p-4">
                <p className="text-xs font-medium text-emerald-800">Protein</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">
                  {result.proteinGrams} g
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-4">
                <p className="text-xs font-medium text-emerald-800">Carbs</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">
                  {result.carbGrams} g
                </p>
              </div>
              <div className="rounded-xl bg-white/80 p-4">
                <p className="text-xs font-medium text-emerald-800">Fat</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">
                  {result.fatGrams} g
                </p>
              </div>
            </div>

            <p className="text-xs text-emerald-700">
              These numbers are a starting point. Adjust based on progress and
              medical guidance.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-emerald-200 bg-white/60 p-6 text-sm text-emerald-800">
            Enter your age, weight, and height to see calorie and macro targets.
          </div>
        )}
      </section>
    </div>
  );
}
