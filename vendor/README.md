# Bootstrap CSS

Bootstrap **5.3.3**, MIT-Lizenz (Lizenzhinweis im CSS-Kopf).
Original: https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css
Projekt und Lizenz: https://github.com/twbs/bootstrap/blob/v5.3.3/LICENSE

Das eingebundene CSS wurde mit **PurgeCSS 8.0.0** anhand von `index.html` und `js/*.js` auf tatsächlich verwendete Selektoren reduziert: 232803 → 19658 Bytes. Eigenes CSS bleibt separat und wird nicht bereinigt. Das ist eine bewusste Performance-Verbesserung für E9; es bleibt Bootstrap und wird als Bibliothek vor dem eigenen Stylesheet geladen.

Bei zusätzlichen Bootstrap-Klassen erneut aus dem vollständigen Original erzeugen. Beispiel (temporäre Werkzeuge, kein App-Build erforderlich):

```sh
mkdir -p /tmp/vorratskueche-bootstrap
curl -sS -L https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css -o /tmp/vorratskueche-bootstrap/bootstrap.min.css
npm exec --yes --package=purgecss@8.0.0 -- purgecss --css /tmp/vorratskueche-bootstrap/bootstrap.min.css --content index.html 'js/*.js' --output vendor
```

Dynamisch zusammengesetzte Klassennamen müssten gegebenenfalls als Safelist ergänzt werden. In dieser Version stehen die verwendeten Bootstrap-Klassen vollständig als Text im HTML oder JavaScript.
