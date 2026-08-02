# SenSeiS DAX Market Feed – letzte Aktivierung

Der technische Aufbau in SenSeiS Terminal und das private Google-Sheet sind fertig.

## 1. Apps Script im bestehenden Sheet öffnen

Google-Sheet öffnen:

`SenSeiS Market Feed – DAX 40`

Dann **Erweiterungen → Apps Script** wählen.

## 2. Fertigen Code einfügen

Den vorhandenen Inhalt in `Code.gs` vollständig löschen und den kompletten Inhalt aus dieser Repo-Datei einfügen:

`apps-script/Code.gs`

Speichern.

## 3. Als Web-App bereitstellen

1. Rechts oben **Bereitstellen → Neue Bereitstellung**
2. Typ: **Web-App**
3. Ausführen als: **Ich**
4. Zugriff: **Jeder**
5. **Bereitstellen**
6. Google-Berechtigung einmal bestätigen
7. Die erzeugte URL kopieren. Sie muss mit `/exec` enden.

Das Google-Sheet selbst bleibt privat. Die Web-App kann ausschließlich die 40 fest hinterlegten DAX-Ticker und den Marktstatus ausgeben.

## 4. URL in SenSeiS eintragen

1. SenSeiS Terminal öffnen
2. **Trade Calculator** öffnen
3. Bei der Kursbox auf **⚙️ API** tippen
4. URL in **DAX Google-Web-App-URL** einfügen
5. **DAX-Feed speichern & testen** tippen

Erwartete Meldung:

`✓ DAX-Feed verbunden · 40 Titel verfügbar.`

## Datenrouting

- DAX: privates Google-Sheet → Apps Script → SenSeiS
- US-Aktien: Finnhub-Key lokal im Browser
- Kein Finnhub-Key in GitHub
- Kein eigenes 10/10-Request-Limit
- Letzter gültiger DAX-Kurs wird lokal als Fallback gespeichert
- Google-Kurse sind sichtbar als ca. 15 Minuten verzögert gekennzeichnet
