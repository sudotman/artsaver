# artsaver

an elegant desktop screensaver that endlessly shuffles art from the world's museums

![artsaver](https://raw.githubusercontent.com/sudotman/sudotman/refs/heads/main/demos/artsaver/demo.png)

## features

- **4 museum sources** — met, art institute of chicago, cleveland museum of art, victoria and albert museum
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
- **android tv / smart tv** — built-in HTTP server streams artwork to any device on your network
- **cross-platform** — windows, macos, linux via electron

## quick start

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
| `←` / `B`           | Previous artwork           |
| `P`                  | Pause / Resume             |
| `F`                  | Toggle fullscreen          |
| `L`                  | Toggle label visibility    |
| `S`                  | Open settings              |
| `H`                  | Favorite / unfavorite      |
| `A`                  | Toggle ambient audio       |
| `M`                  | Toggle ambient mosaic mode |
| `I`                  | Open artwork in browser    |
| `D`                  | Diagnostics panel          |
| `?`                  | Show all shortcuts         |
| `Esc`                | Close any open panel       |

## settings

Open via the gear icon or `S`:

| Setting              | Default     | Description                                      |
|----------------------|-------------|--------------------------------------------------|
| Shuffle interval     | 60s         | Time between transitions (15s – 5min)            |
| Transition style     | Crossfade   | Crossfade, Ken Burns, slide, dissolve, or random |
| Immersive mode       | Off         | Auto-hide label and UI                           |
| Preferred category   | All         | Filter by painting, sculpture, photo, etc.       |
| Source weighting     | Equal       | Favor specific museums (1x – 5x)                 |
| Idle auto-activation | Off         | Fullscreen when idle (configurable threshold)    |
| Ambient audio        | Off         | Soft museum room tone with volume control        |
| Offline cache        | Off         | Cache up to 500 images to disk                   |
| Auto-start           | Off         | Launch on login, minimized to tray               |
| Companion widget     | Off         | Always-on-top mini title display                 |
| High-contrast labels | Off         | Accessibility: bolder label backgrounds          |
| Screen reader        | Off         | Announce artwork changes via ARIA live region    |
| Network / TV server  | Off         | Serve artwork over HTTP for TVs and clients      |

## android tv & smart tv

ArtSaver includes a built-in HTTP server (disabled by default) that streams composited artwork images to any device on your local network. Enable it under **Settings → Network / TV**.

When active, the server renders each artwork at 1920×1080 with the museum label, blurred background, and typography baked in — identical to the desktop display.

### endpoints

| URL | Description |
|-----|-------------|
| `http://<ip>:<port>/` | Live gallery page — open in any TV browser for the full experience with crossfade transitions |
| `http://<ip>:<port>/current.jpg` | Latest artwork as a composited JPEG — use as a direct URI background in Projectivy Launcher |
| `http://<ip>:<port>/overflight.json` | Overflight-format JSON feed of the 10 most recent artworks — use with the Projectivy Overflight plugin |
| `http://<ip>:<port>/1.jpg` – `/10.jpg` | Individual slot images (ring buffer, oldest overwritten first) |
| `http://<ip>:<port>/info.json` | Current artwork metadata as JSON |

Default port: **7247**. Configurable in settings.

### projectivy launcher setup

**Option A — single URI background** (image updates each advance):
> Settings → Wallpaper → Custom → URI → `http://<pc-ip>:7247/current.jpg`

**Option B — Overflight plugin** (cycles through up to 10 recent artworks with TV-side transitions):
> Install the Overflight plugin → add a custom feed → `http://<pc-ip>:7247/overflight.json`

the "Overlay artwork info on served image" toggle in settings controls whether the museum label is composited into the served images. Disabling it serves the raw artwork without any overlay.

### gallery page

the gallery page (`/`) is a self-updating webpage that mirrors the ArtSaver aesthetic exactly — dark background, blurred ambient fill, Cormorant Garamond typography, warm accent details, and smooth crossfade transitions. Open it in any browser on your TV (TV Bro, Puffin, or a Chromium-based TV browser) for the richest experience.

## diagnostics

press `D` to open the diagnostics panel, which shows:

- prefetch buffer fill level
- per-source status (ok / failure count / cooldown timer with seconds remaining)
- last error message per provider
- **Reset all sources & retry** button to clear rate-limit state and force a fresh fetch

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

select "Shuffle All" to return to random mode across all enabled sources.

## architecture

```
artsaver/
  electron/           main process (window, tray, idle, cache, companion widget, HTTP server)
  src/
    components/       ArtworkStage, MuseumLabel, TitleBar, Settings, Favorites,
                      History, Playlists, AmbientMode, Shortcuts, Diagnostics,
                      Pause, CompanionWidget, ErrorBoundary
    domain/           Artwork types, playlist types, favorites/history types
    providers/        MET, Chicago, Cleveland, V&A, local folder
    services/         Shuffle scheduler, settings store, favorites store,
                      playlist service, audio service, rate limiter, image utils
    styles/           Dark gallery theme (Cormorant Garamond + Inter)
  .github/workflows/  CI/CD for cross-platform builds
```

## art sources

| Source                       | API                                        | License       |
|------------------------------|--------------------------------------------|---------------|
| Metropolitan Museum of Art   | collectionapi.metmuseum.org                | Public Domain |
| Art Institute of Chicago     | api.artic.edu                              | Public Domain |
| Cleveland Museum of Art      | openaccess-api.clevelandart.org            | CC0           |
| Victoria and Albert Museum   | api.vam.ac.uk                              | Public Domain |

## license

MIT
