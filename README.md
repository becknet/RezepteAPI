# Vorratsküche

Eine statische Rezepte-App für Modul 291: Was kann ich mit meinen vorhandenen Zutaten kochen, und was fehlt noch?

## Lokal starten

Voraussetzungen: aktueller Browser, Python 3; für Tests zusätzlich Node.js 22 oder neuer. Keine npm-Abhängigkeiten, kein Build und kein API-Server erforderlich.

```sh
cd /Users/danielbrodbeck/Sites/RezepteAPI
npm run serve
```

Dann **http://localhost:8080/** öffnen. Alternativ `python3 -m http.server 8080`. Nicht über `file://` starten: ES-Module benötigen eine HTTP-Umgebung.

```sh
npm run check
npm test
```

## Benutzung

1. Bis zu sechs englische Zutaten wählen und mit `+` oder Enter hinzufügen. Ein noch nicht hinzugefügter gültiger Eintrag wird beim Suchen übernommen.
2. Salz, Pfeffer und Olivenöl bei Bedarf separat als vorhanden markieren.
3. **Rezepte entdecken** wählen. Nach fehlenden Zutaten filtern oder die Sortierung ändern.
4. Rezept öffnen, Zutaten beim Kochen abhaken, Favorit speichern oder Fehlendes auf die Einkaufsliste übernehmen.
5. In der Einkaufsliste Erledigtes abhaken und entfernen.

Vorrat, Favoriten und Einkaufsliste bleiben im lokalen Browserspeicher. Kochhäkchen bleiben nur während der aktuellen Sitzung. Unter **Datenschutz & Hinweise** können die eigenen lokalen App-Daten gelöscht werden. Andere Daten derselben Domain werden dabei nicht gelöscht.

## Aufbau und Datenfluss

- `index.html`: semantische Oberfläche, Formulare, native Dialoge und aufklappbare Bereiche.
- `css/style.css`: Gestaltung, responsive Grid-/Flex-Layouts, Fokus und reduzierte Bewegung.
- `js/app.js`: DOM, Ereignisse, Ansichten und Suchzustände.
- `js/api.js`: asynchrone GET-Anfragen, Timeout, Abbruch, Cache und begrenzte Parallelität.
- `js/matching.js`: reine Funktionen für Validierung, Zutatenvergleich, Sortierung und Einkaufsliste.
- `js/storage.js`: geprüfte lokale Speicherung mit Fehlerbehandlung.
- `vendor/bootstrap.min.css`: lokal eingebundenes, auf die verwendeten Klassen reduziertes Bootstrap 5.3.3 unter MIT-Lizenz, Herkunft: https://getbootstrap.com/.

Formulareingaben → englische API-Zutat → URLSearchParams → Filter pro Zutat → Rezept-IDs zusammenführen → bis zu 60 Details laden → Vorrat vergleichen → sortieren/filtern → DOM erzeugen.

## API und Grenzen

[TheMealDB API](https://www.themealdb.com/api.php), V1, Testschlüssel `1` für Entwicklungs-/Bildungsnutzung:

- `list.php?i=list`: Zutatenkatalog.
- `filter.php?i=Chicken`: Rezeptkandidaten je Zutat.
- `lookup.php?i=52772`: vollständige Rezeptdaten.

Die Suchzutaten werden mit **ODER** verbunden: Ein Rezept kann nur eine davon enthalten. Kandidaten, die in mehreren Zutatenfiltern vorkommen, erhalten bei der begrenzten Auswahl Vorrang. Danach sortiert der lokale Vergleich standardmässig nach wenigsten fehlenden Zutaten, dann meisten vorhandenen Zutaten, dann Name. Maximal 60 Detailanfragen pro Suche, maximal vier gleichzeitig; erfolgreiche Antworten werden bis zum Neuladen zwischengespeichert. Der Cache ist keine dauerhafte Offlinefunktion.

Beim Vergleich werden Gross-/Kleinschreibung und Leerzeichen vereinheitlicht. Synonyme, Varianten wie `Chicken`/`Chicken Breast`, Ersatzprodukte, Allergene und ausreichende Mengen werden nicht erkannt. Olivenöl gilt nur als `Olive Oil`, nicht als jedes Öl. Originalmengen werden nicht umgerechnet. Einmalige Zutatenlisten eines Rezepts bleiben beim erneuten Übernehmen auf die Einkaufsliste ohne Duplikate; Mengen verschiedener Rezepte bleiben separat.

Timeout: 18 Sekunden pro HTTP-Anfrage. Fehler einzelner Filter/Details werden als unvollständige Ergebnisse angezeigt. Veraltete Suchläufe werden abgebrochen und zusätzlich mit einer Versionsnummer abgesichert. Alle externen Texte werden mit `textContent` statt `innerHTML` eingesetzt. Bild- und Videoadressen werden auf HTTPS und erlaubte Anbieter geprüft.

Die App sendet Zutatenanfragen an TheMealDB. Rezeptbilder werden von TheMealDB geladen. Keine Analytics, kein Benutzerkonto und keine eingebetteten YouTube-Player. TheMealDB kann Daten und Nutzungsbedingungen ändern. Für eine spätere kommerzielle/Appstore-Veröffentlichung den passenden API-Zugang mit dem Anbieter klären.

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` prüft bei Push auf `main` die JavaScript-Dateien und führt die Tests aus. Nur bei Erfolg werden **ausschliesslich** `index.html`, `favicon.svg`, `css/`, `js/` und `vendor/` als Pages-Artefakt veröffentlicht. Das Kompetenzraster-PDF, Dokumentation und Testdateien gelangen nicht in das Deployment.

Einrichtung:

1. Gewünschtes GitHub-Repository anlegen oder verbinden; Hauptbranch `main` verwenden.
2. In **Settings → Pages → Build and deployment → Source** `GitHub Actions` wählen.
3. Projektdateien committen und auf `main` pushen. Das PDF ist in `.gitignore` ausgeschlossen.
4. Unter **Actions** den Lauf prüfen und die dort ausgegebene Pages-URL öffnen. Suche, Bildpfade und Dialoge auf der öffentlichen Seite nochmals testen.

Alle App-Pfade sind relativ und funktionieren auch unter `https://KONTO.github.io/REPOSITORY/`. Ein manueller Start ist über **Actions → Run workflow** möglich. Für Rollback einen bekannten guten Stand wiederherstellen und erneut veröffentlichen. Die lokale erfolgreiche Prüfung ersetzt keinen nachgewiesenen Pages-Deploy.

## Modulnachweise

- [Kompetenzmatrix und Fachgespräch](docs/KOMPETENZEN.md)
- [Prüfprotokoll](docs/PRUEFPROTOKOLL.md)
- [Lernjournal-Vorlage](docs/LERNJOURNAL.md)

Die App stellt Projektbeispiele für E1–E10 bereit. E10 ist erst mit einem tatsächlich erfolgreichen öffentlichen Workflow nachgewiesen. Die mündliche Erklärung und die persönliche Lernleistung sind separat zu erbringen; die Matrix ist keine Notengarantie.
