import test from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  ingredientsOf,
  compareMeal,
  sortMatches,
  validateIngredient,
  mergeShopping,
} from "../js/matching.js";
const meal = {
  idMeal: "1",
  strMeal: "Rice Bowl",
  strIngredient1: " Chicken ",
  strMeasure1: "200 g",
  strIngredient2: "Rice",
  strMeasure2: "1 cup",
  strIngredient3: "Salt",
  strMeasure3: "Pinch",
  strIngredient4: null,
  strIngredient5: " ",
};
test("normalization and ingredients handle whitespace, nulls and empty fields", () => {
  assert.equal(normalize("  Olive   OIL "), "olive oil");
  assert.equal(ingredientsOf(meal).length, 3);
  assert.equal(ingredientsOf(meal)[0].measure, "200 g");
});
test("pantry comparison includes basics but does not assume quantities or synonyms", () => {
  const result = compareMeal(meal, [" chicken "], ["Salt"]);
  assert.equal(result.present.length, 2);
  assert.deepEqual(
    result.missing.map((item) => item.name),
    ["Rice"],
  );
  assert.equal(compareMeal(meal, ["Chicken Breast"]).present.length, 0);
});
test("validation rejects unknown, duplicate, malformed and seventh ingredients", () => {
  const catalogue = ["Chicken", "Rice", "Salt"];
  assert.match(validateIngredient("", catalogue, []).error, /Gib/);
  assert.match(validateIngredient("<Rice>", catalogue, []).error, /gültigen/);
  assert.match(validateIngredient("Reis", catalogue, []).error, /kennen/);
  assert.match(
    validateIngredient(" RICE ", catalogue, ["Rice"]).error,
    /bereits/,
  );
  assert.match(
    validateIngredient("Salt", catalogue, ["a", "b", "c", "d", "e", "f"]).error,
    /6/,
  );
  assert.equal(
    validateIngredient(" chicken ", catalogue, []).ingredient,
    "Chicken",
  );
});
test("sorting prioritizes missing count, then present count, then name without mutation", () => {
  const a = { meal: { strMeal: "A" }, present: [1], missing: [1] };
  const b = { meal: { strMeal: "B" }, present: [1, 2], missing: [1] };
  const c = { meal: { strMeal: "C" }, present: [], missing: [] };
  const original = [a, b, c];
  assert.deepEqual(sortMatches(original), [c, b, a]);
  assert.deepEqual(original, [a, b, c]);
  assert.deepEqual(sortMatches(original, "available"), [b, a, c]);
  assert.deepEqual(sortMatches(original, "name"), [a, b, c]);
});
test("shopping merges names while preserving recipe quantities and preventing duplicates", () => {
  let list = mergeShopping([], [{ name: "Rice", measure: "1 cup" }], meal);
  list[0].checked = true;
  list = mergeShopping(list, [{ name: "rice", measure: "1 cup" }], meal);
  assert.equal(list.length, 1);
  assert.equal(list[0].sources.length, 1);
  assert.equal(list[0].checked, true);
  const next = mergeShopping(list, [{ name: " RICE ", measure: "200 g" }], {
    idMeal: "2",
    strMeal: "Other",
  });
  assert.equal(next[0].sources.length, 2);
  assert.equal(next[0].checked, false);
  assert.equal(next[0].sources[1].measure, "200 g");
  assert.equal(list[0].sources.length, 1);
});
