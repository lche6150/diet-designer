type SpoonacularNutrient = {
  name: string;
  amount: number;
  unit: string;
};

type SpoonacularRecipe = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  nutrition?: {
    nutrients?: SpoonacularNutrient[];
  };
};

type SpoonacularSearchResponse = {
  results: SpoonacularRecipe[];
};

export type MealPlanRequest = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients?: string[];
};

export type MealPlanRecipe = {
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

const nutrientNames = {
  calories: "Calories",
  protein: "Protein",
  carbs: "Carbohydrates",
  fat: "Fat",
};

const getSpoonacularApiKey = () => {
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (!apiKey) {
    throw new Error("SPOONACULAR_API_KEY is not set");
  }

  return apiKey;
};

const extractNutrient = (
  nutrients: SpoonacularNutrient[] = [],
  name: string
) => {
  return nutrients.find((nutrient) => nutrient.name === name)?.amount;
};

const mapRecipe = (recipe: SpoonacularRecipe): MealPlanRecipe => {
  const nutrients = recipe.nutrition?.nutrients ?? [];

  return {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    sourceUrl: recipe.sourceUrl,
    nutrition: {
      calories: extractNutrient(nutrients, nutrientNames.calories),
      protein: extractNutrient(nutrients, nutrientNames.protein),
      carbs: extractNutrient(nutrients, nutrientNames.carbs),
      fat: extractNutrient(nutrients, nutrientNames.fat),
    },
  };
};

type SearchOptions = {
  includeMacros: boolean;
  includeIngredients: boolean;
};

export const generateMealPlan = async (request: MealPlanRequest) => {
  const perMealCalories = Math.max(300, Math.round(request.calories / 3));
  const minProtein = Math.round((request.protein / 3) * 0.6);
  const minCarbs = Math.round((request.carbs / 3) * 0.4);
  const minFat = Math.round((request.fat / 3) * 0.3);

  const trimmedIngredients = (request.ingredients ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  const fetchMeals = async (options: SearchOptions) => {
    const params = new URLSearchParams({
      apiKey: getSpoonacularApiKey(),
      number: "3",
      addRecipeInformation: "true",
      addRecipeNutrition: "true",
      maxCalories: String(perMealCalories + 150),
    });

    if (options.includeMacros) {
      params.set("minProtein", String(minProtein));
      params.set("minCarbs", String(minCarbs));
      params.set("minFat", String(minFat));
    }

    if (options.includeIngredients && trimmedIngredients.length > 0) {
      params.set("includeIngredients", trimmedIngredients.join(","));
    }

    const response = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Failed to generate meal plan");
    }

    const data = (await response.json()) as SpoonacularSearchResponse;
    return (data.results ?? []).map(mapRecipe);
  };

  const attempts: SearchOptions[] = [];

  if (trimmedIngredients.length > 0) {
    attempts.push({ includeMacros: true, includeIngredients: true });
    attempts.push({ includeMacros: false, includeIngredients: true });
  }

  attempts.push({ includeMacros: false, includeIngredients: false });

  for (const attempt of attempts) {
    const meals = await fetchMeals(attempt);
    if (meals.length > 0) {
      return meals;
    }
  }

  return [];
};
