export const STORAGE_KEY = 'little-studio:v1';
export const DURATIONS = { focus: 25 * 60, break: 5 * 60 };
export const DEFAULTS = Object.freeze({
  theme: 'day', lampOn: true, signOn: true, computerOn: true,
  doorOpen: false, rug: 'lavender', chairTurns: 0, artIndex: 0,
  screenMode: 'landscape', notes: '', readBooks: [],
  timer: { mode: 'focus', remaining: DURATIONS.focus, deadline: null },
});

export function sanitize(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const result = structuredClone(DEFAULTS);
  for (const key of ['lampOn', 'signOn', 'computerOn', 'doorOpen']) {
    if (typeof value[key] === 'boolean') result[key] = value[key];
  }
  if (['day', 'night'].includes(value.theme)) result.theme = value.theme;
  if (['lavender', 'rose', 'ocean'].includes(value.rug)) result.rug = value.rug;
  if (['landscape', 'notes', 'focus'].includes(value.screenMode)) result.screenMode = value.screenMode;
  if (typeof value.notes === 'string') result.notes = value.notes.slice(0, 5000);
  if (Number.isFinite(value.chairTurns)) result.chairTurns = Math.max(0, Math.min(10000, Math.floor(value.chairTurns)));
  if (Number.isInteger(value.artIndex)) result.artIndex = Math.abs(value.artIndex) % 3;
  if (Array.isArray(value.readBooks)) result.readBooks = [...new Set(value.readBooks.filter(id => ['three', 'vite', 'design'].includes(id)))];
  if (value.timer && ['focus', 'break'].includes(value.timer.mode)) {
    const mode = value.timer.mode;
    const remaining = Number.isFinite(value.timer.remaining) ? Math.min(DURATIONS[mode], Math.max(0, value.timer.remaining)) : DURATIONS[mode];
    const deadline = Number.isFinite(value.timer.deadline) && value.timer.deadline > 0 ? value.timer.deadline : null;
    result.timer = { mode, remaining, deadline };
  }
  return result;
}

export function remainingSeconds(timer, now = Date.now()) {
  return timer.deadline === null ? Math.ceil(timer.remaining) : Math.min(DURATIONS[timer.mode], Math.max(0, Math.ceil((timer.deadline - now) / 1000)));
}

export function toggleTimer(timer, now = Date.now()) {
  const remaining = remainingSeconds(timer, now);
  if (timer.deadline !== null) return { ...timer, remaining, deadline: null };
  const duration = remaining > 0 ? remaining : DURATIONS[timer.mode];
  return { ...timer, remaining: duration, deadline: now + duration * 1000 };
}

export function createStore(storage) {
  let saved;
  try { saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null'); } catch { saved = null; }
  let state = sanitize(saved);
  const listeners = new Set();
  let persistent = true;
  return {
    get: () => state,
    get persistent() { return persistent; },
    set(patch) {
      state = sanitize({ ...state, ...patch });
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { persistent = false; }
      listeners.forEach(fn => fn(state));
      return state;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
