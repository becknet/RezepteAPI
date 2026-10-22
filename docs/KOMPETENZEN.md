# Modul 291 – Kompetenznachweise

Grundlage: das lokal bereitgestellte Kompetenzraster 2026 Q2. Ziel: Erweitert (E1–E10), einschliesslich der dazugehörigen Grundlagen und fortgeschrittenen Fähigkeiten. Kompetenzen zählen laut Raster 75 %, das Lernjournal 25 %. Diese Zuordnung beschreibt vorhandene Beispiele und offene Nachweise, keine bereits erfolgte schulische Bewertung.

## Zuordnung zum Projekt

| Kompetenz                         | Projektbeleg                                                                                                    | Im Fachgespräch zeigen und erklären                                                                                                                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1 – Interaktive Formulare        | `index.html`, `js/app.js`: Vorschläge, Chips, Vorbelegung, Lade-/Fehlerzustand, Entfernung und erneute Suche    | Weshalb ein Zutatenkatalog Eingabefehler reduziert; wie sich Feld, Auswahl und Ergebnisse gegenseitig beeinflussen.                                                                                                                                                                |
| E2 – Komplexe Validierung         | `js/matching.js`: `validateIngredient`; `js/app.js`: `addIngredient`, `search`                                  | Leerwert, Zeichen-/Längenprüfung mit RegEx, Katalogmitgliedschaft, Normalisierung, Dubletten und Maximum kombinieren; pro Fall eine hilfreiche Meldung. RegEx allein genügt nicht zur fachlichen Prüfung.                                                                          |
| E3 – Formulardaten senden         | `js/app.js`: `search`; `js/api.js`: `request`, `findRecipes`                                                    | Gewählte Zutaten sammeln und mit `URLSearchParams` als GET-Query senden; die JSON-Antwort hängt vom Formular ab. Im Netzwerk-Tab URL, Methode und Antwort zeigen. Das Raster schreibt kein POST vor; die schulische Anerkennung dieses GET-Beispiels erfolgt durch die Lehrperson. |
| E4 – JSON verarbeiten             | `js/api.js`: `request`, `pool`, `rankCandidates`, `findRecipes`; `js/matching.js`: `compareMeal`, `sortMatches` | Asynchron laden, HTTP-/Datenfehler erkennen, IDs zusammenführen, Details aufbereiten, filtern/sortieren, Ergebnisse in Karten und Dialogen ausgeben. Abbruch und Versionsprüfung gegen veraltete Antworten erläutern.                                                              |
| E5 – UI/UX begründen              | `index.html`, `css/style.css`                                                                                   | Hauptaufgabe «Was kann ich kochen?» bestimmt Reihenfolge, Hierarchie und Rückmeldungen. Einstieg ohne Anmeldung; klare leere Zustände, Fokusmarkierungen, mobile Anordnung und erkennbare Quellen. Designentscheidungen mit einer konkreten Nutzungssituation begründen.           |
| E6 – Komplexe Elemente            | `js/app.js`: `showRecipe`; native `dialog` und `details`                                                        | Dialog für vertiefende Rezeptansicht, Accordion für Zutaten und Anleitung; Modalität, Escape, Fokus-Rückkehr und Tastaturbedienung demonstrieren.                                                                                                                                  |
| E7 – CSS-Bibliothek gezielt       | `vendor/bootstrap.min.css`, `css/style.css`                                                                     | Lokales Bootstrap liefert Container, Formulare, Buttons und Utilities; eigenes CSS definiert Farbwelt, Typografie, Grid/Flex und Breakpoints. Reihenfolge der Stylesheets und Kaskade erklären.                                                                                    |
| E8 – Komplexe Interaktionen       | `js/app.js`: Vorrat → Suche → Filter → Dialog → Einkaufsliste/Favoriten                                         | Das Zusammenspiel von Zustand, Ereignissen und neu gerendertem DOM erklären. Änderungen am Vorrat machen Suchergebnisse ungültig. Favoritenzähler, Einkaufsliste und Speicherung reagieren auf dieselben Daten.                                                                    |
| E9 – Qualität prüfen              | `tests/`, `docs/PRUEFPROTOKOLL.md`                                                                              | Tests und Browserprüfung vorführen; HTML-Validierung, Lighthouse, Tastatur- und Mobilprüfung unterscheiden. Einen gefundenen Fehler und seine Verbesserung anhand des Protokolls erläutern. Automatische Prüfungen allein beweisen keine vollständige Barrierefreiheit.            |
| E10 – Automatisch veröffentlichen | `.github/workflows/pages.yml`                                                                                   | Push → Syntaxprüfung → Tests → ausschliesslich App-Dateien paketieren → GitHub Pages. Secrets werden nicht im Frontend verwendet. **Offen bis zu einem erfolgreichen Workflow und Prüfung der öffentlichen URL.**                                                                  |

## Grundlagen und Fortgeschrittenes zum Erklären

### G1/G2, F1/F2: Formulare und Validierung

`input`, `datalist`, `checkbox`, `radio`, `select`, `button`, `label`, `fieldset` und `legend` haben unterschiedliche Aufgaben. Sichtbare Labels sind keine Platzhalter. Die clientseitige Validierung gibt schnelle Rückmeldung, lässt sich aber umgehen. Unsere App betreibt keinen eigenen schreibenden Server. Ein Backend müsste seine Eingaben selbst erneut prüfen; Browservalidierung wäre kein Sicherheitsersatz.

### G3/G4, F3/F4: HTTP und JSON

- Synchroner Ablauf wartet, asynchroner Ablauf lässt andere Aufgaben weiterlaufen. `await` pausiert die jeweilige async-Funktion, nicht die gesamte Browseroberfläche.
- GET liest Daten; POST übermittelt typischerweise Daten für Verarbeitung/Erstellung. Queryparameter werden URL-kodiert.
- Statuscodes: 200 Erfolg, 404 nicht gefunden, 429 zu viele Anfragen, 5xx Serverfehler. `fetch` verwirft sein Promise nicht automatisch bei HTTP 404: deshalb `response.ok` prüfen. Netzwerkfehler führen dagegen zur Ablehnung.
- SOP (Same-Origin Policy) beschränkt Zugriffe zwischen Origins. Eine Origin besteht aus Schema, Host und Port. CORS erlaubt dem Server, bestimmte fremde Origins zuzulassen. Der Client kann CORS nicht durch einen eigenen Request-Header abschalten. Erfolgreiche Browserabfragen an TheMealDB zeigen die aktuelle Freigabe für diese Umgebung.
- JSON beschreibt Objekt, Array, String, Zahl, Boolean und `null`. Kommentare, Funktionen und `undefined` gehören nicht zu JSON. `response.json()` ist asynchron; es kann bei ungültiger Antwort scheitern.
- Beispielstruktur: `{ "meals": [{ "idMeal": "1", "strMeal": "Example" }] }`. Kein Treffer kann `{ "meals": null }` sein. Für Zutaten und Details liefert dieselbe Hülle unterschiedliche Objekte.

### G5/G6, F5/F6: UI und UX

UI ist die sicht- und bedienbare Oberfläche; UX umfasst das Nutzungserlebnis, etwa Verständlichkeit, Rückmeldung und Aufwand. `header`, `nav`, `main`, `section`, `aside`, `article` und `footer` strukturieren Inhalte. Bilder, Überschriften und Texte zeigen Daten; Buttons lösen Aktionen aus; Links navigieren zu Zielen.

### G7/G8, F7/F8: CSS und Interaktion

Bootstrap wird mit `link` eingebunden; das eigene Stylesheet folgt danach. Grid ordnet Rezeptkarten und Arbeitsbereiche an, Flexbox Navigation und Chips. Media Queries verändern die Anordnung. `addEventListener`, `createElement`, `textContent`, `replaceChildren`, `classList`, `hidden`, `showModal` und `close` verbinden Zustand und DOM. Transitionen unterstützen Rückmeldung; `prefers-reduced-motion` deaktiviert unnötige Bewegung.

### G9/G10, F9/F10: Prüfen und Ausliefern

Syntax-, Logik-, Integrations-, visuelle und Zugänglichkeitsprüfungen beantworten unterschiedliche Fragen. Statisches Hosting liefert HTML/CSS/JS über HTTP(S); ein lokales Verzeichnis allein ist kein veröffentlichter Webauftritt. GitHub Actions ist der Automatisierungsprozess, GitHub Pages das Hosting. E10 erfordert einen tatsächlichen öffentlichen Lauf, nicht nur eine YAML-Datei.

## Kurze Demonstration

1. `Chicken` und `Rice` hinzufügen; `rice` erneut hinzufügen und die Validierung erklären.
2. Suche starten, im Netzwerk-Tab Filter und Detailantworten untersuchen.
3. Sortierung und Filter ändern; vorhandene und fehlende Zutaten vergleichen.
4. Rezept öffnen, Zutaten abhaken, fehlende Zutaten übernehmen und Favorit speichern.
5. Neuladen und Persistenz zeigen; Grenzen der Mengenerkennung erklären.
6. `npm test`, Prüfprotokoll und anschliessend den erfolgreichen Pages-Workflow zeigen.

## Verständnis-Selbstcheck

- Warum ist eine reine HTML-`required`-Prüfung hier nicht ausreichend?
- Warum verwenden wir beim Senden URLSearchParams und beim Anzeigen textContent?
- Warum sind vier parallele Anfragen sinnvoller als 60 gleichzeitig?
- Weshalb brauchen wir trotz AbortController noch eine Suchversionsnummer?
- Warum zählen Chicken und Chicken Breast nicht automatisch als dieselbe Zutat?
- Was bleibt beim Neuladen erhalten, und was nur in der Sitzung?
- Welche Prüfung würde ein späteres eigenes Backend zusätzlich benötigen?
- Welche Grenzen haben Lighthouse und unsere Tests?

Erst wenn du diese Fragen anhand des Codes erklären kannst, ist der persönliche Nachweis vorbereitet.
