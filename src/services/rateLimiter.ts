interface SourceState {
  lastCall: number;
  failures: number;
  cooldownUntil: number;
}

const state: Record<string, SourceState> = {};

const MIN_INTERVAL_MS = 300;
const BASE_COOLDOWN_MS = 5000;
const MAX_COOLDOWN_MS = 120000;

function getState(source: string): SourceState {
  if (!state[source]) {
    state[source] = { lastCall: 0, failures: 0, cooldownUntil: 0 };
  }
  return state[source];
}

export function canCall(source: string): boolean {
  const s = getState(source);
  const now = Date.now();
  if (now < s.cooldownUntil) return false;
  if (now - s.lastCall < MIN_INTERVAL_MS) return false;
  return true;
}

export async function withRateLimit<T>(
  source: string,
  fn: () => Promise<T>,
): Promise<T> {
  const s = getState(source);
  const now = Date.now();

  if (now < s.cooldownUntil) {
    throw new Error(`Source ${source} is in cooldown`);
  }

  const elapsed = now - s.lastCall;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }

  s.lastCall = Date.now();

  try {
    const result = await fn();
    s.failures = 0;
    return result;
  } catch (err) {
    s.failures++;
    s.cooldownUntil = Date.now() + Math.min(
      BASE_COOLDOWN_MS * Math.pow(2, s.failures - 1),
      MAX_COOLDOWN_MS,
    );
    throw err;
  }
}

export function resetSource(source: string): void {
  delete state[source];
}

export function resetAllSources(): void {
  for (const key of Object.keys(state)) delete state[key];
}

export function getSourceStates(): Record<string, { failures: number; cooldownUntil: number; lastCall: number }> {
  const now = Date.now();
  const result: Record<string, { failures: number; cooldownUntil: number; lastCall: number }> = {};
  for (const [source, s] of Object.entries(state)) {
    result[source] = { failures: s.failures, cooldownUntil: Math.max(0, s.cooldownUntil - now), lastCall: s.lastCall };
  }
  return result;
}
