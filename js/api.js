const BASE = "https://www.themealdb.com/api/json/v1/1/";
const cache = new Map();
export async function request(
  endpoint,
  params,
  { signal, fetcher = fetch } = {},
) {
  const url = new URL(endpoint, BASE);
  url.search = new URLSearchParams(params).toString();
  const key = url.toString();
  if (cache.has(key)) return cache.get(key);
  const timeout = AbortSignal.timeout(18000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const response = await fetcher(url, { signal: combined });
  if (!response.ok)
    throw new Error(
      `Die Rezeptquelle antwortet mit HTTP ${response.status}. Bitte versuche es erneut.`,
    );
  const data = await response.json();
  if (
    !data ||
    !Object.hasOwn(data, "meals") ||
    (data.meals !== null && !Array.isArray(data.meals))
  )
    throw new Error("Die Rezeptquelle hat unerwartete Daten geliefert.");
  cache.set(key, data.meals ?? []);
  return data.meals ?? [];
}
export async function getIngredients(options) {
  const rows = await request("list.php", { i: "list" }, options);
  const names = [
    ...new Set(
      rows
        .map((row) => row?.strIngredient)
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim()),
    ),
  ].sort((a, b) => a.localeCompare(b));
  if (!names.length) {
    cache.delete(new URL("list.php?i=list", BASE).href);
    throw new Error(
      "Die Zutatenliste ist momentan leer. Bitte versuche es erneut.",
    );
  }
  return names;
}
export async function pool(items, limit, task) {
  let cursor = 0;
  const results = new Array(items.length);
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        try {
          results[index] = {
            status: "fulfilled",
            value: await task(items[index], index),
          };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    }),
  );
  return results;
}
export function rankCandidates(groups) {
  const candidates = new Map();
  for (const group of groups) {
    const seen = new Set();
    for (const row of group) {
      if (
        !row ||
        typeof row.idMeal !== "string" ||
        !/^\d+$/.test(row.idMeal) ||
        seen.has(row.idMeal)
      )
        continue;
      seen.add(row.idMeal);
      const entry = candidates.get(row.idMeal) ?? { id: row.idMeal, hits: 0 };
      entry.hits++;
      candidates.set(row.idMeal, entry);
    }
  }
  return [...candidates.values()].sort(
    (a, b) => b.hits - a.hits || a.id.localeCompare(b.id),
  );
}
export async function findRecipes(
  ingredients,
  { signal, onProgress = () => {}, fetcher } = {},
) {
  const options = { signal, fetcher };
  const filters = await pool(ingredients, 4, (ingredient) =>
    request("filter.php", { i: ingredient }, options),
  );
  signal?.throwIfAborted();
  const failures = filters.filter(
    (result) => result.status === "rejected",
  ).length;
  if (failures === filters.length) throw filters[0].reason;
  const candidates = rankCandidates(
    filters
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value),
  );
  const selected = candidates.slice(0, 60);
  let done = 0;
  const details = await pool(selected, 4, async ({ id }) => {
    signal?.throwIfAborted();
    try {
      const rows = await request("lookup.php", { i: id }, options);
      const meal = rows.find(
        (row) =>
          row?.idMeal === id &&
          typeof row.strMeal === "string" &&
          row.strMeal.trim() &&
          typeof row.strInstructions === "string",
      );
      if (!meal) throw new Error("Unvollständige Rezeptdaten");
      return meal;
    } finally {
      onProgress(++done, selected.length);
    }
  });
  signal?.throwIfAborted();
  const meals = details
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  if (selected.length && !meals.length)
    throw new Error(
      "Die Rezeptdetails konnten nicht geladen werden. Bitte suche erneut.",
    );
  return {
    meals,
    total: candidates.length,
    examined: selected.length,
    failures:
      failures +
      details.filter((result) => result.status === "rejected").length,
  };
}
