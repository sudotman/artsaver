# ArtSaver

An elegant desktop screensaver that endlessly shuffles masterpieces from the world's greatest museums.

## Features

- **6 museum sources** -- MET, Art Institute of Chicago, Rijksmuseum, Harvard Art Museums, Smithsonian, National Gallery of Art
- **Museum-mode display** -- full artwork with artist, title, year, medium, and collection label
- **Immersive mode** -- hides metadata until hover; auto-hides UI after 3 seconds
- **Curated playlists** -- 8 built-in themed collections (Dutch Golden Age, Impressionism, Ukiyo-e, Renaissance Masters, etc.) plus custom playlists
- **Favorites** -- heart any artwork with `H`; export as JSON or a styled HTML gallery
- **History** -- browseable log of every artwork shown, with timestamps
- **Ambient mode** -- mosaic wall of drifting thumbnails; click any to focus
- **Transition variety** -- crossfade, Ken Burns zoom, gentle slide, dissolve-to-black, or random
- **Pause / resume** -- freeze on a piece indefinitely (`P`)
- **Manual skip** -- `→`, `Space`, or `N`
- **Keyboard shortcuts** -- press `?` to see all shortcuts
- **Idle auto-activation** -- app appears fullscreen when your computer goes idle
- **Smart shuffle** -- per-source weighting, category filters (painting, sculpture, photography, etc.)
- **Offline cache** -- configurable disk cache so artwork loads without internet
- **Ambient audio** -- soft procedural museum ambience (brown noise through a low-pass filter)
- **Local folder** -- opt-in path to blend your own images into the shuffle
- **Companion widget** -- always-on-top mini display showing current artwork title
- **Auto-start on boot** -- optional login item, starts minimized to tray
- **Tray controls** -- right-click to skip, pause, toggle idle mode, or quit
- **Config import/export** -- share your setup as a portable JSON file
- **Accessibility** -- screen reader announcements, high-contrast labels, focus indicators, reduced motion support
- **Cross-platform** -- Windows, macOS, Linux via Electron

## Quick Start

```bash
git clone <repo-url> && cd artsaver
npm install
npm run electron:dev
```

## Build for Distribution

```bash
npm run electron:build
```

Installers appear in the `release/` folder. GitHub Actions also builds all three platforms on every tag push.

## Keyboard Shortcuts

| Key                  | Action                     |
|----------------------|----------------------------|
| `→` / `Space` / `N` | Next artwork               |
| `P`                  | Pause / Resume             |
| `F`                  | Toggle fullscreen          |
| `L`                  | Toggle label visibility    |
| `S`                  | Open settings              |
| `H`                  | Favorite / unfavorite      |
| `A`                  | Toggle ambient audio       |
| `M`                  | Toggle ambient mosaic mode |
| `I`                  | Open artwork in browser    |
| `?`                  | Show all shortcuts         |
| `Esc`                | Close any open panel       |

## Settings

Open via the gear icon or `S`:

| Setting              | Default     | Description                                      |
|----------------------|-------------|--------------------------------------------------|
| Shuffle interval     | 60s         | Time between transitions (15s -- 5min)           |
| Transition style     | Crossfade   | Crossfade, Ken Burns, slide, dissolve, or random |
| Immersive mode       | Off         | Auto-hide label and UI                           |
| Preferred category   | All         | Filter by painting, sculpture, photo, etc.       |
| Source weighting     | Equal       | Favor specific museums (1x -- 5x)                |
| Idle auto-activation | Off         | Fullscreen when idle (configurable threshold)    |
| Ambient audio        | Off         | Soft museum room tone with volume control        |
| Offline cache        | Off         | Cache up to 500 images to disk                   |
| Auto-start           | Off         | Launch on login, minimized to tray               |
| Companion widget     | Off         | Always-on-top mini title display                 |
| High-contrast labels | Off         | Accessibility: bolder label backgrounds          |
| Screen reader        | Off         | Announce artwork changes via ARIA live region    |

## Playlists

Built-in curated collections:

- Dutch Golden Age
- Impressionism
- Japanese Ukiyo-e
- Abstract Expressionism
- Portraits Through the Ages
- Renaissance Masters
- Photography Icons
- Sculpture Garden

Select "Shuffle All" to return to random mode across all enabled sources.

## Architecture

```
artsaver/
  electron/           Main process (window, tray, idle, cache, companion widget)
  src/
    components/       ArtworkStage, MuseumLabel, TitleBar, Settings, Favorites,
                      History, Playlists, AmbientMode, Shortcuts, Pause, ErrorBoundary
    domain/           Artwork types, playlist types, favorites/history types
    providers/        MET, Chicago, Rijks, Harvard, Smithsonian, NGA, local folder
    services/         Shuffle scheduler, settings store, favorites store,
                      playlist service, audio service, rate limiter, image utils
    styles/           Dark gallery theme (Cormorant Garamond + Inter)
  .github/workflows/  CI/CD for cross-platform builds
```

## Art Sources

| Source                       | API                                    | License       |
|------------------------------|----------------------------------------|---------------|
| Metropolitan Museum of Art   | collectionapi.metmuseum.org            | Public Domain |
| Art Institute of Chicago     | api.artic.edu                          | Public Domain |
| Rijksmuseum                  | rijksmuseum.nl/api                     | Public Domain |
| Harvard Art Museums          | api.harvardartmuseums.org              | Public Domain |
| Smithsonian Open Access      | api.si.edu/openaccess                  | CC0           |
| National Gallery of Art      | api.nga.gov                            | Public Domain |

## License

MIT
