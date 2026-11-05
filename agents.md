# NorasApp – Projekt-Dokumentation für Coding-Agents

## Überblick
NorasApp ist eine installierbare **Progressive Web App (PWA)** für Android, die beim Lernen hilft.
Aktueller Fokus: **Englisch-Vokabeln**. Zielgruppe: allgemein, mehrere Personen (später lokal getrennte Profile).

## Tech-Stack
- Vite + TypeScript + React (JSX mit `react-jsx`)
- `vite-plugin-pwa` (Manifest + Service Worker, offline-fähig, installierbar)
- Keine Backend-Pflicht: alle Daten bleiben lokal im Browser

## Wichtige Befehle
- `npm run dev` – Entwicklungsserver starten
- `npm run build` – TypeScript-Check + Produktions-Build
- `npm run preview` – Produktions-Build lokal testen
- `npm run generate:icons` – PNG-Icons aus den SVGs unter `public/icons` erzeugen

## Versionierung (Muster 0.0.0 / SemVer)
- **Einzige Quelle der Wahrheit** ist das Feld `version` in `package.json`.
- Muster: `MAJOR.MINOR.PATCH` (z. B. `0.0.1` → `0.1.0` → `1.0.0`).
- Nach einer Versionserhöhung immer `npm run build` ausführen.
- Die Version wird über `__APP_VERSION__` (siehe `vite.config.cts` → `define`) in die App eingebettet und in der UI angezeigt.
- Da die Version in den Bundle-Hash einfließt, erkennt der Service Worker die Änderung automatisch und zeigt dem Nutzer einen Update-Hinweis an.

## Auto-Update-Mechanik
- `vite.config.cts`: `registerType: 'prompt'`.
- Die Vite-Config läuft bewusst als CommonJS (`.cts`), weil `vite-plugin-pwa` `workbox-build` über einen `require()`-Fallback lädt. Dadurch erscheint beim Build ein harmloser „CJS deprecation“-Hinweis von Vite.
- `src/components/UpdatePrompt.tsx`: nutzt `useRegisterSW` aus `virtual:pwa-register/react` und zeigt bei `needRefresh` den Hinweis „A new version is available“ mit „Update“-Button (`updateServiceWorker(true)`).

## Projektstruktur
- `src/App.tsx` – Einstieg + UI-Grundgerüst
- `src/components/` – wiederverwendbare Komponenten (z. B. `UpdatePrompt`)
- `src/vite-env.d.ts` – globale Typen (`__APP_VERSION__`, PWA-Referenzen)
- `public/icons/` – App-Icons (SVG-Quellen + generierte PNGs)
- `scripts/generate-icons.mjs` – erzeugt PNGs aus den SVGs

## Konventionen
- UI-Text: **Englisch** (gemäß „erstmal nur in Englisch“).
- Code, Kommentare, Commits: **Englisch**.
- TypeScript strikt; kein `any` ohne Begründung.
- Keine neuen Abhängigkeiten ohne Notwendigkeit.
