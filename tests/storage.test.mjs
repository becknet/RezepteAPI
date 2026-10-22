import test from "node:test";
import assert from "node:assert/strict";
import { loadState, saveState } from "../js/storage.js";
function memory() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
}
test("state survives save and reload", () => {
  const store = memory();
  const state = {
    pantry: ["Rice"],
    basics: ["Salt"],
    favorites: [{ idMeal: "1", strMeal: "Meal" }],
    shopping: [
      {
        key: "rice",
        name: "Rice",
        checked: true,
        sources: [{ id: "1", recipe: "Meal", measure: "1 cup" }],
      },
    ],
  };
  assert.equal(saveState(state, store), true);
  assert.deepEqual(loadState(store).state, state);
});
test("denied and corrupt storage fail gracefully", () => {
  const denied = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
  };
  assert.equal(loadState(denied).available, false);
  assert.equal(saveState({}, denied), false);
  assert.equal(loadState({ getItem: () => "{bad" }).available, false);
});
test("malformed persisted fields do not enter the UI state", () => {
  const store = {
    getItem: () =>
      JSON.stringify({
        pantry: [null, 2, "Rice"],
        basics: ["Secret", "Salt"],
        favorites: [null, {}, { idMeal: "<bad>", strMeal: "x" }],
        shopping: [{ key: "x", name: "x", sources: [null] }],
      }),
  };
  assert.deepEqual(loadState(store).state, {
    pantry: ["Rice"],
    basics: ["Salt"],
    favorites: [],
    shopping: [],
  });
});
