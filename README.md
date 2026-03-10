# artsaver

an elegant desktop screensaver that endlessly shuffles masterpieces from the world's greatest museums.

## features

- **6 museum sources** — met, art institute of chicago, rijksmuseum, harvard art museums, smithsonian, national gallery of art
- **museum-mode display** — full artwork with artist, title, year, medium, and collection label
- **immersive mode** — hides metadata until hover; auto-hides ui after 3 seconds
- **curated playlists** — 8 built-in themed collections (dutch golden age, impressionism, ukiyo-e, renaissance masters, etc.) plus custom playlists
- **favorites** — heart any artwork with `h`; export as json or a styled html gallery
- **history** — browseable log of every artwork shown, with timestamps
- **ambient mode** — mosaic wall of drifting thumbnails; click any to focus
- **transition variety** — crossfade, ken burns zoom, gentle slide, dissolve-to-black, or random
- **pause / resume** — freeze on a piece indefinitely (`p`)
- **manual skip** — `→`, `space`, or `n`
- **keyboard shortcuts** — press `?` to see all shortcuts
- **idle auto-activation** — app appears fullscreen when your computer goes idle
- **smart shuffle** — per-source weighting, category filters (painting, sculpture, photography, etc.)
- **offline cache** — configurable disk cache so artwork loads without internet
- **ambient audio** — soft procedural museum ambience (brown noise through a low-pass filter)
- **local folder** — opt-in path to blend your own images into the shuffle
- **companion widget** — always-on-top mini display showing current artwork title
- **auto-start on boot** — optional login item, starts minimized to tray
- **tray controls** — right-click to skip, pause, toggle idle mode, or quit
- **config import/export** — share your setup as a portable json file
- **accessibility** — screen reader announcements, high-contrast labels, focus indicators, reduced motion support
- **cross-platform** — windows, macos, linux via electron

## quick Start

```bash
git clone <repo-url> && cd artsaver
npm install
npm run electron:dev
```

## build for distribution

```bash
npm run electron:build
```

installers appear in the `release/` folder. github actions also builds all three platforms on every tag push.

## keyboard shortcuts

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

## settings

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

## playlists

built-in curated collections:

- Dutch Golden Age
- Impressionism
- Japanese Ukiyo-e
- Abstract Expressionism
- Portraits Through the Ages
- Renaissance Masters
- Photography Icons
- Sculpture Garden

Select "Shuffle All" to return to random mode across all enabled sources.

## architecture

```
artsaver/
  electron/           main process (window, tray, idle, cache, companion widget)
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

## art sources

| Source                       | API                                    | License       |
|------------------------------|----------------------------------------|---------------|
| Metropolitan Museum of Art   | collectionapi.metmuseum.org            | Public Domain |
| Art Institute of Chicago     | api.artic.edu                          | Public Domain |
| Rijksmuseum                  | rijksmuseum.nl/api                     | Public Domain |
| Harvard Art Museums          | api.harvardartmuseums.org              | Public Domain |
| Smithsonian Open Access      | api.si.edu/openaccess                  | CC0           |
| National Gallery of Art      | api.nga.gov                            | Public Domain |

## license

MIT
