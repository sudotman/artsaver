const isDevBrowser = import.meta.env.DEV && !window.electronAPI;

const PROXY_MAP: Record<string, string> = {
  'https://collectionapi.metmuseum.org': '/proxy/met',
  'https://api.artic.edu': '/proxy/chicago',
  'https://www.artic.edu': '/proxy/chicago-iiif',
  'https://openaccess-api.clevelandart.org': '/proxy/cleveland',
  'https://api.vam.ac.uk': '/proxy/vam',
};

/**
 * Fetch wrapper that routes through Vite proxy in dev-browser mode
 * (bypasses CORS when not running inside Electron).
 */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const resolved = isDevBrowser ? proxyUrl(url) : url;
  return fetch(resolved, init);
}

function proxyUrl(url: string): string {
  for (const [origin, proxy] of Object.entries(PROXY_MAP)) {
    if (url.startsWith(origin)) {
      return url.replace(origin, proxy);
    }
  }
  return url;
}
