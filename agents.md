# NorasApp – Projekt-Dokumentation für Coding-Agents

## Überblick
NorasApp ist eine installierbare **Progressive Web App (PWA)** für Android, die beim Lernen hilft.
Aktueller Fokus: **Englisch-Vokabeln**. Zielgruppe: allgemein, mehrere Personen (später lokal getrennte Profile).

## Tech-Stack
- Vite + TypeScript + React (JSX mit `react-jsx`)
- `vite-plugin-pwa` (Manifest + Service Worker, offline-fähig, installierbar)
- `dexie` + `dexie-react-hooks` (IndexedDB, lokal & offline)
- Keine Backend-Pflicht: alle Daten bleiben lokal im Browser
- Keine automatisch eingebauten Vokabeln – Wortschatz wird per JSON-Import, Einzel-Eingabe oder über die Standard-Liste „Add common verbs“ angelegt

## Wichtige Befehle
- `npm run dev` – Entwicklungsserver starten
- `npm run build` – TypeScript-Check + Produktions-Build
- `npm run preview` – Produktions-Build lokal testen
- `npm run generate:icons` – PNG-Icons aus den SVGs unter `public/icons` erzeugen

## Deployment (GitHub Pages)
- Die App läuft unter einem Unterpfad: `https://junk495.github.io/NorasApp/`.
- Deshalb ist in `vite.config.cts` `base: '/NorasApp/'` gesetzt – bei Umbenennung des Repos oder eigener Domain anpassen.
- Deployment per GitHub Actions: `.github/workflows/deploy.yml` baut bei jedem Push auf `main` und pusht `dist/` in den Branch `gh-pages` (`peaceiris/actions-gh-pages`).
- In den Repo-Einstellungen muss unter Settings → Pages → Source **„Deploy from a branch“** mit Branch **`gh-pages`** und Ordner **`/ (root)`** gewählt sein.
- Wichtig: Pages darf nicht direkt aus `main` (Quellcode) dienen, sonst wird das rohe `index.html` (Verweis auf `/src/main.tsx`) ausgeliefert → weißer Bildschirm.

## Versionierung (Muster 0.0.0 / SemVer)
- **Einzige Quelle der Wahrheit** ist das Feld `version` in `package.json`.
- Muster: `MAJOR.MINOR.PATCH` (z. B. `0.0.1` → `0.1.0` → `1.0.0`).
- **Bei JEDER Änderung, die deployed wird, MUSS die Version erhöht werden** – sonst erkennt der Service Worker keinen Unterschied und die Nutzer erhalten kein Update.
- Nach einer Versionserhöhung committen + pushen (der GitHub-Actions-Workflow baut und deployed dann automatisch).
- Die Version wird über `__APP_VERSION__` (siehe `vite.config.cts` → `define`) in die App eingebettet und in der UI angezeigt.
- Da die Version in den Bundle-Hash einfließt, erkennt der Service Worker die Änderung automatisch und zeigt dem Nutzer einen Update-Hinweis an.

## Auto-Update-Mechanik
- `vite.config.cts`: `registerType: 'prompt'`.
- Die Vite-Config läuft bewusst als CommonJS (`.cts`), weil `vite-plugin-pwa` `workbox-build` über einen `require()`-Fallback lädt. Dadurch erscheint beim Build ein harmloser „CJS deprecation“-Hinweis von Vite.
- `src/components/UpdatePrompt.tsx`: nutzt `useRegisterSW` aus `virtual:pwa-register/react`. Prüft regelmäßig (per `registration.update()`), ob eine neue Version existiert, und zeigt bei `needRefresh` den Hinweis „A new version is available“ mit „Update“-Button (`updateServiceWorker(true)`).

## Import/Export (JSON)
- **Ein einziges JSON-Format** für alles: Profile, Vokabeln (Wörter + Irregular Verbs inkl. Lernfortschritt) und Statistik.
- Export: `src/lib/export.ts` → `buildBackup()`.
- Import: `parseImport()` erkennt automatisch zwei Formen:
  - **Volles Backup** (Objekt mit `profiles`/`vocabulary`/`studyStats`) → `restoreBackup()` ersetzt den gesamten Bestand.
  - **Einfache Kartenliste** (Array) → `cardsToVocabulary()` + `addCardsToProfile()` fügt dem aktiven Profil hinzu.
    - Wort: `{ "english": "dog", "german": "Hund" }`
    - Verb: `{ "infinitive": "go", "pastSimple": "went", "pastParticiple": "gone", "german": "gehen" }`
- Standard-Liste gängiger Irregular Verbs: `src/data/irregularVerbs.ts`, per Button „Add common verbs“ hinzufügbar.
- Datenmodell: Die Tabelle `vocabulary` unterscheidet über `kind` (`word` | `irregular`) zwei Kartentypen; Verben haben zusätzlich `pastSimple`/`pastParticiple`.

## Projektstruktur
- `src/App.tsx` – Einstieg, Tab-Navigation, Profil-Verwaltung
- `src/db.ts` – Dexie-Schema (`profiles`, `vocabulary`, `studyStats`) + Helfer
- `src/lib/leitner.ts` – Leitner-Logik (Boxen, Intervalle, Bewertung)
- `src/lib/answers.ts` – Antwort-Prüfung (eingetippte Übersetzung vs. Lösung, Umlaut-/Artikel-tolerant)
- `src/lib/dates.ts` – Datums-/Streak-Helfer
- `src/lib/export.ts` – JSON-Import/Export (Backup + einfache Kartenliste)
- `src/data/irregularVerbs.ts` – Standard-Liste gängiger Irregular Verbs
- `src/components/` – UI-Komponenten (Dashboard, LearnSession, VocabManager, Profile, Import, UpdatePrompt)
- `src/vite-env.d.ts` – globale Typen (`__APP_VERSION__`, PWA-Referenzen)
- `public/icons/` – App-Icons (SVG-Quellen + generierte PNGs)
- `scripts/generate-icons.mjs` – erzeugt PNGs aus den SVGs

## Konventionen
- UI-Text: **Englisch** (gemäß „erstmal nur in Englisch“).
- Code, Kommentare, Commits: **Englisch**.
- TypeScript strikt; kein `any` ohne Begründung.
- Keine neuen Abhängigkeiten ohne Notwendigkeit.
