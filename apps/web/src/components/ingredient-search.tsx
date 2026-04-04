"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "../lib/auth";

export type IngredientResult = {
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

type SearchState = "idle" | "loading" | "error" | "success";

type IngredientSearchProps = {
  onSelectionChange?: (items: IngredientResult[]) => void;
};

const formatValue = (value?: number, unit = "g") => {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value as number)} ${unit}`;
};

export default function IngredientSearch({
  onSelectionChange,
}: IngredientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IngredientResult[]>([]);
  const [selected, setSelected] = useState<IngredientResult[]>([]);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [status, setStatus] = useState<SearchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(selected.map((item) => item.id)),
    [selected]
  );

  useEffect(() => {
    onSelectionChange?.(selected);
  }, [onSelectionChange, selected]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/ingredients/search?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? "Failed to fetch ingredients");
      }

      const payload = (await response.json()) as { foods: IngredientResult[] };
      setResults(payload.foods ?? []);
      setResultsCollapsed(false);
      setStatus("success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch ingredients";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  const toggleSelect = (item: IngredientResult) => {
    if (selectedIds.has(item.id)) {
      setSelected((prev) => prev.filter((entry) => entry.id !== item.id));
      return;
    }

    setSelected((prev) => [...prev, item]);
  };

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Preferred ingredients</h2>
        <p className="text-sm text-zinc-600">
          Search the USDA FoodData Central catalog and select ingredients you
          want included in your plan.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex w-full flex-col gap-2 text-sm font-medium text-zinc-700">
          Ingredient search
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
            placeholder="Search for foods (e.g. salmon, oats, spinach)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </label>
        <button
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          type="button"
          onClick={handleSearch}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Searching..." : "Search"}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Search results
            </p>
            <div className="flex items-center gap-3">
              {status === "success" ? (
                <span className="text-xs text-zinc-500">
                  {results.length} results
                </span>
              ) : null}
              {status === "success" && results.length > 0 ? (
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                  type="button"
                  onClick={() => setResultsCollapsed((prev) => !prev)}
                  aria-expanded={!resultsCollapsed}
                >
                  <span
                    className={`inline-block transition-transform duration-300 ${
                      resultsCollapsed ? "rotate-0" : "rotate-180"
                    }`}
                  >
                    ^
                  </span>
                  {resultsCollapsed ? "Show results" : "Hide results"}
                </button>
              ) : null}
            </div>
          </div>

          {status === "success" && results.length === 0 ? (
            <p className="text-sm text-zinc-500">No results found.</p>
          ) : null}

          {resultsCollapsed && status === "success" && results.length > 0 ? (
            <p className="text-sm text-zinc-500">
              {results.length} results hidden. Show them again to continue
              selecting ingredients.
            </p>
          ) : null}

          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
              resultsCollapsed
                ? "grid-rows-[0fr] opacity-0 -translate-y-2"
                : "grid-rows-[1fr] opacity-100 translate-y-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="space-y-3">
              {results.map((item) => {
                const selectedItem = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-4 py-4 transition ${
                      selectedItem
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          {item.name}
                        </p>
                      </div>
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          selectedItem
                            ? "bg-emerald-600 text-white hover:bg-emerald-500"
                            : "border border-zinc-200 text-zinc-700 hover:border-zinc-300"
                        }`}
                        type="button"
                        onClick={() => toggleSelect(item)}
                      >
                        {selectedItem ? "Selected" : "Add"}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
                        Calories {formatValue(item.nutrients.calories, "kcal")}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
                        Protein {formatValue(item.nutrients.protein)}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
                        Carbs {formatValue(item.nutrients.carbs)}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">
                        Fat {formatValue(item.nutrients.fat)}
                      </span>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>

        <aside className="self-start md:sticky md:top-6">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Selected ingredients
            </p>
            <span className="text-xs text-zinc-500">{selected.length} items</span>
          </div>
          {selected.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              Select foods from the results to build your preferred list.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-zinc-700 shadow-sm"
                >
                  {item.name}
                  <button
                    className="text-zinc-400 hover:text-zinc-600"
                    type="button"
                    onClick={() => toggleSelect(item)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          </div>
        </aside>
      </div>
    </section>
  );
}
