# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ArtSaver is an Electron + React + TypeScript desktop screensaver that shuffles artwork from six museum APIs (Met, Art Institute of Chicago, Rijksmuseum, Harvard, Smithsonian, NGA) plus an optional local folder. It uses a frameless window with a custom title bar, system tray integration, idle detection, and an optional companion widget.

## Commands

- **Dev (Electron + Vite):** `npm run electron:dev` — starts Vite dev server on :5173, then launches Electron
- **Dev (renderer only):** `npm run dev` — Vite dev server without Electron
- **Build for distribution:** `npm run electron:build` — builds renderer, compiles Electron TS, then runs electron-builder (output in `release/`)
- **Build without packaging:** `npm run build` — compiles both renderer and Electron TS without electron-builder

There are no tests or linting configured.

## Architecture

### Two processes, two TypeScript configs

- **Renderer** (`src/`): React app bundled by Vite. Uses `tsconfig.json` (ESNext modules). Entry: `src/main.tsx` → `src/App.tsx`.
- **Main process** (`electron/`): Electron main + preload. Compiled with `tsconfig.electron.json` (CommonJS) to `dist-electron/`. Entry: `electron/main.ts`.

Communication is via `ipcMain.handle`/`ipcRenderer.invoke` through a preload bridge (`electron/preload.ts` → `window.electronAPI`).

### Provider pattern

Each museum API is an `ArtProvider` (interface in `src/domain/artwork.ts`) with a single `fetchRandom(options?)` method. Providers live in `src/providers/` and are registered in `src/services/shuffleScheduler.ts` as `API_PROVIDERS`. All four API providers (Met, Chicago, Cleveland, V&A) use free public APIs with no API keys required. The local folder provider is created dynamically via `createLocalProvider()`.

### Shuffle scheduler (`src/services/shuffleScheduler.ts`)

Central orchestrator. Maintains a prefetch buffer (size 5), applies source weighting, rate limiting, and retry logic with exponential backoff. Races up to 4 providers in parallel via `Promise.any`. Emits `FetchStatus` updates for UI feedback.

### Settings flow

Settings are stored as JSON in Electron's `userData` directory. The renderer reads/writes via IPC (`get-settings`/`save-settings`). The `useSettings()` hook (`src/services/settingsStore.ts`) manages state with migration support (`_settingsVersion`).

### App.tsx state machine

`App.tsx` manages artwork transitions with a `current`/`next` pattern — `next` is set during a 2-second transition, then promoted to `current`. Back/forward navigation uses two stacks (`backStackRef`/`forwardStackRef`). Keyboard shortcuts are handled in a single `keydown` listener.

### Path alias

Vite is configured with `@` → `src/` alias.
