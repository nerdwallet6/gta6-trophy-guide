// Leonida Nights progress store: earned trophies live in localStorage,
// export/import moves them as a JSON file. Demo mode never touches storage.
export const STORAGE_KEY = 'leonida-nights-earned-v1';

// The fixed earned set ?demo=1 shows, so screenshots are reproducible.
export const DEMO_EARNED = [2, 3, 8, 15, 16, 20, 21, 29, 35, 42];

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((n) => Number.isInteger(n)));
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

export function clearEarned() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportFileName() {
  return 'leonida-nights-progress.json';
}

export function exportText(earned) {
  return JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((a, b) => a - b) }, null, 2);
}

// Accept an exported file, a bare array of ids, or an array of trophy names.
export function parseImport(text, trophies) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(list)) throw new Error('not a progress file');
  const byName = new Map(trophies.map((t) => [t.name.toLowerCase(), t.id]));
  const ids = new Set();
  for (const item of list) {
    if (Number.isInteger(item) && trophies.some((t) => t.id === item)) ids.add(item);
    else if (typeof item === 'string' && byName.has(item.toLowerCase())) ids.add(byName.get(item.toLowerCase()));
  }
  return ids;
}
