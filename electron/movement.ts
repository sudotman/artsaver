// The art movement a piece belongs to ("Impressionism", "Cubism"), from Wikidata: the artwork's own
// movement when the museum links it, else its artist's. Artists are found by the id the museum gives
// (the Met), else by name, telling namesakes apart by birth year or by being described as an artist.
// Wikidata turns away bursts, so lookups go one at a time, a little apart, and every answer is kept.
import * as fs from 'fs';

export interface MovementQuery {
  artist?: string;
  wikidata?: { artist?: string; object?: string };
  born?: number;
  period?: string;
}

const API = 'https://www.wikidata.org/w/api.php';
const HEADERS = { 'User-Agent': 'ArtSaver (art screensaver; github.com/sudotman/artsaver)' };
const SPACING_MS = 1_500;
const BACKOFF_MS = 10 * 60_000;
const ANONYMOUS = /^(unknown|anonymous|unidentified|-)/i;
const ARTISTIC = /painter|artist|photographer|sculptor|engraver|printmaker|draughts|illustrator|architect|designer|potter|calligrapher/i;

type Fetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export function createMovements(cacheFile?: string, fetchImpl: Fetch = fetch as unknown as Fetch) {
  // Artist (or artwork) key → movement, "" when Wikidata knows none.
  const cache: Record<string, string> = (() => {
    try { return cacheFile ? JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) : {}; } catch { return {}; }
  })();
  const save = () => { if (cacheFile) try { fs.writeFileSync(cacheFile, JSON.stringify(cache)); } catch {} };
  let queue: Promise<unknown> = Promise.resolve();
  let pausedUntil = 0;

  async function api(params: Record<string, string>): Promise<any> {
    if (Date.now() < pausedUntil) throw new Error('Wikidata asked us to wait');
    const res = await fetchImpl(`${API}?format=json&${new URLSearchParams(params)}`, { headers: HEADERS });
    if (res.status === 429 || !res.ok) {
      if (res.status === 429) pausedUntil = Date.now() + BACKOFF_MS;
      throw new Error(`Wikidata answered ${res.status}`);
    }
    await new Promise(r => setTimeout(r, SPACING_MS));
    return res.json();
  }

  const entities = async (ids: string[], props: string) =>
    ids.length ? (await api({ action: 'wbgetentities', ids: ids.join('|'), props, languages: 'en' })).entities ?? {} : {};
  const values = (e: any, p: string): string[] =>
    (e?.claims?.[p] ?? []).map((c: any) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
  const birthYear = (e: any) => Number(e?.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time?.slice(1, 5)) || undefined;

  /** The artist's Wikidata id, from the museum's link or a name search; undefined when unsure. */
  async function artistId(q: MovementQuery): Promise<string | undefined> {
    if (q.wikidata?.artist) return q.wikidata.artist;
    const name = q.artist?.trim();
    if (!name || ANONYMOUS.test(name)) return undefined;
    const hits: any[] = (await api({ action: 'wbsearchentities', search: name, language: 'en', type: 'item', limit: '5' })).search ?? [];
    const found = await entities(hits.map(h => h.id), 'claims|descriptions');
    const people = hits.map(h => found[h.id]).filter(e => values(e, 'P31').includes('Q5'));
    if (q.born) return people.find(e => birthYear(e) === q.born)?.id;
    // Without a birth year, only a single person described as an artist will do.
    const artists = people.filter(e => ARTISTIC.test(e.descriptions?.en?.value ?? ''));
    return artists.length === 1 ? artists[0].id : undefined;
  }

  async function lookUp(q: MovementQuery): Promise<string> {
    const artist = await artistId(q);
    const ids = [q.wikidata?.object, artist].filter((x): x is string => !!x);
    const found = await entities(ids, 'claims');
    // The artwork's own movement, when Wikidata has one; an artist's list spans a career, so it's only
    // the fallback.
    const own = values(found[q.wikidata?.object ?? ''], 'P135');
    const unique = [...new Set(own.length ? own : values(found[artist ?? ''], 'P135'))].slice(0, 2);
    const labels = await entities(unique, 'labels');
    return unique.map(id => labels[id]?.labels?.en?.value).filter(Boolean).map(capitalise).join(', ');
  }

  return {
    /** The movement, or the museum's period, or undefined. Never throws. */
    async of(q: MovementQuery): Promise<string | undefined> {
      const key = q.wikidata?.object ? `object:${q.wikidata.object}` : `artist:${(q.wikidata?.artist ?? q.artist ?? '').toLowerCase()}|${q.born ?? ''}`;
      if (!(key in cache)) {
        const run = queue.then(() => lookUp(q));
        queue = run.catch(() => {});
        try {
          cache[key] = await run;
          save();
        } catch (err) {
          console.warn('[movement]', err instanceof Error ? err.message : err);
          return q.period || undefined;
        }
      }
      return cache[key] || q.period || undefined;
    },
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
