/** @typedef {import("./matching.js").AppState} AppState */

const KEY = "vorratskueche-v1";
/**
 * Erzeugt einen leeren App-Zustand mit neuen Arrays für jeden Aufruf.
 * @returns {AppState} Unabhängiger Ausgangszustand ohne gespeicherte Nutzerdaten.
 */
const empty = () => ({ pantry: [], basics: [], favorites: [], shopping: [] });
/**
 * Liest den App-Schlüssel, parst JSON und übernimmt nur passend strukturierte Werte.
 * Begrenzt den Vorrat auf sechs Einträge und erlaubt nur bekannte Grundzutaten.
 * Ein fehlender Eintrag ist normal; Lese-/JSON-Fehler liefern einen leeren Zustand.
 * @param {Pick<Storage, "getItem">} [storage] - Lesespeicher; standardmässig localStorage.
 * @returns {{state: AppState, available: boolean}} Geladener/bereinigter Zustand.
 *   available ist false bei nicht lesbaren oder ungültigen Daten; true beweist
 *   nicht, dass späteres Schreiben möglich ist. Es werden keine Daten zurückgeschrieben.
 */
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
/**
 * Serialisiert den Zustand als JSON und ersetzt ausschliesslich den App-Schlüssel.
 * Fängt auch gesperrten Speicher und überschrittene Speicherquoten ab.
 * @param {AppState} state - Zu speichernder App-Zustand.
 * @param {Pick<Storage, "setItem">} [storage] - Schreibspeicher; standardmässig localStorage.
 * @returns {boolean} true bei erfolgreicher Speicherung, sonst false.
 */
export function saveState(state, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
/**
 * Entfernt ausschliesslich die gespeicherten Daten dieser App aus localStorage.
 * Andere Schlüssel bleiben erhalten; der Zustand im Arbeitsspeicher bleibt unverändert.
 * @returns {boolean} true bei erfolgreichem Entfernen, sonst false.
 */
export function clearState() {
  try {
    globalThis.localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
