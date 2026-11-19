// Leonida Nights — renders the 55 trophies, the checklist, filters, spoiler
// mode and the roadmap wiring. Fetches only data/trophies.json, a local file.
import { DEMO_EARNED, clearEarned, exportFileName, exportText, loadEarned, parseImport, saveEarned } from './tracker.js';

const params = new URLSearchParams(location.search);
const isDemo = params.get('demo') === '1';
const spoilerParam = params.get('spoiler') === '1';
const openId = Number(params.get('open') || 0);
const scrollTarget = params.get('scroll') || '';

const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const unearnedEl = document.getElementById('unearned-only');
const spoilerEl = document.getElementById('spoiler');
const countEl = document.getElementById('result-count');
const progressFill = document.getElementById('progress-fill');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

let trophies = [];
let earned = isDemo ? new Set(DEMO_EARNED) : loadEarned();
let kindFilter = 'all';
let spoilerOn = spoilerParam;

const KIND_LABELS = { story: 'Story', side: 'Side', collectibles: 'Collectibles', activities: 'Activities', platinum: 'Platinum' };
const STAGE_LABELS = { 1: 'Stage 1 · Story', 2: 'Stage 2 · Side', 3: 'Stage 3 · Activities', 4: 'Stage 4 · Collectibles', 5: 'Stage 5 · Cleanup' };

function gradePill(grade) {
  const pill = document.createElement('span');
  pill.className = 'grade grade-' + grade;
  pill.textContent = grade;
  return pill;
}

function tagEl(text, cls) {
  const tag = document.createElement('span');
  tag.className = 'tag' + (cls ? ' ' + cls : '');
  tag.textContent = text;
  return tag;
}

function buildGuide(t, hiddenBySpoiler) {
  const box = document.createElement('div');
  box.className = 'guide';
  box.hidden = t.id !== openId;
  if (hiddenBySpoiler) {
    const p = document.createElement('p');
    p.textContent = 'Guide hidden until this trophy is earned — spoiler mode is on.';
    box.append(p);
    return box;
  }
  const stepsH = document.createElement('h4');
  stepsH.textContent = 'How to get it';
  box.append(stepsH);
  const steps = document.createElement('ol');
  for (const step of t.steps || []) {
    const li = document.createElement('li');
    li.textContent = step;
    steps.append(li);
  }
  box.append(steps);
  if (t.tip) {
    const tip = document.createElement('p');
    tip.className = 'tip';
    tip.textContent = 'Tip: ' + t.tip;
    box.append(tip);
  }
  const sources = document.createElement('p');
  sources.className = 'sources';
  sources.textContent = 'Sources: ';
  (t.sources || []).forEach((s, i) => {
    if (i > 0) sources.append(document.createTextNode(' · '));
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    sources.append(a);
  });
  box.append(sources);
  return box;
}

function buildCard(t) {
  const card = document.createElement('article');
  card.className = 'trophy';
  card.id = 'trophy-' + t.id;
  card.dataset.id = String(t.id);
  card.dataset.grade = t.grade;
  card.dataset.kind = t.kind;
  card.dataset.missable = t.missable ? '1' : '0';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.setAttribute('aria-label', 'Earned: ' + t.name);
  box.checked = earned.has(t.id);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    if (!isDemo) saveEarned(earned);
    card.classList.toggle('earned', box.checked);
    refreshProgress();
    applyFilters();
  });
  card.append(box);

  const main = document.createElement('div');
  const hiddenBySpoiler = spoilerOn && t.kind === 'story' && !earned.has(t.id);
  const name = document.createElement('h3');
  name.className = 'trophy-name';
  name.textContent = hiddenBySpoiler ? 'Hidden trophy' : t.name;
  main.append(name);
  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = hiddenBySpoiler ? 'Earn this trophy to reveal its story.' : t.description;
  main.append(desc);
  card.append(main);

  card.append(gradePill(t.grade));

  const tags = document.createElement('div');
  tags.className = 'tags';
  tags.append(tagEl(KIND_LABELS[t.kind] || t.kind));
  tags.append(tagEl(STAGE_LABELS[t.stage] || ''));
  if (t.hidden) tags.append(tagEl('Hidden on PSN', 'hidden-tag'));
  if (t.missable) tags.append(tagEl('⚠ Missable', 'missable'));
  if (Number.isFinite(t.count)) tags.append(tagEl('Count: ' + t.count.toLocaleString('en-US')));
  card.append(tags);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  toggle.textContent = t.id === openId ? 'Hide guide' : 'Show guide';
  const guide = buildGuide(t, hiddenBySpoiler);
  toggle.addEventListener('click', () => {
    guide.hidden = !guide.hidden;
    toggle.textContent = guide.hidden ? 'Show guide' : 'Hide guide';
  });
  card.append(toggle);
  card.append(guide);

  if (earned.has(t.id)) card.classList.add('earned');
  return card;
}

function refreshProgress() {
  const n = earned.size;
  const pct = Math.round((n / trophies.length) * 100);
  progressFill.style.width = pct + '%';
  progressBar.setAttribute('aria-valuenow', String(n));
  progressText.textContent = n + ' of ' + trophies.length + ' earned · ' + pct + '%';
}

function applyFilters() {
  const q = searchEl.value.trim().toLowerCase();
  const grade = gradeEl.value;
  const unearnedOnly = unearnedEl.checked;
  let shown = 0;
  for (const t of trophies) {
    const card = document.getElementById('trophy-' + t.id);
    let show = true;
    if (grade !== 'all' && t.grade !== grade) show = false;
    if (unearnedOnly && earned.has(t.id)) show = false;
    if (kindFilter === 'missable' && !t.missable) show = false;
    else if (kindFilter === 'online') show = false;
    else if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) show = false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) show = false;
    card.classList.toggle('hidden-row', !show);
    if (show) shown += 1;
  }
  countEl.textContent = kindFilter === 'online'
    ? 'Showing 0 of 55 trophies — GTA VI has no online trophies; every trophy is earned in single-player.'
    : 'Showing ' + shown + ' of ' + trophies.length + ' trophies';
}

function wireControls() {
  searchEl.addEventListener('input', applyFilters);
  gradeEl.addEventListener('change', applyFilters);
  unearnedEl.addEventListener('change', applyFilters);
  spoilerEl.addEventListener('change', () => {
    spoilerOn = spoilerEl.checked;
    renderList();
  });
  document.querySelectorAll('.kind-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.kind-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      kindFilter = btn.dataset.kind;
      applyFilters();
    });
  });
  document.getElementById('export').addEventListener('click', () => {
    const blob = new Blob([exportText(earned)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exportFileName();
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const next = parseImport(await file.text(), trophies);
      earned = next;
      if (!isDemo) saveEarned(earned);
      renderList();
    } catch {
      countEl.textContent = 'That file is not a Leonida Nights progress file — nothing was changed.';
    }
    e.target.value = '';
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (!window.confirm('Clear all earned trophies?')) return;
    earned = new Set();
    if (!isDemo) clearEarned();
    renderList();
  });
}

function renderList() {
  listEl.replaceChildren();
  for (const t of trophies) listEl.append(buildCard(t));
  refreshProgress();
  applyFilters();
}

async function main() {
  spoilerEl.checked = spoilerOn;
  const doc = await (await fetch('data/trophies.json')).json();
  trophies = doc.trophies;
  wireControls();
  renderList();
  if (scrollTarget) {
    const target = document.getElementById(scrollTarget);
    if (target) target.scrollIntoView({ block: 'start' });
  }
  requestAnimationFrame(() => {
    window.__shotReady = true;
  });
}

main().catch((err) => {
  listEl.textContent = 'Could not load the trophy list: ' + err.message;
  window.__shotReady = true;
});
