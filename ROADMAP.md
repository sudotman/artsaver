# ArtSaver Roadmap

## Near-term

### Keyboard shortcuts overlay
A small `?` hint in the corner that reveals all available shortcuts on press. Currently only skip is bound -- expand to include pause/resume (`P`), toggle fullscreen (`F`), toggle label (`L`), and open settings (`S`).

### Pause / resume
Freeze on the current artwork indefinitely. Visual indicator (a subtle pause icon that fades in, then disappears) so the user knows the state changed. Resume with the same key or after a timeout.

### Transition variety
Add a few tasteful transition modes beyond crossfade: slow Ken Burns zoom, gentle horizontal slide, soft dissolve-to-black. Selectable per-user in settings or set to random.

### Artwork info deeplink
Clicking the museum label opens the artwork's page on the source museum's website in the default browser.

### Multi-monitor support
Detect all connected displays. Option to run ArtSaver on a specific monitor or span all of them, each showing a different piece.

---

## Medium-term

### More museum sources
- **MoMA** (Museum of Modern Art)
- **Harvard Art Museums** (open API with 200k+ objects)
- **Smithsonian Open Access** (millions of CC0 images)
- **Europeana** (pan-European aggregator)
- **National Gallery of Art, Washington**

### Favorites and history
Heart an artwork to save it to a local favorites list. View history of all pieces shown, with date/time. Export favorites as a JSON or simple gallery HTML.

### Smart shuffle weighting
Instead of pure random, let the user set preferences: more paintings vs. sculpture, prefer a century range, favor certain museums. Light sliders in settings -- no complex UI.

### Offline cache
Cache the last N artwork images to disk so the app works beautifully without internet. Configurable cache size (e.g. 50-200 images). Graceful fallback: if all APIs are unreachable, shuffle from cache.

### Auto-start on boot
Optional setting to register ArtSaver as a startup app on Windows / macOS / Linux. Starts minimized to tray; activates on idle or manual open.

### Tray mini-controls
Right-click tray: show current artwork title, skip, pause, toggle idle mode, quit. Double-click tray: bring window to front.

---

## Long-term

### Curated playlists
Pre-built themed playlists: "Dutch Golden Age", "Impressionism", "Japanese Ukiyo-e", "Abstract Expressionism", "Portraits Through the Ages". User can also build custom playlists from favorites.

### Community sharing
Export your settings + playlist as a tiny shareable config file. Import someone else's to get their curation without any account or server.

### Ambient mode
A secondary display mode: instead of a single framed artwork, show a slowly drifting mosaic wall of thumbnails from different eras. Click any thumbnail to focus it.

### Companion widget
A small persistent desktop widget (outside the main window) that shows just the current artwork's title and artist. Always-on-top, minimal, draggable.

### Screensaver system integration
Register as an actual system screensaver on Windows (`.scr`), macOS (Screen Saver framework), and Linux (XScreenSaver module) so it activates through native OS settings instead of custom idle polling.

### Audio ambience
Optional soft museum-like ambient audio (quiet room tone, distant footsteps) that plays while ArtSaver is active. Volume slider. Can be turned off entirely.

---

## Technical improvements

- **Rate-limit awareness** -- respect museum API rate limits with per-source cooldowns and exponential backoff.
- **Delta settings sync** -- only persist changed fields; migrate gracefully across versions.
- **Automated builds** -- GitHub Actions workflow to produce Windows/macOS/Linux installers on every tag.
- **Accessibility** -- screen reader announcements for artwork changes; high-contrast label mode.
