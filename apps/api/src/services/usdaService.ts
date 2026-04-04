type UsdaNutrient = {
  nutrientId: number;
  nutrientName: string;
  value?: number;
  unitName?: string;
};

type UsdaFood = {
  fdcId: number;
  description: string;
  dataType?: string;
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
  servingSize?: number;
  servingSizeUnit?: string;
  nutrients: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
};

type RankedIngredientSearchResult = IngredientSearchResult & {
  dataType?: string;
};

const nutrientIds = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
};

const genericDataTypes = ["Foundation", "SR Legacy", "Survey (FNDDS)"];
const resultLimit = 12;
const searchPageSize = 25;

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

const normalizeName = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
};

const getNutritionScore = (food: IngredientSearchResult) => {
  return [
    food.nutrients.calories,
    food.nutrients.protein,
    food.nutrients.carbs,
    food.nutrients.fat,
  ].filter((value) => Number.isFinite(value)).length;
};

const getDataTypeScore = (dataType?: string) => {
  switch (dataType) {
    case "Foundation":
      return 4;
    case "SR Legacy":
      return 3;
    case "Survey (FNDDS)":
      return 2;
    case "Branded":
      return 0;
    default:
      return 1;
  }
};

const getQueryMatchScore = (foodName: string, query: string) => {
  const normalizedName = normalizeName(foodName);
  const normalizedQuery = normalizeName(query);

  if (normalizedName === normalizedQuery) {
    return 3;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 2;
  }

  if (normalizedName.includes(normalizedQuery)) {
    return 1;
  }

  return 0;
};

const choosePreferredFood = (
  current: RankedIngredientSearchResult,
  candidate: RankedIngredientSearchResult
) => {
  const currentDataTypeScore = getDataTypeScore(current.dataType);
  const candidateDataTypeScore = getDataTypeScore(candidate.dataType);

  if (candidateDataTypeScore !== currentDataTypeScore) {
    return candidateDataTypeScore > currentDataTypeScore ? candidate : current;
  }

  const currentScore = getNutritionScore(current);
  const candidateScore = getNutritionScore(candidate);

  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }

  const currentServing = current.servingSize ?? 0;
  const candidateServing = candidate.servingSize ?? 0;

  if (candidateServing !== currentServing) {
    return candidateServing > currentServing ? candidate : current;
  }

  return current;
};

const dedupeFoods = (foods: RankedIngredientSearchResult[]) => {
  const deduped = new Map<string, RankedIngredientSearchResult>();

  for (const food of foods) {
    const key = normalizeName(food.name);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, food);
      continue;
    }

    deduped.set(key, choosePreferredFood(existing, food));
  }

  return Array.from(deduped.values());
};

const sortFoods = (foods: RankedIngredientSearchResult[], query: string) => {
  return [...foods].sort((left, right) => {
    const dataTypeDifference =
      getDataTypeScore(right.dataType) - getDataTypeScore(left.dataType);

    if (dataTypeDifference !== 0) {
      return dataTypeDifference;
    }

    const queryMatchDifference =
      getQueryMatchScore(right.name, query) - getQueryMatchScore(left.name, query);

    if (queryMatchDifference !== 0) {
      return queryMatchDifference;
    }

    const nutritionDifference =
      getNutritionScore(right) - getNutritionScore(left);

    if (nutritionDifference !== 0) {
      return nutritionDifference;
    }

    const servingDifference = (right.servingSize ?? 0) - (left.servingSize ?? 0);

    if (servingDifference !== 0) {
      return servingDifference;
    }

    return left.name.localeCompare(right.name);
  });
};

const mapFood = (food: UsdaFood): RankedIngredientSearchResult => {
  const nutrients = food.foodNutrients ?? [];

  return {
    id: food.fdcId,
    name: food.description,
    dataType: food.dataType,
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

const searchFoodsByDataType = async (query: string, dataTypes?: string[]) => {
  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(getUsdaApiKey())}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        pageSize: searchPageSize,
        ...(dataTypes?.length ? { dataType: dataTypes } : {}),
      }),
    }
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      throw new Error(
        payload?.message || payload?.error || "Failed to fetch USDA foods"
      );
    }

    throw new Error("Ingredient search is temporarily unavailable");
  }

  const data = (await response.json()) as UsdaSearchResponse;
  return (data.foods ?? []).map(mapFood);
};

export const searchFoods = async (query: string) => {
  // Search generic USDA datasets first so ingredient picks do not get buried
  // under packaged brand variants. Branded foods only fill gaps.
  const genericFoods = await searchFoodsByDataType(query, genericDataTypes);
  const brandedFoods =
    genericFoods.length >= resultLimit
      ? []
      : await searchFoodsByDataType(query, ["Branded"]);

  return sortFoods(dedupeFoods([...genericFoods, ...brandedFoods]), query)
    .slice(0, resultLimit)
    .map(({ dataType: _dataType, ...food }) => food);
};
