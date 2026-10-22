/** @typedef {import("./matching.js").Meal} Meal */

/**
 * @typedef {Object} RequestOptions
 * @property {AbortSignal} [signal] - Optionaler Abbruch durch den aufrufenden Code.
 * @property {typeof fetch} [fetcher] - HTTP-Funktion; standardmässig fetch, in Tests ersetzbar.
 */

/**
 * @typedef {Object} SearchOptions
 * @property {AbortSignal} [signal] - Abbruchsignal für den gesamten Suchlauf.
 * @property {(done: number, total: number) => void} [onProgress] - Meldung nach
 *   jeder beendeten Detailaufgabe, einschliesslich fehlgeschlagener Aufgaben.
 * @property {typeof fetch} [fetcher] - Optionaler HTTP-Ersatz für kontrollierte Tests.
 */

const BASE = "https://www.themealdb.com/api/json/v1/1/";
const cache = new Map();
/**
 * Lädt ein API-Array per GET und speichert erfolgreiche Antworten im Sitzungscache.
 * Kodiert Parameter, prüft HTTP-Status und JSON-Hülle und behandelt meals: null
 * als leere Liste. Jede echte Anfrage hat ein Timeout von 18 Sekunden.
 * @param {string} endpoint - Relativer API-Pfad, beispielsweise "filter.php".
 * @param {Object<string, string>} params - Als Queryparameter zu sendende Werte.
 * @param {RequestOptions} [options={}] - Abbruchsignal und optionaler HTTP-Ersatz.
 * @returns {Promise<Array<Object>>} Einträge aus dem meals-Feld, ggf. aus dem Cache.
 * @throws {Error} Bei HTTP-/Datenfehlern; JSON-, Netzwerk-, Timeout- und Abbruchfehler
 *   werden als abgelehntes Promise weitergegeben.
 */
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
/**
 * Lädt den Zutatenkatalog, bereinigt Namen, entfernt identische Einträge und
 * sortiert alphabetisch. Ein leerer Katalog wird aus dem Cache entfernt,
 * damit ein weiterer Versuch neue Daten abrufen kann.
 * @param {RequestOptions} [options] - Optionen für die HTTP-Anfrage.
 * @returns {Promise<string[]>} Nichtleere, alphabetisch sortierte Zutatenliste.
 * @throws {Error} Bei leerem Katalog oder einem Fehler der API-Anfrage.
 */
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
/**
 * Führt Aufgaben mit begrenzter Parallelität aus und sammelt auch Einzelfehler.
 * Die Ergebnisreihenfolge entspricht der Eingabe, nicht der Abschlussreihenfolge.
 * @template T, R
 * @param {T[]} items - Zu verarbeitende Eingaben.
 * @param {number} limit - Maximale Parallelität; muss eine positive ganze Zahl sein.
 * @param {(item: T, index: number) => R|Promise<R>} task - Aufgabe pro Eingabe.
 * @returns {Promise<PromiseSettledResult<R>[]>} Erfolg oder Fehler jeder Aufgabe.
 */
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
/**
 * Führt Rezept-IDs mehrerer Zutatenfilter zusammen und zählt Treffer pro Filter.
 * Ungültige IDs und doppelte IDs innerhalb eines Filters werden übersprungen.
 * Sortiert nach Treffern absteigend und anschliessend nach ID aufsteigend.
 * @param {Array<Array<{idMeal?: string}|null>>} groups - API-Treffer je Suchzutat.
 * @returns {Array<{id: string, hits: number}>} Eindeutige, priorisierte Kandidaten.
 */
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
/**
 * Sucht Rezeptkandidaten für mindestens eine Zutat mit ODER-Verknüpfung.
 * Lädt höchstens 60 priorisierte Details mit bis zu vier gleichzeitigen Aufgaben.
 * Teilausfälle bleiben im Ergebnis sichtbar; vollständige Ausfälle brechen die Suche ab.
 * @param {string[]} ingredients - Nichtleere Liste der API-Zutatennamen.
 * @param {SearchOptions} [options={}] - Abbruch, Fortschrittsmeldung und HTTP-Ersatz.
 * @returns {Promise<{meals: Meal[], total: number, examined: number, failures: number}>}
 *   Geladene Rezepte, Zahl aller Kandidaten, Zahl ausgewählter Details und Anzahl
 *   fehlgeschlagener Filter-/Detailabfragen. Ohne Treffer sind die Listen leer.
 * @throws {Error} Bei Abbruch, Ausfall aller Filter oder Ausfall aller ausgewählten
 *   Details. Fehler einzelner Abfragen werden stattdessen im Ergebnis gezählt.
 */
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
