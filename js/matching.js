/**
 * Gemeinsame Datentypen für die Dokumentation der App.
 * Die Typimporte in anderen Dateien sind reine JSDoc-Verweise, keine HTTP-Imports.
 *
 * @typedef {Object} Meal
 * @property {string} idMeal - Eindeutige Rezept-ID von TheMealDB.
 * @property {string} strMeal - Originalname des Rezepts.
 * @property {string} [strInstructions] - Anleitung im Original.
 * @property {string|null} [strMealThumb] - Optionale Bildadresse.
 * @property {string|null} [strArea] - Optionale Länderküche.
 * @property {string|null} [strCategory] - Optionale Kategorie.
 * @property {string|null} [strYoutube] - Optionaler Videolink.
 * Die API liefert zusätzlich strIngredient1 bis strIngredient20 sowie
 * strMeasure1 bis strMeasure20, jeweils als Text, null oder fehlendes Feld.
 */

/**
 * @typedef {Object} Ingredient
 * @property {string} name - Zutatenname aus dem Rezept.
 * @property {string} measure - Mengenangabe im Original; kann leer sein.
 */

/**
 * @typedef {Object} MealMatch
 * @property {Meal} meal - Verglichenes Rezept.
 * @property {Ingredient[]} ingredients - Alle nichtleeren Zutaten des Rezepts.
 * @property {Ingredient[]} present - Im Vorrat vorhandene Zutaten.
 * @property {Ingredient[]} missing - Im Vorrat fehlende Zutaten.
 */

/**
 * @typedef {Object} ShoppingSource
 * @property {string} id - Rezept-ID.
 * @property {string} recipe - Rezeptname.
 * @property {string} measure - Originalmenge dieses Rezepts.
 */

/**
 * @typedef {Object} ShoppingItem
 * @property {string} key - Normalisierter Zutatenname zum Zusammenführen.
 * @property {string} name - Zutatenname zur Anzeige.
 * @property {boolean} checked - Ob der Einkauf bereits erledigt ist.
 * @property {ShoppingSource[]} sources - Rezeptbezogene Mengenangaben.
 */

/**
 * @typedef {Object} AppState
 * @property {string[]} pantry - Bis zu sechs ausgewählte Suchzutaten.
 * @property {string[]} basics - Ausgewählte Grundzutaten.
 * @property {Meal[]} favorites - Lokal gespeicherte Rezeptdaten.
 * @property {ShoppingItem[]} shopping - Einkaufsliste mit Erledigt-Status.
 */

/**
 * Vereinheitlicht einen Wert für den Zutatenvergleich: Rand-Leerzeichen entfernen,
 * mehrere Leerzeichen zusammenfassen und in Kleinbuchstaben umwandeln.
 * Erkennt weder Synonyme noch unterschiedliche Zutatenvarianten.
 * @param {unknown} value - Zu normalisierender Wert; null und undefined werden leer.
 * @returns {string} Vergleichbarer Text.
 */
export const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
/**
 * Wandelt die bis zu 20 nummerierten Zutaten-/Mengenfelder der API in eine Liste um.
 * Leere Zutaten werden verworfen; Mengen bleiben als Text im Original erhalten.
 * @param {Meal} meal - Rezept mit strIngredient1 bis strIngredient20 und Mengenfeldern.
 * @returns {Ingredient[]} Zutaten in der Reihenfolge des Rezepts.
 */
export function ingredientsOf(meal) {
  return Array.from({ length: 20 }, (_, index) => ({
    name: String(meal[`strIngredient${index + 1}`] ?? "").trim(),
    measure: String(meal[`strMeasure${index + 1}`] ?? "").trim(),
  })).filter((item) => item.name);
}
/**
 * Vergleicht die Rezeptzutaten mit Vorrat und ausgewählten Grundzutaten.
 * Prüft nur die normalisierten Namen, nicht Mengen, Synonyme oder Ersatzprodukte.
 * @param {Meal} meal - Zu vergleichendes Rezept.
 * @param {string[]} pantry - Vorhandene Suchzutaten.
 * @param {string[]} [basics=[]] - Zusätzlich vorhandene Grundzutaten.
 * @returns {MealMatch} Rezept und Aufteilung in vorhandene und fehlende Zutaten.
 */
export function compareMeal(meal, pantry, basics = []) {
  const available = new Set([...pantry, ...basics].map(normalize));
  const ingredients = ingredientsOf(meal);
  return {
    meal,
    ingredients,
    present: ingredients.filter((item) => available.has(normalize(item.name))),
    missing: ingredients.filter((item) => !available.has(normalize(item.name))),
  };
}
/**
 * Sortiert eine Kopie der Vergleiche nach fehlenden Zutaten, vorhandenen Zutaten
 * oder Rezeptnamen. Bei Gleichstand entscheiden die jeweils andere Zutatenzahl
 * und danach der Name; bei Namenssortierung zählt ausschliesslich der Name.
 * @param {MealMatch[]} matches - Zu sortierende Vergleiche; werden nicht verändert.
 * @param {"missing"|"available"|"name"} [mode="missing"] - Sortierreihenfolge.
 * @returns {MealMatch[]} Neu sortierte Liste.
 */
export function sortMatches(matches, mode = "missing") {
  return [...matches].sort((a, b) =>
    mode === "name"
      ? a.meal.strMeal.localeCompare(b.meal.strMeal)
      : mode === "available"
        ? b.present.length - a.present.length ||
          a.missing.length - b.missing.length ||
          a.meal.strMeal.localeCompare(b.meal.strMeal)
        : a.missing.length - b.missing.length ||
          b.present.length - a.present.length ||
          a.meal.strMeal.localeCompare(b.meal.strMeal),
  );
}
/**
 * Prüft Leerwert, Länge, unzulässige Zeichen, Katalogzugehörigkeit, Dubletten
 * und die Grenze von sechs Suchzutaten. Gibt den ersten Fehler zurück.
 * @param {string} value - Eingabe aus dem Zutatenfeld.
 * @param {string[]} catalogue - Erlaubte Namen aus dem API-Katalog.
 * @param {string[]} pantry - Bereits ausgewählte Suchzutaten.
 * @returns {{ingredient: string, error?: undefined}|{error: string, ingredient?: undefined}}
 *   Originalname aus dem Katalog bei Erfolg, sonst eine deutsche Fehlermeldung.
 */
export function validateIngredient(value, catalogue, pantry) {
  const clean = String(value).trim();
  if (!clean)
    return { error: "Gib eine Zutat ein oder wähle einen Vorschlag." };
  if (clean.length > 100 || /[\u0000-\u001f<>]/u.test(clean))
    return { error: "Bitte wähle einen gültigen Zutatennamen aus der Liste." };
  const ingredient = catalogue.find(
    (item) => normalize(item) === normalize(clean),
  );
  if (!ingredient)
    return {
      error:
        "Diese Zutat kennen wir nicht. Wähle einen Eintrag aus den Vorschlägen.",
    };
  if (pantry.some((item) => normalize(item) === normalize(ingredient)))
    return { error: `${ingredient} ist bereits in deinem Vorrat.` };
  if (pantry.length >= 6)
    return {
      error:
        "Du kannst bis zu 6 Suchzutaten wählen. Entferne zuerst eine Zutat.",
    };
  return { ingredient };
}
/**
 * Übernimmt fehlende Zutaten in eine Kopie der Einkaufsliste und bündelt gleiche
 * Namen. Rezeptquellen bleiben mit Originalmengen getrennt; dieselbe Rezept-ID
 * wird pro Zutat nur einmal ergänzt. Eine neue Quelle setzt das Erledigt-Häkchen zurück.
 * @param {ShoppingItem[]} existing - Bisherige Einkaufsliste; bleibt unverändert.
 * @param {Ingredient[]} missing - Zu übernehmende fehlende Zutaten.
 * @param {Meal} meal - Herkunftsrezept für Name und ID der Mengenangabe.
 * @returns {ShoppingItem[]} Neue Einkaufsliste ohne automatische Mengenaddition.
 */
export function mergeShopping(existing, missing, meal) {
  const result = structuredClone(existing);
  for (const item of missing) {
    const key = normalize(item.name);
    let entry = result.find((row) => row.key === key);
    if (!entry) {
      entry = { key, name: item.name, checked: false, sources: [] };
      result.push(entry);
    }
    if (!entry.sources.some((source) => source.id === meal.idMeal)) {
      entry.sources.push({
        id: meal.idMeal,
        recipe: meal.strMeal,
        measure: item.measure,
      });
      entry.checked = false;
    }
  }
  return result;
}
