// Leonida Nights — the guide itself. Fetches data/trophies.json (the only request
// the page ever makes), renders the tracker, the detail panel, the roadmap and the
// missables list, and keeps progress in localStorage via tracker.js.
import { DEMO_EARNED, download, exportProgress, importProgress, loadEarned, loadPrefs, saveEarned, savePrefs } from './tracker.js';

const STAGES = [
  { n: 1, title: 'Story — play the campaign', about: 'Chapters 1–4, the final mission, and the named story missions. All unmissable: just play the campaign, and keep a manual save at the start of every chapter.' },
  { n: 2, title: 'Side stories — strangers', about: 'The five stranger finales plus the Strangers & Freaks strand count. Start each strand as soon as it appears — TechWiser warns these chains have windows tied to story progress.' },
  { n: 3, title: 'Activities — races, stunts & games', about: 'Driving, racing, stunts and the quick minigames. Fold these into normal play: races, drone races, fishing, the arcade and bowling all live here.' },
  { n: 4, title: 'Activities — combat, heists & weapons', about: 'Shooting ranges, Combat Focus, and every robbery: shops, jewelry, armored trucks, bank vaults and gang operations. Vaults need the optional Chapter 4 mission first.' },
  { n: 5, title: 'Exploration, one-offs & the long tail', about: 'Seeing all of Leonida, the vague one-off trophies, spending and property — plus A Long Road itself, the 100% gold that this stage ends on.' },
  { n: 6, title: 'Collectibles & hunts', about: 'The hunts with a counter: 18 meditation spots, 3 card sets, 100 WAiNK locations, 100 vehicles, Bret’s animal, and 10 Scooter Bros registrations.' },
  { n: 7, title: 'Platinum', about: 'Vice Got a Price! — it pops on its own the moment the other 54 are earned. No separate task.' },
];

const KINDS = ['Story', 'Side story', 'Collectibles', 'Activities', 'Robbery', 'Exploration & misc', '100% completion'];

// One honest line per time-limited trophy, for the Missables tab.
const RISK_NOTES = {
  22: 'Andy’s strand is Lucia-only and opens in Chapter 3. Run it when it appears; the finale is Puff Puff Pass.',
  23: 'Kenton’s line is marked in Chapter 1 and he goes quiet after it, then comes back in Chapter 2–3. Don’t mistake the gap for a lockout — but don’t leave the chain to the end either.',
  24: 'Billy’s five jobs open after the Chapter 2 mission Coffee Break at the Thrillbilly Mud Club. Run them back to back.',
  25: 'Needs 8 strands, and some are chapter-gated — Shirley’s two missions are Chapter 1 only. Start strands early so the count is never hostage to one late strand.',
  26: 'Randy’s strand opens in Chapter 3 and is short. Clear it in one session when it appears.',
  27: 'Tyrone’s opener is Jason-only in Chapter 3. Switch to Jason when his icon appears.',
};

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';

const state = {
  trophies: [],
  earned: DEMO ? new Set(DEMO_EARNED) : loadEarned(),
  selectedId: 28, // Positive Mental Attitude: the trophy that decides the platinum.
  revealed: new Set(),
  kind: 'all',
  grade: '',
  query: '',
  spoilers: params.get('spoiler') === '1' ? true : loadPrefs().spoilers,
  earnedOnly: loadPrefs().earnedOnly,
  tab: params.get('tab') || 'tracker',
};

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const esc = (s) => s;

function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }

function isMasked(t) {
  return state.spoilers && t.hidden && !state.earned.has(t.id) && !state.revealed.has(t.id);
}

function persist() {
  if (DEMO) return; // Demo progress is for screenshots, never saved.
  saveEarned(state.earned);
  savePrefs({ spoilers: state.spoilers, earnedOnly: state.earnedOnly });
}

function stageOf(n) { return STAGES.find((s) => s.n === n); }

function nextUp() {
  const byId = new Map(state.trophies.map((t) => [t.id, t]));
  const pma = byId.get(28);
  if (pma && !state.earned.has(28)) {
    return { t: pma, why: 'The only trophy that can be missed. Do Lucia’s balcony meditation in Chapter 1 — it disappears after the chapter ends.' };
  }
  const ordered = [...state.trophies].sort((a, b) => a.stage - b.stage || a.id - b.id);
  const next = ordered.find((t) => !state.earned.has(t.id));
  if (!next) return { t: null, why: 'Every trophy is earned — the platinum is yours.' };
  return { t: next, why: `First unearned trophy in roadmap order (Stage ${next.stage}: ${stageOf(next.stage).title}).` };
}

function renderProgress() {
  const earned = state.earned.size;
  const pct = Math.round((earned / 55) * 100);
  $('earnedCount').textContent = earned;
  $('pctLine').textContent = `${pct}% to the platinum`;
  $('progressFill').style.width = `${pct}%`;
  $('progressBar').setAttribute('aria-valuenow', String(earned));
  const byGrade = (g) => state.trophies.filter((t) => t.grade === g && state.earned.has(t.id)).length;
  $('gradeLine').textContent = `platinum ${byGrade('platinum')}/1 · gold ${byGrade('gold')}/2 · silver ${byGrade('silver')}/6 · bronze ${byGrade('bronze')}/46`;
  $('stageCounts').innerHTML = STAGES.map((s) => {
    const total = state.trophies.filter((t) => t.stage === s.n).length;
    const got = state.trophies.filter((t) => t.stage === s.n && state.earned.has(t.id)).length;
    return `S${s.n} <b>${got}/${total}</b>`;
  }).join(' · ');
  const nu = nextUp();
  const box = $('nextUp');
  box.innerHTML = '';
  box.appendChild(el('p', 'nu-label', 'Next up'));
  if (nu.t) {
    box.appendChild(el('p', 'nu-name', nu.t.name));
    box.appendChild(el('p', 'nu-why', nu.why));
    const link = el('p', 'nu-link');
    const btn = el('button', null, 'Read its guide →');
    btn.type = 'button';
    btn.addEventListener('click', () => selectTrophy(nu.t.id, true));
    link.appendChild(btn);
    box.appendChild(link);
  } else {
    box.appendChild(el('p', 'nu-name', 'Platinum earned'));
    box.appendChild(el('p', 'nu-why', nu.why));
  }
}

function renderPills() {
  const wrap = $('kindPills');
  wrap.innerHTML = '';
  const mk = (value, label, cls) => {
    const b = el('button', 'pill' + (cls ? ' ' + cls : '') + (state.kind === value ? ' active' : ''), label);
    b.type = 'button';
    b.addEventListener('click', () => { state.kind = value; renderPills(); renderList(); });
    return b;
  };
  wrap.appendChild(mk('all', 'All 55'));
  for (const k of KINDS) wrap.appendChild(mk(k, k));
  wrap.appendChild(mk('risk', 'Missable / at risk', 'risk'));
}

function filtered() {
  const q = state.query.trim().toLowerCase();
  return state.trophies.filter((t) => {
    if (state.earnedOnly && !state.earned.has(t.id)) return false;
    if (state.grade && t.grade !== state.grade) return false;
    if (state.kind === 'risk') {
      if (!t.missable && !t.timeLimited) return false;
    } else if (state.kind !== 'all' && t.kind !== state.kind) {
      return false;
    }
    if (q) {
      const hay = `${t.name} ${t.description} ${t.kind}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function tagRow(t) {
  const tags = el('div', 'trophy-tags');
  tags.appendChild(el('span', `tag ${t.grade}`, gradeLabel(t.grade)));
  if (isMasked(t)) {
    tags.appendChild(el('span', 'tag hidden', 'Hidden on PSN'));
  } else {
    tags.appendChild(el('span', 'tag kind', t.kind));
    tags.appendChild(el('span', 'tag stage', `Stage ${t.stage}`));
    if (t.hidden) tags.appendChild(el('span', 'tag hidden', 'Hidden'));
    if (t.missable) tags.appendChild(el('span', 'tag missable', 'Missable'));
    if (t.timeLimited) tags.appendChild(el('span', 'tag timelimited', 'Time-limited'));
  }
  return tags;
}

function renderList() {
  const list = $('trophyList');
  list.innerHTML = '';
  const rows = filtered();
  const kindName = state.kind === 'all' ? 'all kinds' : state.kind === 'risk' ? 'missable / at risk' : state.kind;
  $('statusLine').textContent = `Showing ${rows.length} of 55 trophies (${kindName}). Spoilers ${state.spoilers ? 'hidden: hidden trophies stay secret until earned' : 'off: every name and description is shown'}. Progress saves automatically in this browser.`;
  if (rows.length === 0) {
    list.appendChild(el('li', 'empty', 'No trophies match these filters. Clear the search or pick another kind.'));
    return;
  }
  for (const t of rows) {
    const earned = state.earned.has(t.id);
    const masked = isMasked(t);
    const li = el('li', `trophy${earned ? ' earned' : ''}${state.selectedId === t.id ? ' selected' : ''}`);
    li.id = `trophy-${t.id}`;
    li.dataset.id = String(t.id);
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned;
    box.setAttribute('aria-label', `Earned: ${masked ? 'hidden trophy' : t.name}`);
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEarned(t.id);
    });
    li.appendChild(box);
    const body = el('div', 'trophy-body');
    body.appendChild(el('div', 'trophy-name', masked ? 'Hidden trophy' : t.name));
    body.appendChild(el('div', 'trophy-desc', masked ? 'Hidden on PSN — earn it to reveal its name.' : t.description));
    body.appendChild(tagRow(t));
    li.appendChild(body);
    const btn = el('button', 'guide-btn', 'Read guide');
    btn.type = 'button';
    btn.addEventListener('click', (e) => { e.stopPropagation(); selectTrophy(t.id, true); });
    li.appendChild(btn);
    li.addEventListener('click', () => selectTrophy(t.id, false));
    list.appendChild(li);
  }
}

function selectTrophy(id, scrollToDetail) {
  state.selectedId = id;
  renderList();
  renderDetail();
  if (scrollToDetail && window.innerWidth <= 900) {
    $('detailPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id); else state.earned.add(id);
  persist();
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
}

function renderDetail() {
  const panel = $('detailPanel');
  const t = state.trophies.find((x) => x.id === state.selectedId) || state.trophies[0];
  if (!t) { panel.innerHTML = ''; return; }
  panel.innerHTML = '';
  const earned = state.earned.has(t.id);
  if (isMasked(t)) {
    panel.appendChild(el('p', 'd-grade bronze', 'Hidden trophy'));
    panel.appendChild(el('h2', null, 'Hidden trophy'));
    panel.appendChild(el('p', 'd-desc', 'This trophy is hidden on PSN. Its name and description stay secret until you earn it.'));
    panel.appendChild(el('p', 'detail-empty', 'Turn spoilers off to see it, or reveal just this one — its guide names the mission, which is a story spoiler.'));
    const btn = el('button', 'guide-btn', 'Reveal this trophy');
    btn.type = 'button';
    btn.style.marginTop = '8px';
    btn.addEventListener('click', () => { state.revealed.add(t.id); renderList(); renderDetail(); });
    panel.appendChild(btn);
    return;
  }
  panel.appendChild(el('p', `d-grade ${t.grade}`, `${gradeLabel(t.grade)} trophy`));
  panel.appendChild(el('h2', null, t.name));
  panel.appendChild(el('p', 'd-desc', t.description));
  const meta = el('div', 'd-meta');
  meta.appendChild(el('span', 'tag kind', t.kind));
  meta.appendChild(el('span', 'tag stage', `Stage ${t.stage} — ${stageOf(t.stage).title}`));
  if (t.hidden) meta.appendChild(el('span', 'tag hidden', 'Hidden on PSN'));
  panel.appendChild(meta);
  const st = el('p', 'd-state');
  st.innerHTML = earned ? '<b>✓ Earned</b> — ticked in your checklist.' : 'Not earned yet — tick the box in the list when you earn it.';
  panel.appendChild(st);
  if (t.missable) {
    const warn = el('div', 'warn-box');
    const p = el('p');
    p.innerHTML = '<strong>Missable.</strong> The only trophy PowerPyx and GTABase flag as possibly missable. One of the 18 spots is at Jason’s house in Chapter 1 — meditate there before the story moves on. There is no mission replay, so keep a manual save at the start of every chapter.';
    warn.appendChild(p);
    panel.appendChild(warn);
  }
  if (t.timeLimited) {
    const warn = el('div', 'warn-box time');
    const p = el('p');
    p.innerHTML = '<strong>Time-limited — start early.</strong> TechWiser reports this stranger chain has windows tied to story progress. Only one source gives that warning, and PowerPyx says trophy quest-givers return after the story — so start the chain when it appears, but don’t treat it as a confirmed lockout.';
    warn.appendChild(p);
    panel.appendChild(warn);
  }
  panel.appendChild(el('h3', null, 'Guide — in our own words'));
  const ol = el('ol', 'steps');
  for (const s of t.steps) ol.appendChild(el('li', null, s));
  panel.appendChild(ol);
  const tip = el('p', 'd-tip');
  tip.innerHTML = `<strong>Tip:</strong> ${esc(t.tip)}`;
  panel.appendChild(tip);
  panel.appendChild(el('h3', null, 'Sources'));
  const ul = el('ul', 'sources');
  for (const s of t.sources) {
    const li = el('li');
    li.innerHTML = `<b>${esc(s.site)}</b> — ${esc(s.note)}`;
    ul.appendChild(li);
  }
  panel.appendChild(ul);
}

function renderRoadmap() {
  const wrap = $('stageList');
  wrap.innerHTML = '';
  for (const s of STAGES) {
    const members = state.trophies.filter((t) => t.stage === s.n);
    const got = members.filter((t) => state.earned.has(t.id)).length;
    const card = el('div', 'stage-card');
    card.appendChild(el('h3', null, `Stage ${s.n} — ${s.title}`));
    card.appendChild(el('p', 's-count', `${got}/${members.length} earned`));
    const bar = el('div', 'bar');
    const fill = el('span');
    fill.style.width = `${members.length ? Math.round((got / members.length) * 100) : 0}%`;
    bar.appendChild(fill);
    card.appendChild(bar);
    card.appendChild(el('p', null, s.about));
    const ul = el('ul');
    for (const t of members) {
      const li = el('li', state.earned.has(t.id) ? 'done' : '');
      li.textContent = (state.earned.has(t.id) ? '✓ ' : '') + t.name;
      if (t.missable) li.appendChild(el('span', 'mini-tag', ' — missable'));
      else if (t.timeLimited) li.appendChild(el('span', 'mini-tag', ' — time-limited'));
      ul.appendChild(li);
    }
    card.appendChild(ul);
    wrap.appendChild(card);
  }
}

function renderMissables() {
  const banner = $('missableBanner');
  banner.innerHTML = '';
  const p1 = el('p');
  p1.innerHTML = '<strong>One trophy can be missed: Positive Mental Attitude.</strong> Lucia’s balcony meditation in Chapter 1 disappears after Chapter 1 ends. Do it in Chapter 1 and keep a Chapter 1 save until the trophy pops.';
  const p2 = el('p');
  p2.textContent = 'The balcony session adds +1 to the meditation counter but isn’t marked as a Meditation Spot, and PowerPyx says it is still unconfirmed whether the trophy needs it. The safe play is to do it — PowerPyx’s author did it and earned the trophy. There is no mission replay and no New Game+, so keep a manual save at the start of every chapter and one untouched save before the final mission. Never use cheats on your trophy save — cheats switch off trophies and saving.';
  banner.appendChild(p1);
  banner.appendChild(p2);
  const list = $('riskList');
  list.innerHTML = '';
  const risks = state.trophies.filter((t) => t.timeLimited).sort((a, b) => a.id - b.id);
  for (const t of risks) {
    const li = el('li');
    li.appendChild(el('b', null, `${t.name} — ${t.description}`));
    li.appendChild(el('p', null, RISK_NOTES[t.id] || 'Start this strand as soon as it appears.'));
    list.appendChild(li);
  }
}

function setTab(name) {
  state.tab = name;
  document.querySelectorAll('.tab').forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${name}`));
}

async function init() {
  const res = await fetch('data/trophies.json');
  if (!res.ok) throw new Error(`could not load data/trophies.json (${res.status})`);
  const data = await res.json();
  state.trophies = data.trophies.slice().sort((a, b) => a.id - b.id);

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('search').addEventListener('input', (e) => { state.query = e.target.value; renderList(); });
  $('gradeFilter').addEventListener('change', (e) => { state.grade = e.target.value; renderList(); });
  $('spoilerToggle').checked = state.spoilers;
  $('spoilerToggle').addEventListener('change', (e) => { state.spoilers = e.target.checked; persist(); renderList(); renderDetail(); });
  $('earnedOnly').checked = state.earnedOnly;
  $('earnedOnly').addEventListener('change', (e) => { state.earnedOnly = e.target.checked; persist(); renderList(); });
  $('exportBtn').addEventListener('click', () => download('leonida-nights-progress.json', exportProgress(state.earned)));
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      state.earned = importProgress(text);
      persist();
      renderProgress(); renderList(); renderDetail(); renderRoadmap();
      $('statusLine').textContent = `Imported ${state.earned.size} earned trophies from ${file.name}.`;
    } catch (err) {
      $('statusLine').textContent = `Import failed: ${err.message}`;
    }
    e.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Reset all progress? This clears every ticked trophy.')) return;
    state.earned = new Set();
    persist();
    renderProgress(); renderList(); renderDetail(); renderRoadmap();
  });

  // URL-driven views (used by the screenshot run, and shareable by players).
  const openId = Number(params.get('open'));
  if (openId >= 1 && openId <= 55) state.selectedId = openId;
  renderPills();
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
  setTab(['tracker', 'roadmap', 'missables', 'sources'].includes(state.tab) ? state.tab : 'tracker');
  if (params.get('scroll')) {
    const target = document.getElementById(`trophy-${params.get('scroll').replace('trophy-', '')}`);
    if (target) target.scrollIntoView({ block: 'start' });
  }
  window.__shotReady = true;
}

init().catch((err) => {
  document.body.insertAdjacentHTML('beforeend', `<p style="color:#ff8a7a;padding:12px">Could not load this page: ${err.message}</p>`);
  window.__shotReady = false;
});
