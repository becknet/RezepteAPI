# Prüfprotokoll – Vorratsküche

Datum: 22.10.2026. Geprüft wurde die lokale App unter `http://127.0.0.1:8080/` über einen Python-HTTP-Server, mit Chromium über Playwright MCP. Das Protokoll beschreibt tatsächlich ausgeführte Prüfungen; es bestätigt keine öffentliche Veröffentlichung oder schulische Abnahme.

## Automatisierte Prüfung

| Prüfung                       | Ergebnis                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`               | Alle vier JavaScript-Module syntaktisch gültig.                                                                             |
| `npm test`                    | **18 Tests bestanden**, keine fehlgeschlagen/übersprungen; Node.js 26.11.0 lokal. Workflow ist für Node.js 22 eingerichtet. |
| HTML-Validate, Standardregeln | `index.html`: **0 Fehler** im abschliessenden Lauf.                                                                         |

Die Tests prüfen: Normalisierung und leere API-Zutatenfelder, Mengenübernahme, Vorrat einschliesslich Basics, unbekannte und doppelte Eingaben, Sechsergrenze, Sortierprioritäten, unveränderte Ausgangslisten, Einkaufslisten-Zusammenführung, HTTP-/JSON-Fehler, URL-Kodierung, Null-Antworten, maximal vier parallele Aufgaben, Kandidaten-Deduplizierung und -Priorisierung, 60er-Grenze, Teilausfälle, Abbruch, wiederholbare fehlgeschlagene Anfragen, erneutes Laden nach leerem Katalog und fehlerhafte/nicht verfügbare Speicherung.

## Browser-Funktionsprüfung

| Szenario                                           | Datenquelle                                 | Ergebnis                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Zutatenkatalog laden                               | Echte TheMealDB API                         | Erfolgreich; Vorschläge und Eingabefeld verfügbar.                                                                                          |
| Chicken + Rice suchen                              | Echte TheMealDB API                         | **47 Kandidaten/Rezepte** erfolgreich geprüft; Filter- und Detailanfragen HTTP 200. Momentaufnahme, keine garantierte künftige Trefferzahl. |
| Doppelte Zutat `Rice`                              | Echte Katalogdaten                          | Passende Dublettenmeldung, kein weiterer Chip.                                                                                              |
| Unbekannte Zutat `Reis`                            | Echte Katalogdaten                          | Hinweis zur Auswahl aus den englischen Vorschlägen.                                                                                         |
| Siebte Suchzutat                                   | Kontrollierter Katalog                      | Abgelehnt, sechs Chips bleiben erhalten.                                                                                                    |
| Filter «Alles da» ohne passenden Volltreffer       | Echte Rezepte                               | Verständlicher leerer Zustand; Rückkehr zu «Alle Rezepte» zeigt Karten.                                                                     |
| Rezeptdialog, Kochhäkchen                          | Echte Rezepte                               | Titel und Zutaten vorhanden; Häkchen bedienbar.                                                                                             |
| Escape und Fokus-Rückkehr                          | Echte Rezepte                               | Dialog schliesst, Fokus kehrt zur auslösenden Rezeptkarte zurück.                                                                           |
| Modalität                                          | Echte Rezepte, mobile Ansicht               | Tab-Fokus bleibt im geöffneten Dialog.                                                                                                      |
| Favorit, Einkaufsliste und Häkchen nach Reload     | Echte Rezepte                               | Ein Favorit, vier fehlende Zutaten und gesetztes Einkaufshäkchen bleiben erhalten.                                                          |
| Salz als Basis                                     | Echte Rezepte                               | Checkbox bedienbar und neuer Vergleich nach erneuter Suche möglich.                                                                         |
| Zutatenquelle blockiert, anschliessend Wiederholen | Netzwerk gezielt unterbrochen               | Meldung, deaktivierte Eingabe und Retry; nach Freigabe wieder erfolgreich.                                                                  |
| Browserspeicher gesperrt                           | Storage-Methoden gezielt blockiert          | Sichtbarer Hinweis, App startet und bleibt bedienbar.                                                                                       |
| Leere Suche                                        | Kontrollierte `meals: null`-Antwort         | Verständliche Meldung ohne Rezeptkarten.                                                                                                    |
| HTTP 503 bei Suche                                 | Kontrollierte HTTP-Antwort                  | Fehlermeldung; erneute Suche bleibt möglich.                                                                                                |
| Ein Detailausfall bei zwei Kandidaten              | Kontrollierte HTTP-Antworten                | Verbleibender Treffer und sichtbarer Hinweis auf unvollständige Ergebnisse.                                                                 |
| Überlappende Suchen mit verzögerter erster Antwort | Kontrollierte verzögerte Antworten          | Neue Ergebnisse bleiben stehen; alte Antwort überschreibt sie nicht.                                                                        |
| Reduzierte Bewegung                                | Emuliertes `prefers-reduced-motion: reduce` | Kartentransition beträgt `0s`.                                                                                                              |

Die kontrollierten Netzwerk-/Storage-Eingriffe erfolgten nur in separaten Testseiten und sind nicht Bestandteil des App-Codes. Live-Suchen beweisen den tatsächlichen API-Zugriff; kontrollierte Antworten machen Fehlerzustände reproduzierbar.

## Visuelle und responsive Prüfung

- **Desktop 1200 px und 1440 × 1000:** Navigation, Vorrat, mehrspaltige Karten und Dialog geprüft; kein horizontaler Überlauf. Screenshot visuell kontrolliert.
- **Mobil 390 × 844:** Einspaltige Anordnung, Formular, Filter, Karten und Rezeptdialog geprüft; Dokumentbreite 390 px, kein horizontaler Überlauf. Dialog-Inhaltsbreite und Scrollbreite jeweils 356 px. Screenshot visuell kontrolliert.
- Fokusmarkierungen, Escape, Rückkehrfokus und reduzierte Bewegung geprüft. Kein vollständiger Screenreader-Test und keine Prüfung auf physischem iOS-/Android-Gerät erfolgt.
- Reguläre Live-Nutzung: keine Konsolenfehler oder Warnungen. Bewusst simulierte Netzwerkfehler sind erwartete Fehlerfälle und werden separat bewertet.

## Lighthouse (lokal, mobile Simulation)

Lighthouse über headless Chrome; geprüft wurde der initiale Seitenaufruf, **nicht** eine abgeschlossene Suchergebnisliste.

| Kategorie      | Vor Optimierung | Nach Optimierung |
| -------------- | --------------- | ---------------- |
| Performance    | 85              | **100**          |
| Accessibility  | 100             | **100**          |
| Best Practices | 100             | **100**          |
| SEO            | 100             | **100**          |

Abschliessende Messwerte: First Contentful Paint 1,2 s; Largest Contentful Paint 1,4 s; Total Blocking Time 0 ms; Cumulative Layout Shift 0,002. Ergebnisse hängen von Gerät, Netz, API und Hosting ab. Lokale Scores sind keine Produktionsgarantie und kein Nachweis vollständiger Barrierefreiheit oder Suchmaschinenindexierung.

### Umgesetzte Verbesserungen

1. HTML-Prüfung meldete fehlende explizite Button-/Input-Typen, eine unzulässige ARIA-Beschriftung auf einem generischen Element, doppelte Checkboxnamen und rohe Sonderzeichen. Typen, Gruppenrolle, eindeutige Namen und Zeichenkodierung korrigiert; abschliessender Validatorlauf fehlerfrei.
2. Lighthouse fand überwiegend ungenutztes Bootstrap-CSS. CSS mit PurgeCSS 8.0.0 auf die verwendeten Selektoren reduziert: **232803 → 19658 Bytes** (rund 92 % weniger). Lizenzhinweis erhalten. Danach Dialog, Buttons, Suche und responsive Darstellung erneut geprüft.
3. Ein ungültiger leerer Zutatenkatalog konnte sonst im Sitzungscache verbleiben. Der Cacheeintrag wird jetzt verworfen, sodass Retry tatsächlich neue Daten laden kann; Regressionstest ergänzt.

Lighthouse-JSON und Screenshots liegen lokal im ignorierten Verzeichnis `.playwright-mcp/`. Temporäre QA-Werkzeuge unter `/tmp/rezepteapi-qa/` gehören nicht zur App und sind für die Nutzung nicht erforderlich.

Die Funktion «Lokale App-Daten löschen» wurde ebenfalls geprüft: Vorrat, Favoriten- und Einkaufslistenzähler zurückgesetzt; der App-Schlüssel im Browserspeicher ist danach entfernt.

## Veröffentlichung und offene Nachweise

**GitHub Pages noch nicht veröffentlicht.** Der Ordner hat bisher kein Git-Repository und kein bestätigtes Zielrepository. Der geprüfte Quellcode und `.github/workflows/pages.yml` sind vorbereitet. Der Workflow führt Syntaxprüfung und Tests vor dem Packaging aus und lädt ausschliesslich die öffentlichen App-Dateien hoch.

Nach Einrichtung ergänzen:

- Repository / Commit:
- Erfolgreicher GitHub-Actions-Lauf:
- Öffentliche Pages-URL:
- Datum und Ergebnis der Prüfung auf der öffentlichen Seite:

E10 ist erst nach dem erfolgreichen öffentlichen Workflow und einer Prüfung der ausgelieferten App nachgewiesen. Persönliches Lernjournal, mündliche Erklärung und schulische Bewertung bleiben separate Leistungen.


## Ergänzender Playwright-Test: Eier, Nüsse und Pasta

Erneut am 22.10.2026 mit echten API-Daten geprüft. Separate Browserseiten verwendeten einen eigenen Storage-Schlüssel; vorhandene Nutzerdaten wurden nicht überschrieben. Die Testdaten wurden anschliessend entfernt.

| Vorrat | Ergebnis der Live-Suche |
| --- | --- |
| Eggs | 101 Kandidaten; 60 untersucht und angezeigt. Begrenzung sichtbar. |
| Walnuts | 11 Rezepte, unter anderem Walnut Stuffed Figs und Canadian Butter Tarts. |
| Cashew Nuts | 3 Rezepte, unter anderem Cashew Ghoriba Biscuits und Tofu, greens & cashew stir-fry. |
| Penne Pasta | Katalogeintrag existiert, aber API liefert keine Treffer; korrekter leerer Zustand. |
| Spaghetti | 5 Rezepte, unter anderem Spaghetti alla Carbonara. |
| Penne Rigate | 1 Rezept: Spicy Arrabiata Penne. |
| Eggs + Walnuts + Penne Pasta | 108 Kandidaten; 60 geprüft und angezeigt. |
| Eggs + Walnuts + Spaghetti | 113 Kandidaten; 60 geprüft und angezeigt, darunter Spaghetti alla Carbonara. |
| Beispiel Tomatoes + Spaghetti | Beide Zutaten übernommen, 22 Rezeptkarten. |

Die Zahlen sind Momentaufnahmen der externen Datenquelle. Die Suche verbindet Zutaten mit ODER und zeigt auch Rezepte, die nur eine der Zutaten enthalten.

Zusätzlich geprüft:

- In der ersten Testserie alle Karten-Zutatenzähler unabhängig mit den aufgezeichneten API-Rezeptdetails verglichen: keine Abweichung.
- Rezept Home-made Mandazi geöffnet: drei fehlende Zutaten übernommen; genau drei Einkaufslisteneinträge. Einkaufshäkchen bleibt nach Reload gesetzt.
- Alphabetische Sortierung überprüft; Favorit speichern und in Favoritenansicht öffnen erfolgreich.
- Filter «Max. 2 fehlen» bei Eggs + Walnuts + Spaghetti liefert null Treffer; Rückkehr zu «Alle Rezepte» stellt die Karten wieder her. Dieser Fall bestätigt den leeren Filterzustand, nicht einen nichtleeren Filtertreffer.
- Mobile Breite 390 px: kein horizontaler Überlauf.
- Keine JavaScript-Laufzeitfehler und keine unerwartet fehlgeschlagenen Netzwerkanfragen in den regulären Testläufen.

Gefundener und behobener Fehler: Der alte Beispielbutton «Tomatoes + Pasta» verwendete die nicht im Katalog vorhandene Zutat Pasta und verwarf sie stillschweigend. Jetzt verwendet er die nachweislich unterstützte Zutat Spaghetti. Falls eine Beispielzutat künftig fehlt, gibt die App einen Hinweis aus und übernimmt nicht stillschweigend nur einen Teil. Ein noch eingegebener Suchtext wird beim Auswählen eines Beispiels zurückgesetzt.

Penne Pasta ist dagegen ein Datenproblem des Anbieters: Sowohl die Anfrage mit Leerzeichen als auch mit Unterstrich lieferte keine Rezepte. Die App behandelt dies als leeres Ergebnis. Es wurde keine automatische Gleichsetzung verschiedener Pastasorten eingeführt.

Nach der Korrektur erneut erfolgreich: JavaScript-Syntaxprüfung, alle 18 automatisierten Tests und HTML-Validierung. Der Lighthouse-Lauf oben stammt aus der vorhergehenden Prüfung und wurde bei dieser Funktionserweiterungsprüfung nicht wiederholt.
