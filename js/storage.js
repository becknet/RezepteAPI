const KEY = "vorratskueche-v1";
const empty = () => ({ pantry: [], basics: [], favorites: [], shopping: [] });
export function loadState(storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = storage.getItem(KEY);
    if (!raw) return { state: empty(), available: true };
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object") throw new Error("Invalid state");
    const state = empty();
    state.pantry = Array.isArray(value.pantry)
      ? [
          ...new Set(
            value.pantry.filter(
              (item) => typeof item === "string" && item.length <= 100,
            ),
          ),
        ].slice(0, 6)
      : [];
    state.basics = Array.isArray(value.basics)
      ? value.basics.filter((item) =>
          ["Salt", "Pepper", "Olive Oil"].includes(item),
        )
      : [];
    state.favorites = Array.isArray(value.favorites)
      ? value.favorites.filter(
          (item) =>
            item &&
            typeof item.idMeal === "string" &&
            /^\d+$/.test(item.idMeal) &&
            typeof item.strMeal === "string",
        )
      : [];
    state.shopping = Array.isArray(value.shopping)
      ? value.shopping
          .filter(
            (item) =>
              item &&
              typeof item.key === "string" &&
              typeof item.name === "string" &&
              Array.isArray(item.sources) &&
              item.sources.every(
                (source) =>
                  source &&
                  typeof source.id === "string" &&
                  typeof source.recipe === "string" &&
                  typeof source.measure === "string",
              ),
          )
          .map((item) => ({ ...item, checked: item.checked === true }))
      : [];
    return { state, available: true };
  } catch {
    return { state: empty(), available: false };
  }
}
export function saveState(state, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function clearState() {
  try {
    globalThis.localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
