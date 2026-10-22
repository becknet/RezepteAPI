export const normalize = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
export function ingredientsOf(meal) {
  return Array.from({ length: 20 }, (_, index) => ({
    name: String(meal[`strIngredient${index + 1}`] ?? "").trim(),
    measure: String(meal[`strMeasure${index + 1}`] ?? "").trim(),
  })).filter((item) => item.name);
}
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
