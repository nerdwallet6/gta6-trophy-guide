// Leonida Nights — progress state. Saved only in this browser (localStorage);
// nothing leaves the device. Demo mode (?demo=1) seeds progress in memory only
// and never writes it, so screenshots can show a lived-in tracker.

export const STORAGE_KEY = 'leonida-nights-v2';
export const PREFS_KEY = 'leonida-nights-v2-prefs';
export const TOTAL = 55;

// The 13 trophies a demo run shows as earned (early story + quick activities),
// so the progress card reads 13/55 (24%) like a real mid-Chapter-1 player.
export const DEMO_EARNED = [2, 3, 4, 5, 8, 9, 10, 16, 20, 21, 46, 51, 55];

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadEarned() {
  const data = readJson(STORAGE_KEY);
  if (!data || !Array.isArray(data.earned)) return new Set();
  return new Set(data.earned.filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL));
}

export function saveEarned(earned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, earned: [...earned].sort((a, b) => a - b) }));
  } catch {
    // Private mode or full storage: the tracker still works for the session.
  }
}

export function loadPrefs() {
  const data = readJson(PREFS_KEY);
  return { spoilers: !!(data && data.spoilers), earnedOnly: !!(data && data.earnedOnly) };
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ spoilers: !!prefs.spoilers, earnedOnly: !!prefs.earnedOnly }));
  } catch {
    // Ignore: prefs are a convenience, not the progress itself.
  }
}

export function exportProgress(earned) {
  return JSON.stringify({ app: 'leonida-nights', version: 2, earned: [...earned].sort((a, b) => a - b) }, null, 2);
}

// Parses an imported file. Throws a plain Error with a human message on bad input.
export function importProgress(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const list = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(list)) throw new Error('That file has no earned list in it.');
  const earned = new Set();
  for (const n of list) {
    if (Number.isInteger(n) && n >= 1 && n <= TOTAL) earned.add(n);
  }
  return earned;
}

export function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
