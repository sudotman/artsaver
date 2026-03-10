import { Artwork, ArtProvider } from '../domain/artwork';

let cachedFiles: string[] = [];
let cachedPath: string | null = null;

export function createLocalProvider(folderPath: string | null): ArtProvider {
  return {
    name: 'Local Collection',
    source: 'local',

    async fetchRandom(): Promise<Artwork | null> {
      if (!folderPath || !window.electronAPI) return null;

      try {
        if (folderPath !== cachedPath || cachedFiles.length === 0) {
          cachedFiles = await window.electronAPI.readLocalFolder(folderPath);
          cachedPath = folderPath;
        }

        if (cachedFiles.length === 0) return null;

        const file = cachedFiles[Math.floor(Math.random() * cachedFiles.length)];
        const filename = file.split('/').pop() || 'Untitled';
        const name = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        return {
          id: `local-${filename}`,
          title: name,
          artist: 'Local Collection',
          year: '',
          imageUrl: file,
          source: 'local',
          collection: 'Local Collection',
        };
      } catch {
        return null;
      }
    },
  };
}
