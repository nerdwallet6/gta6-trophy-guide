// Leonida Nights — progress state and roadmap math. No DOM here: app.js renders.
// Progress lives in localStorage under one key, as a list of earned trophy ids.
// Everything is offline; nothing leaves the device.

export const STORAGE_KEY = 'leonida-nights-v2';

// Demo set for screenshots (?demo=1): a plausible early playthrough, in memory only.
// Positive Mental Attitude stays unearned on purpose, so the Next Up box shows the
// Chapter 1 warning.
export const DEMO_EARNED = [2, 3, 4, 8, 15, 21, 35, 42];

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch {
    // Storage full or blocked: progress just does not persist this session.
  }
}

export function clearEarned() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function gradeCounts(trophies, earned) {
  const out = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) {
    if (earned.has(t.id)) out[t.grade] += 1;
  }
  return out;
}

export function stageProgress(trophies, stageId, earned) {
  const members = trophies.filter((t) => t.stage === stageId);
  const done = members.filter((t) => earned.has(t.id)).length;
  return { total: members.length, done };
}

// Roadmap order: stage first, then the trophy's own id.
export function roadmapOrder(trophies) {
  return [...trophies].sort((a, b) => (a.stage - b.stage) || (a.id - b.id));
}

// Next up: Positive Mental Attitude while it is unearned (it is the only missable
// trophy and its Chapter 1 window closes); otherwise the first unearned trophy in
// roadmap order. Null when everything is earned.
export function nextUp(trophies, earned) {
  const pma = trophies.find((t) => t.name === 'Positive Mental Attitude');
  if (pma && !earned.has(pma.id)) return { trophy: pma, reason: 'missable' };
  const ordered = roadmapOrder(trophies);
  const next = ordered.find((t) => !earned.has(t.id));
  return next ? { trophy: next, reason: 'roadmap' } : null;
}

export function isAtRisk(t) {
  return t.missable || t.timeLimited;
}

// A trophy is shown masked while spoilers are hidden and it is still unearned.
export function isMasked(t, hideSpoilers, earned) {
  return hideSpoilers && t.hidden && !earned.has(t.id);
}

export function filterTrophies(trophies, earned, opts) {
  const q = (opts.query || '').trim().toLowerCase();
  return trophies.filter((t) => {
    if (opts.grade !== 'all' && t.grade !== opts.grade) return false;
    if (opts.kind === 'atrisk') {
      if (!isAtRisk(t)) return false;
    } else if (opts.kind !== 'all' && t.kind !== opts.kind) {
      return false;
    }
    if (opts.earnedOnly && !earned.has(t.id)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}
