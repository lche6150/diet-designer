export type Gender = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type Goal = "lose" | "maintain" | "gain";

export type NutritionInputs = {
  age: number;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  activity: ActivityLevel;
  goal: Goal;
};

export type NutritionResult = {
  bmr: number;
  tdee: number;
  calories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
};

export const activityOptions: Array<{
  value: ActivityLevel;
  label: string;
  multiplier: number;
}> = [
  {
    value: "sedentary",
    label: "Sedentary (little to no exercise)",
    multiplier: 1.2,
  },
  {
    value: "light",
    label: "Light (1-3 workouts per week)",
    multiplier: 1.375,
  },
  {
    value: "moderate",
    label: "Moderate (3-5 workouts per week)",
    multiplier: 1.55,
  },
  {
    value: "active",
    label: "Active (6-7 workouts per week)",
    multiplier: 1.725,
  },
  {
    value: "athlete",
    label: "Athlete (hard training + physical job)",
    multiplier: 1.9,
  },
];

const goalAdjustments: Record<Goal, number> = {
  lose: -450,
  maintain: 0,
  gain: 300,
};

const proteinTargets: Record<Goal, number> = {
  lose: 1.8,
  maintain: 1.6,
  gain: 1.7,
};

const getBmr = (inputs: NutritionInputs) => {
  const base = 10 * inputs.weightKg + 6.25 * inputs.heightCm - 5 * inputs.age;
  return inputs.gender === "male" ? base + 5 : base - 161;
};

export const calculateNutrition = (inputs: NutritionInputs): NutritionResult => {
  const bmr = getBmr(inputs);
  const activityMultiplier =
    activityOptions.find((option) => option.value === inputs.activity)?.multiplier ??
    1.2;
  const tdee = bmr * activityMultiplier;
  const calories = Math.round(tdee + goalAdjustments[inputs.goal]);
  const proteinGrams = Math.round(inputs.weightKg * proteinTargets[inputs.goal]);
  const fatGrams = Math.round((calories * 0.25) / 9);
  const carbCalories = calories - proteinGrams * 4 - fatGrams * 9;
  const carbGrams = Math.max(0, Math.round(carbCalories / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    proteinGrams,
    carbGrams,
    fatGrams,
  };
};
