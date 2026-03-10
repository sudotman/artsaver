# ArtSaver

An elegant desktop screensaver that endlessly shuffles masterpieces from the world's greatest museums.

## Features

- **Museum-quality display** -- full artwork with artist, title, year, medium, and source collection
- **Multiple sources** -- Metropolitan Museum of Art, Art Institute of Chicago, Rijksmuseum
- **Local folder** -- optionally add your own art collection to the mix
- **Idle auto-mode** -- automatically appears when your computer goes idle
- **Immersive mode** -- hides metadata until you hover; toggle in settings
- **Crossfade transitions** -- smooth, slow dissolves between pieces
- **Cross-platform** -- Windows, macOS, Linux

## Quick Start

```bash
# Clone and install
git clone <repo-url> && cd artsaver
npm install

# Run in development
npm run electron:dev
```

## Build for Distribution

```bash
npm run electron:build
```

Installers will appear in the `release/` folder.

## Settings

Open settings via the gear icon in the title bar:

| Setting              | Default   | Description                                      |
|----------------------|-----------|--------------------------------------------------|
| Shuffle interval     | 60s       | Time between artwork transitions (15s - 5min)    |
| Immersive mode       | Off       | Hide label until mouse hover                     |
| Idle auto-activation | Off       | Show app when computer is idle                   |
| Idle threshold       | 5 min     | Idle time before auto-activation                 |
| Art sources          | All APIs  | Toggle individual museum sources                 |
| Local folder         | None      | Add a folder of images to the shuffle pool       |

## Architecture

```
artsaver/
  electron/          # Main process (window, tray, idle detection)
  src/
    components/      # React UI (ArtworkStage, MuseumLabel, TitleBar, Settings)
    domain/          # Artwork type definitions
    providers/       # Museum API integrations + local folder
    services/        # Shuffle scheduler, settings store, idle service
    styles/          # Theme (Cormorant Garamond + Inter, dark gallery aesthetic)
```

## Art Sources

| Source                       | API                                    | License       |
|------------------------------|----------------------------------------|---------------|
| Metropolitan Museum of Art   | collectionapi.metmuseum.org            | Public Domain |
| Art Institute of Chicago     | api.artic.edu                          | Public Domain |
| Rijksmuseum                  | rijksmuseum.nl/api                     | Public Domain |

## License

MIT
