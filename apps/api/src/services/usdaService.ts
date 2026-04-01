type UsdaNutrient = {
  nutrientId: number;
  nutrientName: string;
  value?: number;
  unitName?: string;
};

type UsdaFood = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  foodNutrients?: UsdaNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
};

type UsdaSearchResponse = {
  foods: UsdaFood[];
};

export type IngredientSearchResult = {
  id: number;
  name: string;
  brand?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrients: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
};

const nutrientIds = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
};

const getUsdaApiKey = () => {
  const apiKey = process.env.USDA_API_KEY;

  if (!apiKey) {
    throw new Error("USDA_API_KEY is not set");
  }

  return apiKey;
};

const extractNutrient = (nutrients: UsdaNutrient[] = [], id: number) => {
  return nutrients.find((nutrient) => nutrient.nutrientId === id)?.value;
};

const mapFood = (food: UsdaFood): IngredientSearchResult => {
  const nutrients = food.foodNutrients ?? [];

  return {
    id: food.fdcId,
    name: food.description,
    brand: food.brandOwner,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    nutrients: {
      calories: extractNutrient(nutrients, nutrientIds.calories),
      protein: extractNutrient(nutrients, nutrientIds.protein),
      carbs: extractNutrient(nutrients, nutrientIds.carbs),
      fat: extractNutrient(nutrients, nutrientIds.fat),
    },
  };
};

export const searchFoods = async (query: string) => {
  const params = new URLSearchParams({
    query,
    api_key: getUsdaApiKey(),
    pageSize: "12",
  });

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch USDA foods");
  }

  const data = (await response.json()) as UsdaSearchResponse;
  return (data.foods ?? []).map(mapFood);
};
