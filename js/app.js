/**
 * @typedef {import("./matching.js").Meal} Meal
 * @typedef {import("./matching.js").MealMatch} MealMatch
 */

import { getIngredients, findRecipes } from "./api.js";
import {
  compareMeal,
  ingredientsOf,
  sortMatches,
  validateIngredient,
  mergeShopping,
} from "./matching.js";
import { loadState, saveState, clearState } from "./storage.js";
/**
 * Sucht das erste passende DOM-Element im Dokument.
 * @param {string} selector - Gültiger CSS-Selektor.
 * @returns {Element|null} Gefundenes Element oder null.
 */
const $ = (selector) => document.querySelector(selector);
/**
 * Erzeugt ein HTML-Element, ohne es bereits ins Dokument einzufügen.
 * Setzt Text über textContent, damit API-Texte nicht als HTML ausgeführt werden.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag - HTML-Tag des neuen Elements.
 * @param {string} [className] - Optionale CSS-Klassen, durch Leerzeichen getrennt.
 * @param {string} [text] - Optionaler Textinhalt.
 * @returns {HTMLElementTagNameMap[K]} Neues, noch nicht eingefügtes Element.
 */
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
let loaded;
try {
  loaded = loadState();
} catch {
  loaded = {
    state: { pantry: [], basics: [], favorites: [], shopping: [] },
    available: false,
  };
}
let state = loaded.state;
let catalogue = [],
  meals = [],
  controller,
  searchVersion = 0,
  activeView = "search",
  searchInfo = "",
  currentRecipe,
  returnFocus;
const checkedIngredients = new Map();
let toastTimer;
/**
 * Speichert den aktuellen App-Zustand und aktualisiert die Navigationszähler.
 * Blendet bei einem Speicherfehler den Hinweis zum flüchtigen Sitzungszustand ein.
 * @returns {void}
 */
function persist() {
  if (!saveState(state)) $("#storage-warning").hidden = false;
  updateCounts();
}
/**
 * Zeigt eine kurze, für assistive Technik angekündigte Statusmeldung.
 * Ersetzt eine vorherige Meldung und blendet den Hinweis nach 3,2 Sekunden aus.
 * @param {string} message - Anzuzeigender Text.
 * @returns {void}
 */
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3200);
}
/**
 * Aktualisiert die Anzahl gespeicherter Favoriten und noch offener Einkaufszutaten.
 * @returns {void}
 */
function updateCounts() {
  $("#favorite-count").textContent = state.favorites.length;
  $("#shopping-count").textContent = state.shopping.filter(
    (item) => !item.checked,
  ).length;
}
/**
 * Setzt die Fehlermeldung am Zutatenfeld und dessen aria-invalid-Zustand.
 * @param {string} [message=""] - Fehlermeldung; leer entfernt den Fehlerhinweis.
 * @returns {void}
 */
function setError(message = "") {
  $("#ingredient-error").textContent = message;
  $("#ingredient-input").setAttribute("aria-invalid", String(Boolean(message)));
}
/**
 * Zeichnet Vorrats-Chips, Grundzutaten-Checkboxen und Auswahlzähler aus dem Zustand.
 * Verknüpft die Entfernen-Buttons mit Vorratsaktualisierung und Rückkehr des Fokus.
 * @returns {void}
 */
function renderPantry() {
  $("#pantry-chips").replaceChildren(
    ...state.pantry.map((name) => {
      const chip = el("span", "chip");
      chip.append(document.createTextNode(name));
      const remove = el("button", "", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", `${name} entfernen`);
      remove.addEventListener("click", () => {
        state.pantry = state.pantry.filter((item) => item !== name);
        pantryChanged();
        $("#ingredient-input").focus();
      });
      chip.append(remove);
      return chip;
    }),
  );
  document.querySelectorAll("[data-basic]").forEach((input) => {
    input.checked = state.basics.includes(input.value);
  });
  $("#ingredient-help").textContent = catalogue.length
    ? `${state.pantry.length} von 6 Suchzutaten ausgewählt. Vorschläge sind auf Englisch.`
    : $("#ingredient-help").textContent;
}
/**
 * Reagiert auf Vorratsänderungen: verwirft laufende/überholte Suchen, aktualisiert
 * die Oberfläche, speichert den Vorrat und entfernt Eingabefehler.
 * Vorhandene Suchergebnisse werden geleert, damit keine veralteten Vergleiche bleiben.
 * @returns {void}
 */
function pantryChanged() {
  searchVersion++;
  controller?.abort();
  controller = undefined;
  $("#search-button").textContent = "Rezepte entdecken ↗";
  $("#results-panel").setAttribute("aria-busy", "false");
  $("#search-status").classList.remove("loading");
  if (meals.length) {
    meals = [];
    searchInfo = "";
    $("#search-status").textContent =
      "Dein Vorrat wurde geändert. Suche erneut nach passenden Rezepten.";
  } else $("#search-status").textContent = "";
  renderResults();
  renderPantry();
  persist();
  setError();
  if (activeView === "favorites") renderFavorites();
}
/**
 * Validiert den aktuellen Feldinhalt und fügt die gültige Katalogzutat zum Vorrat hinzu.
 * Aktualisiert Zustand, Speicherung und Darstellung; Fehler werden am Feld angezeigt.
 * @returns {boolean} true bei übernommener Zutat, false bei ungültiger Eingabe.
 */
function addIngredient() {
  const result = validateIngredient(
    $("#ingredient-input").value,
    catalogue,
    state.pantry,
  );
  if (result.error) {
    setError(result.error);
    $("#ingredient-input").focus();
    return false;
  }
  state.pantry.push(result.ingredient);
  $("#ingredient-input").value = "";
  pantryChanged();
  $("#ingredient-input").focus();
  return true;
}
/**
 * Lädt die Zutatenvorschläge und aktiviert danach das Eingabefeld samt Hinzufügen-Button.
 * Behandelt Ladefehler in der Oberfläche und bietet einen erneuten Versuch an.
 * @returns {Promise<void>} Erfüllt nach Aktualisierung des Lade- oder Fehlerzustands.
 */
async function loadCatalogue() {
  $("#retry-ingredients").hidden = true;
  $("#ingredient-help").textContent = "Zutaten werden geladen …";
  try {
    catalogue = await getIngredients();
    $("#ingredient-options").replaceChildren(
      ...catalogue.map((name) => {
        const option = el("option");
        option.value = name;
        return option;
      }),
    );
    $("#ingredient-input").disabled = false;
    $("#add-ingredient").disabled = false;
    renderPantry();
  } catch {
    $("#ingredient-help").textContent =
      "Die Zutatenliste konnte nicht geladen werden. Prüfe deine Verbindung.";
    $("#retry-ingredients").hidden = false;
  }
}
/**
 * Prüft eine optionale Adresse auf HTTPS und den für Bild/Video erlaubten Host.
 * Die Freigabe prüft die URL, nicht die Erreichbarkeit oder den Inhalt des Ziels.
 * @param {string|null|undefined} value - Adresse aus den Rezeptdaten.
 * @param {"image"|"video"} kind - Bestimmt die erlaubten Anbieter.
 * @returns {string|null} Geprüfte absolute Adresse oder null bei unzulässiger Adresse.
 */
function safeURL(value, kind) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (kind === "image" && url.hostname === "www.themealdb.com")
      return url.href;
    if (
      kind === "video" &&
      ["www.youtube.com", "youtube.com", "youtu.be"].includes(url.hostname)
    )
      return url.href;
  } catch {
    /* optional URL */
  }
  return null;
}
/**
 * Erstellt ein Rezeptbild mit Alternativtext, festen Ausgangsmassen und Ladestrategie.
 * Nicht ladbare Bilder werden ausgeblendet; unzulässige Adressen erzeugen kein Bild.
 * @param {Meal} meal - Rezept mit optionaler Bildadresse.
 * @param {string} className - CSS-Klassen für das Bild.
 * @param {boolean} [eager=false] - true lädt sofort, false erst bei Bedarf.
 * @returns {HTMLImageElement|null} Neues Bild oder null ohne zulässige Bildadresse.
 */
function imageFor(meal, className, eager = false) {
  const src = safeURL(meal.strMealThumb, "image");
  if (!src) return null;
  const img = el("img", className);
  img.src = src;
  img.alt = meal.strMeal;
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  img.width = 640;
  img.height = 420;
  img.addEventListener("error", () => {
    img.hidden = true;
  });
  return img;
}
/**
 * Prüft anhand der Rezept-ID, ob das Rezept im aktuellen Favoritenzustand liegt.
 * @param {string} id - Gesuchte Rezept-ID.
 * @returns {boolean} Ob das Rezept gespeichert ist.
 */
function isFavorite(id) {
  return state.favorites.some((meal) => meal.idMeal === id);
}
/**
 * Fügt ein Rezept als Favorit hinzu oder entfernt es und speichert den neuen Zustand.
 * Gleicht Herz-Buttons, ggf. Favoritenansicht und Rezeptdialog ab und meldet die Aktion.
 * @param {Meal} meal - Vollständiges Rezept für die lokale Favoritensammlung.
 * @returns {void}
 */
function toggleFavorite(meal) {
  const removing = isFavorite(meal.idMeal);
  state.favorites = removing
    ? state.favorites.filter((item) => item.idMeal !== meal.idMeal)
    : [...state.favorites, meal];
  persist();
  document.querySelectorAll("[data-favorite-id]").forEach((button) => {
    if (button.dataset.favoriteId === meal.idMeal) {
      button.setAttribute("aria-pressed", String(!removing));
      button.textContent = !removing ? "♥" : "♡";
      button.setAttribute(
        "aria-label",
        `${meal.strMeal}: ${!removing ? "aus Favoriten entfernen" : "als Favorit speichern"}`,
      );
    }
  });
  if (activeView === "favorites") renderFavorites();
  if (currentRecipe?.idMeal === meal.idMeal)
    $("#dialog-favorite").textContent = !removing
      ? "♥ Gespeichert"
      : "♡ Als Favorit speichern";
  toast(
    removing
      ? "Aus den Favoriten entfernt."
      : "In deinen Favoriten gespeichert.",
  );
}
/**
 * Baut eine Rezeptkarte mit Bild, Metadaten, Vorratsvergleich und Favoriten-Button.
 * Verknüpft die Buttons mit Dialog und Favoriten, fügt die Karte aber noch nicht ein.
 * @param {MealMatch} match - Rezept einschliesslich vorhandener und fehlender Zutaten.
 * @returns {HTMLElement} Neues article-Element der Rezeptkarte.
 */
function recipeCard(match) {
  const { meal, present, missing, ingredients } = match;
  const card = el("article", "recipe-card");
  const open = el("button", "card-open");
  open.type = "button";
  open.setAttribute("aria-label", `Rezept öffnen: ${meal.strMeal}`);
  const image = imageFor(meal, "recipe-image");
  if (image) open.append(image);
  const body = el("div", "card-body");
  body.append(
    el(
      "span",
      "card-meta",
      [meal.strArea, meal.strCategory].filter(Boolean).join(" · "),
    ),
    el("h3", "", meal.strMeal),
    el(
      "span",
      "match-badge",
      `${present.length} von ${ingredients.length} Zutaten vorhanden`,
    ),
    el(
      "p",
      "missing-line",
      missing.length
        ? `Fehlt: ${missing
            .slice(0, 3)
            .map((item) => item.name)
            .join(
              ", ",
            )}${missing.length > 3 ? ` + ${missing.length - 3} weitere` : ""}`
        : "Alles da. Bereit zum Kochen!",
    ),
  );
  open.append(body);
  open.addEventListener("click", () => showRecipe(meal));
  const favorite = el(
    "button",
    "favorite-button",
    isFavorite(meal.idMeal) ? "♥" : "♡",
  );
  favorite.type = "button";
  favorite.dataset.favoriteId = meal.idMeal;
  favorite.setAttribute("aria-pressed", String(isFavorite(meal.idMeal)));
  favorite.setAttribute(
    "aria-label",
    `${meal.strMeal}: ${isFavorite(meal.idMeal) ? "aus Favoriten entfernen" : "als Favorit speichern"}`,
  );
  favorite.addEventListener("click", () => toggleFavorite(meal));
  card.append(open, favorite);
  return card;
}
/**
 * Vergleicht mehrere Rezepte mit dem aktuellen Vorrat und den ausgewählten Basics.
 * @param {Meal[]} list - Zu vergleichende Rezepte.
 * @returns {MealMatch[]} Ein Vergleich pro Rezept in der ursprünglichen Reihenfolge.
 */
function matchesFor(list) {
  return list.map((meal) => compareMeal(meal, state.pantry, state.basics));
}
/**
 * Filtert und sortiert die geladenen Rezepte gemäss den aktuellen Bedienelementen.
 * Ersetzt Karten, Ergebniszähler und Hinweise; steuert den sichtbaren Anfangszustand.
 * Führt selbst keine neuen API-Abfragen aus.
 * @returns {void}
 */
function renderResults() {
  const limit = $("input[name=filter]:checked").value;
  const matches = sortMatches(
    matchesFor(meals).filter(
      (match) => limit === "all" || match.missing.length <= Number(limit),
    ),
    $("#sort-select").value,
  );
  $("#results-grid").replaceChildren(...matches.map(recipeCard));
  $("#results-tools").hidden = !meals.length;
  $("#initial-state").hidden = Boolean(
    meals.length || controller || searchInfo,
  );
  $("#result-count").textContent = meals.length
    ? `${matches.length} / ${meals.length} Rezepte`
    : "";
  if (meals.length && !matches.length)
    $("#results-grid").append(
      el(
        "p",
        "notice",
        "Für diesen Filter gibt es keine Treffer. Wähle «Alle Rezepte» oder ergänze deinen Vorrat.",
      ),
    );
}
/**
 * Übernimmt ggf. den Feldinhalt, prüft den Vorrat und startet eine neue Rezeptsuche.
 * Steuert Lade-/Fortschritts-/Fehleranzeigen und verhindert mit Abbruchsignal und
 * Versionsnummer, dass ein überholter Suchlauf die aktuelle Oberfläche verändert.
 * @param {SubmitEvent} [event] - Optionales Formularereignis; dessen Navigation wird verhindert.
 * @returns {Promise<void>} Erfüllt nach Ende dieses Suchlaufs oder frühzeitig bei
 *   ungültigen Eingaben. API-Fehler werden als Oberflächenmeldung behandelt.
 */
async function search(event) {
  event?.preventDefault();
  if ($("#ingredient-input").value.trim() && !addIngredient()) return;
  if (!state.pantry.length) {
    setError("Wähle mindestens eine Suchzutat aus.");
    $("#ingredient-input").focus();
    return;
  }
  controller?.abort();
  controller = new AbortController();
  const ownController = controller;
  // Ein abgebrochener Request kann bereits fertig sein: nur die aktuelle Version darf rendern.
  const version = ++searchVersion;
  meals = [];
  searchInfo = "";
  setError();
  $("#search-status").textContent = "Passende Rezepte werden gesucht …";
  $("#search-status").classList.add("loading");
  $("#search-button").textContent = "Suche läuft … ↗";
  $("#results-panel")?.setAttribute("aria-busy", "true");
  renderResults();
  try {
    const result = await findRecipes([...state.pantry], {
      signal: ownController.signal,
      onProgress: (done, total) => {
        if (version === searchVersion)
          $("#search-status").textContent =
            `${done} von ${total} Rezepten verglichen …`;
      },
    });
    if (version !== searchVersion) return;
    meals = result.meals;
    searchInfo = meals.length
      ? `${result.examined} Rezeptkandidaten geprüft.${result.total > 60 ? ` Auswahl aus ${result.total} Kandidaten; keine vollständige Datenbanksuche.` : ""}${result.failures ? ` ${result.failures} Abfragen fehlgeschlagen; die Ergebnisse sind unvollständig. Suche bei Bedarf erneut.` : ""}`
      : "Keine Rezepte gefunden. Versuche eine andere Zutat.";
    $("#search-status").textContent = searchInfo;
  } catch (error) {
    if (version === searchVersion) {
      searchInfo = "error";
      $("#search-status").textContent =
        error.name === "TimeoutError"
          ? "Die Anfrage hat zu lange gedauert. Bitte versuche es erneut."
          : "Die Suche konnte nicht abgeschlossen werden. Prüfe deine Verbindung und versuche es erneut.";
    }
  } finally {
    if (version === searchVersion) {
      controller = undefined;
      $("#results-panel").setAttribute("aria-busy", "false");
      $("#search-status").classList.remove("loading");
      $("#search-button").textContent = "Rezepte entdecken ↗";
      renderResults();
    }
  }
}
/**
 * Zeichnet gespeicherte Favoriten alphabetisch mit aktuellem Vorratsvergleich.
 * Zeigt bei leerer Sammlung einen Hinweis an.
 * @returns {void}
 */
function renderFavorites() {
  const grid = $("#favorites-grid");
  grid.replaceChildren(
    ...sortMatches(matchesFor(state.favorites), "name").map(recipeCard),
  );
  if (!state.favorites.length)
    grid.append(
      el(
        "p",
        "notice",
        "Noch keine Favoriten. Speichere Rezepte mit dem Herz auf der Rezeptkarte.",
      ),
    );
}
/**
 * Zeichnet Einkaufsliste, offene Anzahl und Verfügbarkeit der Aufräumaktion.
 * Verknüpft Häkchen und Entfernen-Buttons mit Zustand, Speicherung und Darstellung.
 * Rezeptbezogene Originalmengen werden getrennt angezeigt.
 * @returns {void}
 */
function renderShopping() {
  const list = $("#shopping-list");
  list.replaceChildren();
  $("#shopping-summary").textContent =
    `${state.shopping.filter((item) => !item.checked).length} Zutaten noch offen`;
  $("#clear-checked").disabled = !state.shopping.some((item) => item.checked);
  if (!state.shopping.length)
    list.append(
      el(
        "p",
        "notice",
        "Deine Einkaufsliste ist leer. Öffne ein Rezept und übernimm die fehlenden Zutaten.",
      ),
    );
  for (const item of state.shopping) {
    const row = el("div", `shopping-item${item.checked ? " done" : ""}`);
    const label = el("label", "shopping-check");
    const checkbox = el("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked;
    checkbox.addEventListener("change", () => {
      item.checked = checkbox.checked;
      row.classList.toggle("done", item.checked);
      persist();
      $("#shopping-summary").textContent =
        `${state.shopping.filter((entry) => !entry.checked).length} Zutaten noch offen`;
      $("#clear-checked").disabled = !state.shopping.some(
        (entry) => entry.checked,
      );
    });
    const text = el("span", "", item.name);
    item.sources.forEach((source) =>
      text.append(
        el(
          "small",
          "",
          `${source.measure || "Menge nach Rezept"} · ${source.recipe}`,
        ),
      ),
    );
    label.append(checkbox, text);
    const remove = el("button", "remove-item", "×");
    remove.type = "button";
    remove.setAttribute(
      "aria-label",
      `${item.name} von Einkaufsliste entfernen`,
    );
    remove.addEventListener("click", () => {
      state.shopping = state.shopping.filter((entry) => entry.key !== item.key);
      persist();
      renderShopping();
    });
    row.append(label, remove);
    list.append(row);
  }
}
/**
 * Wechselt die sichtbare Hauptansicht und kennzeichnet den aktiven Navigationsbutton.
 * Baut Favoriten oder Einkaufsliste beim Aufrufen mit dem aktuellen Zustand neu auf.
 * @param {"search"|"favorites"|"shopping"} view - Anzuzeigende Hauptansicht.
 * @returns {void}
 */
function switchView(view) {
  activeView = view;
  for (const name of ["search", "favorites", "shopping"])
    $(`#${name}-view`).hidden = name !== view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (view === "favorites") renderFavorites();
  if (view === "shopping") renderShopping();
}
/**
 * Baut und öffnet den modalen Rezeptdialog mit Zutaten, Anleitung und optionalem Video.
 * Verknüpft Einkaufslisten-/Favoritenaktionen und merkt Kochhäkchen nur in der Sitzung.
 * Merkt das auslösende Element für die Fokus-Rückkehr und fokussiert den Schliessen-Button.
 * @param {Meal} meal - Anzuzeigendes Rezept mit Detaildaten.
 * @returns {void}
 */
function showRecipe(meal) {
  currentRecipe = meal;
  returnFocus = document.activeElement;
  const match = compareMeal(meal, state.pantry, state.basics);
  const content = $("#recipe-content");
  content.replaceChildren();
  const image = imageFor(meal, "dialog-hero", true);
  if (image) content.append(image);
  const body = el("div", "dialog-body");
  body.append(
    el(
      "p",
      "eyebrow",
      [meal.strArea, meal.strCategory].filter(Boolean).join(" / "),
    ),
  );
  const title = el("h2", "", meal.strMeal);
  title.id = "recipe-title";
  body.append(
    title,
    el(
      "p",
      "muted small",
      `${match.present.length} von ${match.ingredients.length} Zutaten vorhanden. Mengen und Anleitung im Original.`,
    ),
  );
  const actions = el("div", "dialog-actions");
  const favorite = el(
    "button",
    "btn btn-outline-dark",
    isFavorite(meal.idMeal) ? "♥ Gespeichert" : "♡ Als Favorit speichern",
  );
  favorite.id = "dialog-favorite";
  favorite.type = "button";
  favorite.addEventListener("click", () => toggleFavorite(meal));
  const shopping = el(
    "button",
    "btn btn-primary",
    match.missing.length
      ? `${match.missing.length} fehlende Zutaten auf die Liste`
      : "Alle Zutaten vorhanden",
  );
  shopping.type = "button";
  shopping.disabled = !match.missing.length;
  shopping.addEventListener("click", () => {
    state.shopping = mergeShopping(state.shopping, match.missing, meal);
    persist();
    toast("Fehlende Zutaten sind auf deiner Einkaufsliste.");
  });
  actions.append(shopping, favorite);
  body.append(actions);
  const ingredientDetails = el("details", "recipe-details");
  ingredientDetails.open = true;
  ingredientDetails.append(el("summary", "", "Zutaten · beim Kochen abhaken"));
  const checked = checkedIngredients.get(meal.idMeal) ?? new Set();
  checkedIngredients.set(meal.idMeal, checked);
  ingredientsOf(meal).forEach((item, index) => {
    const label = el("label", "ingredient-check");
    const checkbox = el("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked.has(index);
    checkbox.addEventListener("change", () =>
      checkbox.checked ? checked.add(index) : checked.delete(index),
    );
    const text = el("span", "", `${item.measure} ${item.name}`.trim());
    text.append(
      el(
        "small",
        "",
        match.missing.some((missing) => missing.name === item.name)
          ? " · fehlt im Vorrat"
          : " · vorhanden",
      ),
    );
    label.append(checkbox, text);
    ingredientDetails.append(label);
  });
  const instructions = el("details", "recipe-details");
  instructions.open = true;
  instructions.append(el("summary", "", "Zubereitung · Schritt für Schritt"));
  const steps = el("ol", "instructions");
  String(meal.strInstructions ?? "")
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean)
    .forEach((step) => steps.append(el("li", "", step)));
  instructions.append(steps);
  body.append(ingredientDetails, instructions);
  const video = safeURL(meal.strYoutube, "video");
  if (video) {
    const link = el(
      "a",
      "btn btn-outline-dark mt-3",
      "Kochvideo auf YouTube ↗",
    );
    link.href = video;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    body.append(link);
  }
  content.append(body);
  $("#recipe-dialog").showModal();
  $("#close-recipe").focus();
}
$("#pantry-form").addEventListener("submit", search);
$("#ingredient-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addIngredient();
  }
});
$("#ingredient-input").addEventListener("input", () => setError());
$("#add-ingredient").addEventListener("click", addIngredient);
$("#retry-ingredients").addEventListener("click", loadCatalogue);
document.querySelectorAll("[data-basic]").forEach((input) =>
  input.addEventListener("change", () => {
    state.basics = [...document.querySelectorAll("[data-basic]:checked")].map(
      (item) => item.value,
    );
    pantryChanged();
  }),
);
document
  .querySelectorAll("[name=filter]")
  .forEach((input) => input.addEventListener("change", renderResults));
$("#sort-select").addEventListener("change", renderResults);
document
  .querySelectorAll("[data-view]")
  .forEach((button) =>
    button.addEventListener("click", () => switchView(button.dataset.view)),
  );
document.querySelectorAll("[data-example]").forEach((button) =>
  button.addEventListener("click", () => {
    if (!catalogue.length) {
      toast(
        "Die Zutatenliste wird noch benötigt. Bitte versuche es gleich erneut.",
      );
      return;
    }
    const example = button.dataset.example.split(",");
    if (example.some((name) => !catalogue.includes(name))) {
      toast("Eine Beispielzutat ist nicht mehr verfügbar. Wähle deine Zutaten bitte selbst aus.");
      return;
    }
    state.pantry = example;
    $("#ingredient-input").value = "";
    pantryChanged();
    search();
  }),
);
$("#close-recipe").addEventListener("click", () => $("#recipe-dialog").close());
$("#recipe-dialog").addEventListener("close", () => {
  currentRecipe = undefined;
  if (returnFocus?.isConnected) returnFocus.focus();
  else document.querySelector(`[data-view="${activeView}"]`).focus();
});
$("#privacy-button").addEventListener("click", () =>
  $("#privacy-dialog").showModal(),
);
$("#close-privacy").addEventListener("click", () =>
  $("#privacy-dialog").close(),
);
$("#clear-checked").addEventListener("click", () => {
  state.shopping = state.shopping.filter((item) => !item.checked);
  persist();
  renderShopping();
});
$("#delete-local").addEventListener("click", () => {
  controller?.abort();
  searchVersion++;
  controller = undefined;
  state = { pantry: [], basics: [], favorites: [], shopping: [] };
  meals = [];
  searchInfo = "";
  checkedIngredients.clear();
  const cleared = clearState();
  $("#delete-status").textContent = cleared
    ? "Deine lokalen App-Daten wurden gelöscht."
    : "Die Daten wurden für diese Sitzung gelöscht. Der Browserspeicher ist nicht zugänglich.";
  $("#search-status").textContent = "";
  $("#search-status").classList.remove("loading");
  $("#results-panel").setAttribute("aria-busy", "false");
  $("#search-button").textContent = "Rezepte entdecken ↗";
  $("#ingredient-input").value = "";
  setError();
  renderPantry();
  renderResults();
  renderFavorites();
  renderShopping();
  updateCounts();
});
if (!loaded.available) $("#storage-warning").hidden = false;
renderPantry();
updateCounts();
loadCatalogue();
