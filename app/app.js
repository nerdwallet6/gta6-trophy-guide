// Leonida Nights — the tracker. Loads data/trophies.json (the only request this page
// makes) and renders the checklist, detail panel, roadmap, missables and sources tabs.
// Progress is stored on the device only, in localStorage.

import {
  DEMO_EARNED,
  loadEarned,
  saveEarned,
  clearEarned,
  gradeCounts,
  stageProgress,
  nextUp,
  isAtRisk,
  isMasked,
  filterTrophies,
} from './tracker.js';

const params = new URLSearchParams(location.search);
const demo = params.get('demo') === '1';
const SPOILER_KEY = 'leonida-nights-v2-spoilers';

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const stages = doc.stages;

let earned = demo ? new Set(DEMO_EARNED) : loadEarned();
let hideSpoilers = params.get('spoilers') === 'hide'
  ? true
  : params.get('spoilers') === 'show'
    ? false
    : localStorage.getItem(SPOILER_KEY) === '1';
let selectedId = Number(params.get('select'));
if (!byId.has(selectedId)) selectedId = 28; // Positive Mental Attitude by default.

const filters = { query: '', grade: 'all', kind: 'all', earnedOnly: false };

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const gradeLabel = (g) => g[0].toUpperCase() + g.slice(1);

function persist() {
  if (demo) return; // Demo mode never writes: screenshots must not touch real progress.
  saveEarned(earned);
  localStorage.setItem(SPOILER_KEY, hideSpoilers ? '1' : '0');
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  $('progressText').textContent = `${done} of ${total} earned`;
  const bar = $('progressBar');
  bar.setAttribute('aria-valuenow', String(done));
  $('progressFill').style.width = `${(done / total) * 100}%`;
  const counts = gradeCounts(trophies, earned);
  const box = $('gradeCounts');
  box.replaceChildren();
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const span = el('span');
    const dot = el('b', `grade-${g}`, gradeLabel(g));
    span.append(dot, ` ${counts[g]}/${trophies.filter((t) => t.grade === g).length}`);
    box.append(span);
  }
  const up = nextUp(trophies, earned);
  const next = $('nextUp');
  next.replaceChildren();
  if (!up) {
    next.append(el('strong', null, 'Platinum earned — '), document.createTextNode('Vice Got a Price! is yours. Leonida Legend.'));
    return;
  }
  if (up.reason === 'missable') {
    next.append(
      document.createTextNode('Next up: '),
      el('strong', null, up.trophy.name),
      document.createTextNode(' — '),
      el('span', 'warn-tag', 'Chapter 1 warning: '),
      document.createTextNode('do Lucia’s balcony meditation before Chapter 1 ends. It is the only missable trophy.'),
    );
    return;
  }
  const stage = stages.find((s) => s.id === up.trophy.stage);
  next.append(
    document.createTextNode('Next up: '),
    el('strong', null, up.trophy.name),
    document.createTextNode(` — ${up.trophy.description} (Stage ${stage.id} · ${stage.name}).`),
  );
}

function tag(text, cls) {
  return el('span', `tag${cls ? ` ${cls}` : ''}`, text);
}

function renderChecklist() {
  const list = filterTrophies(trophies, earned, filters);
  $('listCount').textContent = `Showing ${list.length} of ${trophies.length} trophies${earned.size ? ` · ${earned.size} earned` : ''}`;
  const box = $('checklist');
  box.replaceChildren();
  if (!list.length) {
    box.append(el('p', 'empty', 'No trophies match these filters.'));
    return;
  }
  for (const t of list) {
    const masked = isMasked(t, hideSpoilers, earned);
    const row = el('div', `trophy-row${earned.has(t.id) ? ' earned' : ''}${t.id === selectedId ? ' selected' : ''}`);
    row.setAttribute('role', 'listitem');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = earned.has(t.id);
    check.setAttribute('aria-label', `Mark ${masked ? 'hidden trophy' : t.name} as earned`);
    check.addEventListener('change', () => {
      if (check.checked) earned.add(t.id);
      else earned.delete(t.id);
      persist();
      renderAll();
    });
    const main = el('button', 't-main');
    main.type = 'button';
    main.addEventListener('click', () => {
      selectedId = t.id;
      renderChecklist();
      renderDetail();
    });
    main.append(el('div', 't-name', masked ? 'Hidden trophy' : t.name));
    main.append(el('div', 't-desc', masked ? 'Earn it to reveal its name and description.' : t.description));
    const meta = el('div', 't-meta');
    if (t.missable) meta.append(tag('Missable', 'danger'));
    if (t.timeLimited) meta.append(tag('Time-limited', 'warn'));
    if (t.hidden && !masked) meta.append(tag('Hidden', 'hidden-tag'));
    if (t.unconfirmed) meta.append(tag('Unconfirmed', 'unconfirmed'));
    meta.append(tag(t.kind));
    main.append(meta);
    row.append(check, main, el('span', `grade-dot grade-${t.grade}`, gradeLabel(t.grade)));
    box.append(row);
  }
}

function renderDetail() {
  const t = byId.get(selectedId);
  const box = $('detail');
  box.replaceChildren();
  if (!t) {
    box.append(el('p', 'empty', 'Pick a trophy from the list to see its full guide.'));
    return;
  }
  const masked = isMasked(t, hideSpoilers, earned);
  const head = el('div');
  head.append(el('h2', null, masked ? 'Hidden trophy' : t.name));
  head.append(el('p', 'd-desc', masked ? 'Earn it to reveal its name and description.' : t.description));
  box.append(head);
  const tags = el('div', 'd-tags');
  tags.append(tag(gradeLabel(t.grade), `grade-${t.grade}`));
  tags.append(tag(t.kind));
  const stage = stages.find((s) => s.id === t.stage);
  tags.append(tag(`Stage ${stage.id} · ${stage.name}`));
  if (t.hidden) tags.append(tag('Hidden', 'hidden-tag'));
  if (t.missable) tags.append(tag('Missable', 'danger'));
  if (t.timeLimited) tags.append(tag('Time-limited', 'warn'));
  if (t.unconfirmed) tags.append(tag('Unconfirmed', 'unconfirmed'));
  box.append(tags);
  if (masked) {
    box.append(el('p', 'empty', 'Spoilers are hidden. Earn this trophy in-game to reveal its guide — or turn Hide spoilers off.'));
    return;
  }
  if (t.missable) {
    const alert = el('div', 'alert-box');
    alert.append(el('strong', null, 'MISSABLE — '));
    alert.append(document.createTextNode('the only trophy that can be missed. Do the Chapter 1 balcony meditation before Chapter 1 ends, and keep a manual save at the start of every chapter.'));
    box.append(alert);
  }
  if (t.timeLimited) {
    const alert = el('div', 'alert-box warn-box');
    alert.append(el('strong', null, 'Time-limited — start early. '));
    alert.append(document.createTextNode('TechWiser warns this strand’s window can close; PowerPyx says quest-givers return after the story. Starting early covers both readings.'));
    box.append(alert);
  }
  if (t.unconfirmed) {
    const alert = el('div', 'alert-box warn-box');
    alert.append(el('strong', null, 'Unconfirmed. '));
    alert.append(document.createTextNode('No guide has pinned down the exact method yet. Check the Sources tab before you act on this one.'));
    box.append(alert);
  }
  box.append(el('h4', null, 'How to get it'));
  const steps = el('ol');
  for (const s of t.steps) steps.append(el('li', null, s));
  box.append(steps);
  const tip = el('div', 'tip-box');
  tip.append(el('strong', null, 'Tip: '));
  tip.append(document.createTextNode(t.tip));
  box.append(tip);
  const src = el('p', 'd-sources');
  src.append(el('strong', null, 'Sources: '));
  src.append(document.createTextNode(t.sources.join(' · ')));
  box.append(src);
}

function renderRoadmap() {
  const box = $('stageCards');
  box.replaceChildren();
  for (const s of stages) {
    const card = el('div', 'stage-card');
    const h = el('h3');
    h.append(el('span', 'stage-num', `Stage ${s.id}`), document.createTextNode(s.name));
    card.append(h);
    card.append(el('p', 'stage-tag', s.tagline));
    const { total, done } = stageProgress(trophies, s.id, earned);
    card.append(el('p', 'stage-count', `${done} of ${total} earned`));
    const bar = el('div', 'bar');
    const fill = el('div', 'fill');
    fill.style.width = `${total ? (done / total) * 100 : 0}%`;
    bar.append(fill);
    card.append(bar);
    const chips = el('div', 'stage-trophies');
    const members = trophies.filter((t) => t.stage === s.id).sort((a, b) => a.id - b.id);
    for (const t of members) {
      const b = el('button', earned.has(t.id) ? 'earned' : null, isMasked(t, hideSpoilers, earned) ? 'Hidden trophy' : t.name);
      b.type = 'button';
      b.addEventListener('click', () => {
        selectedId = t.id;
        switchTab('tracker');
        renderAll();
      });
      chips.append(b);
    }
    card.append(chips);
    box.append(card);
  }
}

function renderMissables() {
  const pma = trophies.find((t) => t.name === 'Positive Mental Attitude');
  const card = $('missableCard');
  card.replaceChildren();
  card.append(el('h3', null, 'The only missable trophy'));
  const row = el('div', 'risk-row');
  const b = el('button', null, pma.name);
  b.type = 'button';
  b.addEventListener('click', () => {
    selectedId = pma.id;
    switchTab('tracker');
    renderAll();
  });
  row.append(b, el('span', null, 'Meditate at every spot across Leonida — 18 spots at 10 locations. The Chapter 1 balcony meditation is gone after Chapter 1.'));
  card.append(row);
  card.append(el('p', null, 'The balcony session adds +1 to the counter but is not marked as a spot. PowerPyx says it is unconfirmed whether it is required; its author did it and earned the trophy, so do it. The 100% checklist needs only 15 of 18 meditations, so 100% is safe either way — only this trophy is at risk.'));
  const list = $('timeLimitedList');
  list.replaceChildren();
  for (const t of trophies.filter((t) => t.timeLimited)) {
    const r = el('div', 'risk-row');
    const btn = el('button', null, t.name);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      selectedId = t.id;
      switchTab('tracker');
      renderAll();
    });
    r.append(btn, el('span', null, t.description));
    r.append(tag('Time-limited', 'warn'));
    list.append(r);
  }
}

function renderSources() {
  const box = $('sourceList');
  box.replaceChildren();
  for (const s of doc.sources) {
    const li = el('li');
    li.append(el('strong', null, s.name), document.createTextNode(` — ${s.note}`));
    box.append(li);
  }
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderDetail();
  renderRoadmap();
  renderMissables();
  renderSources();
}

function switchTab(name) {
  for (const btn of document.querySelectorAll('.tab')) {
    btn.classList.toggle('active', btn.dataset.tab === name);
  }
  for (const panel of document.querySelectorAll('.panel')) {
    panel.classList.toggle('active', panel.id === `panel-${name}`);
  }
}

for (const btn of document.querySelectorAll('.tab')) {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
}

$('search').addEventListener('input', (e) => {
  filters.query = e.target.value;
  renderChecklist();
});
$('gradeFilter').addEventListener('change', (e) => {
  filters.grade = e.target.value;
  renderChecklist();
});
$('kindFilter').addEventListener('change', (e) => {
  filters.kind = e.target.value;
  renderChecklist();
});
$('earnedOnly').addEventListener('change', (e) => {
  filters.earnedOnly = e.target.checked;
  renderChecklist();
});
$('spoilerToggle').checked = hideSpoilers;
$('spoilerToggle').addEventListener('change', (e) => {
  hideSpoilers = e.target.checked;
  persist();
  renderAll();
});
$('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify([...earned].sort((x, y) => x - y))], { type: 'application/json' }));
  a.download = 'leonida-nights-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const ids = JSON.parse(await file.text());
    if (!Array.isArray(ids)) throw new Error('not a list');
    const next = new Set(ids.filter((n) => byId.has(n)));
    earned = next;
    persist();
    renderAll();
  } catch {
    alert('That file is not a Leonida Nights progress export.');
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies?')) return;
  earned = new Set();
  clearEarned();
  renderAll();
});

if (params.get('tab') && ['tracker', 'roadmap', 'missables', 'sources'].includes(params.get('tab'))) {
  switchTab(params.get('tab'));
}
renderAll();
