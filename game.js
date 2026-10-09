/* Lottie's Bus Party — a colour-matching traffic-jam puzzle.
 * Tap vehicles with a clear path out of the lot; they drive round to the bays and
 * passengers of the matching colour hop on. Don't let the bays jam up! */
(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(a, r) {
  for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > PI) d -= TAU;
  if (d < -PI) d += TAU;
  return d;
}
function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }

/* ------------------------------------------------------------------ save */
const SAVE_KEY = 'lottiesBusParty.v1';
function freshSave() {
  return { maxLevel: 1, coins: 50, boost: { bay: 2, lift: 2, sort: 2 }, sound: true, vib: true, stars: {}, seen: {} };
}
let save = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s === 'object') {
      const f = freshSave();
      return Object.assign(f, s, { boost: Object.assign(f.boost, s.boost || {}), stars: s.stars || {}, seen: s.seen || {} });
    }
  } catch (e) { /* storage unavailable */ }
  return freshSave();
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }

/* --------------------------------------------------------------- palette */
const PAL = [
  { main: '#ff4d6d', dark: '#c9184a', light: '#ffc2cf' }, // red
  { main: '#4d96ff', dark: '#1f5fd1', light: '#c8ddff' }, // blue
  { main: '#38d96b', dark: '#1e9e48', light: '#c6f7d5' }, // green
  { main: '#ffd23f', dark: '#cf9500', light: '#fff3bf' }, // yellow
  { main: '#9b5de5', dark: '#6a2fb8', light: '#e3d2ff' }, // purple
  { main: '#ff8c42', dark: '#d45e14', light: '#ffdcc2' }, // orange
  { main: '#ff70c8', dark: '#cf3d9a', light: '#ffd7f0' }, // pink
  { main: '#2ee6d6', dark: '#0f9b91', light: '#c4fbf6' }, // teal
  { main: '#ffc61a', dark: '#b87d00', light: '#fff0a6' }, // PARTY gold
];
const PARTY = 8;
const RAINBOW = ['#ff4d6d', '#ff8c42', '#ffd23f', '#38d96b', '#4d96ff', '#9b5de5'];
const MYST = { main: '#9097ad', dark: '#5f667c', light: '#c9cdd9' };
const SKIN = ['#ffdcc4', '#f6c79e', '#e2aa7c', '#bf7f55', '#8d5838', '#62402a'];
const HAIR = ['#3b2a20', '#1d1d1d', '#8a4b20', '#e8b84e', '#c24a2a', '#6b4b9e', '#ff70c8'];

/* ---------------------------------------------------------------- themes */
const THEMES = {
  bus: {
    key: 'bus', world: 'City Streets', noun: 'bus', plural: 'buses', emoji: '🚌', depart: 'road',
    lift: ['🚁', 'Heli-Lift'], lockName: 'Wheel-clamped', lockIcon: '🔒', garage: 'bus depot',
    sizes: { 4: [42, 24], 6: [54, 25], 10: [70, 27] }, maxN: 32,
  },
  boat: {
    key: 'boat', world: 'Sunny Harbour', noun: 'boat', plural: 'boats', emoji: '⛵', depart: 'road',
    lift: ['🏗️', 'Crane'], lockName: 'Still moored', lockIcon: '⚓', garage: 'boathouse',
    sizes: { 4: [42, 24], 6: [54, 26], 10: [68, 28] }, maxN: 30,
  },
  plane: {
    key: 'plane', world: 'Sky Airport', noun: 'plane', plural: 'planes', emoji: '✈️', depart: 'runway',
    lift: ['🚜', 'Tow'], lockName: 'Refuelling', lockIcon: '⛽', garage: 'hangar',
    sizes: { 4: [40, 34], 6: [50, 38], 10: [62, 44] }, maxN: 24,
  },
  train: {
    key: 'train', world: 'Rail Yard', noun: 'train', plural: 'trains', emoji: '🚂', depart: 'road',
    lift: ['🏗️', 'Crane'], lockName: 'Red signal', lockIcon: '🚦', garage: 'engine shed',
    sizes: { 4: [44, 18], 6: [60, 18], 10: [80, 18] }, maxN: 26,
  },
  space: {
    key: 'space', world: 'Star Port', noun: 'rocket', plural: 'rockets', emoji: '🚀', depart: 'up',
    lift: ['🛸', 'Tractor Beam'], lockName: 'Charging', lockIcon: '🔋', garage: 'launch silo',
    sizes: { 4: [40, 22], 6: [48, 24], 10: [60, 28] }, maxN: 26,
  },
};
const THEME_ORDER = ['bus', 'boat', 'plane', 'train', 'space'];
const PRICE = { bay: 60, lift: 45, sort: 30 };
const MAX_BAYS = 7;

/* Difficulty curve: 5 levels per world, worlds go City -> Harbour -> Airport -> Rail Yard ->
 * Star Port, then repeat as harder remixes. Every 5th level is a Party level. */
function levelConfig(L) {
  const wi = Math.floor((L - 1) / 5);
  const theme = THEME_ORDER[wi % THEME_ORDER.length];
  const cycle = Math.floor(wi / THEME_ORDER.length);
  const stage = (L - 1) % 5;
  const party = stage === 4;
  const T = THEMES[theme];
  const space = theme === 'space';
  const bays = space ? 4 : 5;
  const n = Math.min(T.maxN, Math.round(7 + L * 0.85 + (party ? 3 : 0)));
  const colors = Math.min(8, 3 + Math.floor((L + 1) / 4));
  let open = L <= 3 ? 3 : bays - 1;
  if ((cycle > 0 && party) || (L > 45 && L % 2 === 1)) open = bays;
  const stick = clamp(0.8 - L * 0.035, 0.2, 0.8);
  const mysteryFrac = (theme === 'boat' || space || cycle > 0) ? clamp(0.12 + cycle * 0.08 + stage * 0.03 + (space ? 0.08 : 0), 0, 0.4) : 0;
  const lockCount = (theme === 'plane' || space || cycle > 0) ? Math.min(7, 1 + stage + cycle * 2) : 0;
  let garages = 0;
  if (theme === 'bus') garages = L >= 3 ? (stage >= 3 ? 2 : 1) : 0;
  else if (theme === 'plane' || space) garages = 1;
  if (cycle > 0 && theme !== 'train') garages = 2;
  const garageSize = 2 + Math.min(3, Math.floor(L / 8));
  const asteroids = space ? Math.min(5, 2 + Math.floor(stage / 2) + cycle) : 0;
  const capW = L <= 3 ? { 4: 0.55, 6: 0.45, 10: 0 } : L <= 10 ? { 4: 0.35, 6: 0.45, 10: 0.2 } : { 4: 0.25, 6: 0.42, 10: 0.33 };
  const pods = clamp(24 - Math.floor(L / 2), 12, 24); // holding-circle size: fewer people = less choice
  // later Rail Yard levels criss-cross the tracks so it's hard to see what blocks what
  const spaghetti = theme === 'train' && (stage >= 2 || cycle > 0) ? Math.min(10, 4 + stage + cycle * 2) : 0;
  return {
    L, theme, cycle, stage, party, n, colors, open, stick, pods, bays, garages, garageSize, asteroids, spaghetti,
    diag: L >= 4 && theme !== 'train', mysteryFrac, lockCount, capW, world: wi + 1,
  };
}

/* --------------------------------------------------------- world geometry */
const LW = 400, BAY_H = 84, ROAD = 28;
const LOT = { x: 30, y: BAY_H + ROAD, w: 340, h: 356 };
const RING = { x: LOT.x - ROAD / 2, y: LOT.y - ROAD / 2, w: LOT.w + ROAD, h: LOT.h + ROAD };
const WORLD_BOTTOM = LOT.y + LOT.h + ROAD + 8;
const BAY_CY = BAY_H / 2 + 2;

let view = null;
let ring = null;       // holding-circle walkway geometry (stadium centreline)
let feeders = [];      // the two feeder lines: spots from the front (next to the circle) backwards

let lastLayoutKey = '';
function layoutKey() {
  return [canvas.clientWidth, canvas.clientHeight, Math.round($('hud').getBoundingClientRect().bottom), Math.round($('boosters').getBoundingClientRect().top)].join(',');
}

function computeLayout() {
  lastLayoutKey = layoutKey();
  // Measure the real on-screen size of the full-screen canvas: on iOS home-screen apps
  // innerHeight and the safe-area insets can be wrong at launch and settle later.
  const cssW = canvas.clientWidth || window.innerWidth, cssH = canvas.clientHeight || window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const top = $('hud').getBoundingClientRect().bottom + 4;
  const bot = cssH - $('boosters').getBoundingClientRect().top + 4;
  const avail = Math.max(300, cssH - top - bot);
  const NEED = 118 + WORLD_BOTTOM;
  const scale = Math.min(cssW / LW, avail / NEED);
  const hL = avail / scale;
  let extra = hL - NEED;
  const qExtra = clamp(extra, 0, 46);
  extra -= qExtra;
  const qH = 110 + qExtra;
  const ox = (cssW - LW * scale) / 2;
  const oy = top + (extra / 2 + qH + 8) * scale;
  view = { cssW, cssH, dpr, scale, ox, oy, qH, x0: -ox / scale, x1: (cssW - ox) / scale, y0: -oy / scale, y1: (cssH - oy) / scale };
  buildQueueArea();
  bgDirty = true;
}

function buildQueueArea() {
  const qTop = -8 - view.qH, qBot = -6;
  // Holding circle: people walk round it shoulder to shoulder, so it is sized to fit them.
  const SP = 14.5;
  const n = G ? G.pods.length : 20;
  const P = n * SP;
  const h = Math.min(qBot - qTop - 26, P / PI);
  const ls = Math.max(0, (P - PI * h) / 2);
  const w = ls + h;
  const x = LW / 2 - w / 2, y = (qTop + qBot) / 2 - h / 2;
  ring = { x, y, w, h, r: h / 2, ls, P: 2 * ls + PI * h, cy: y + h / 2, qTop, qBot };
  // Gaps in the walkway: an entrance at the lower left and lower right (from each feeder line)
  // and an exit at the bottom that leads down to the loading bays.
  const r = h / 2;
  ring.exitS = ls + PI * r + ls / 2;
  ring.gateS = [2 * ls + PI * r + PI * r / 4, ls + PI * r * 3 / 4];
  ring.exitPt = [LW / 2, y + h];
  ring.exitOut = [LW / 2, qBot + 4];
  // Feeder lines either side: the front is next to the circle, then they zig-zag outwards.
  const rowH = 16, y0 = qBot - 13;
  const rows = Math.max(1, Math.floor((qBot - qTop - 18) / rowH));
  feeders = [[x - 31, 14], [x + w + 31, 386]].map(([xin, xout]) => {
    const pts = [];
    for (let k = 0; k < rows; k++) {
      const yy = y0 - k * rowH;
      if (k % 2 === 0) pts.push([xin, yy], [xout, yy]); else pts.push([xout, yy], [xin, yy]);
    }
    const WS = 14, slots = [pts[0].slice()];
    let dist = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const L = Math.hypot(bx - ax, by - ay);
      let t = WS - dist;
      while (t <= L) { slots.push([ax + (bx - ax) * t / L, ay + (by - ay) * t / L]); t += WS; }
      dist = L - (t - WS);
    }
    return { slots, xin, xout, rows, rowH, y0 };
  });
}

function ringPoint(s) {
  const R = ring;
  s = ((s % R.P) + R.P) % R.P;
  if (s < R.ls) return [R.x + R.r + s, R.y];
  s -= R.ls;
  const arc = PI * R.r;
  if (s < arc) { const a = -PI / 2 + s / R.r; return [R.x + R.w - R.r + Math.cos(a) * R.r, R.cy + Math.sin(a) * R.r]; }
  s -= arc;
  if (s < R.ls) return [R.x + R.w - R.r - s, R.y + R.h];
  s -= R.ls;
  const a = PI / 2 + s / R.r;
  return [R.x + R.r + Math.cos(a) * R.r, R.cy + Math.sin(a) * R.r];
}
function podS(i) { return ((G.rot + i * ring.P / G.pods.length) % ring.P + ring.P) % ring.P; }
function podPos(i) { return ringPoint(podS(i)); }
function gateOut(li) {
  // a point just outside the walkway at entrance li (0 = left, 1 = right)
  const [x, y] = ringPoint(ring.gateS[li]);
  const [x2, y2] = ringPoint(ring.gateS[li] + 1);
  const nx = y2 - y, ny = -(x2 - x), nl = Math.hypot(nx, ny) || 1;
  return [x + nx / nl * 17, y + ny / nl * 17];
}

function bayW() { const n = G ? G.bays.length : 5; return Math.min(76, 384 / n); }
function bayPos(i) { const n = G.bays.length; return [LW / 2 + (i - (n - 1) / 2) * bayW(), BAY_CY]; }
// parked vehicles pull right up to the jetty / kerb / gate, so passengers step straight on
function bayY(v) { return 7 + v.len / 2; }
// where passengers get on: the front end of a parked vehicle
function doorPos(v) { return [v.x, v.y - v.len / 2 + 5]; }

/* --------------------------------------------------------- collision (SAT) */
function boxOf(v, pad = 0) { return { cx: v.x, cy: v.y, ang: v.ang, hl: v.len / 2 + pad, hw: v.wid / 2 + pad }; }
function homeBox(v) {
  if (v.state === 'bump') return { cx: v.bump.ox, cy: v.bump.oy, ang: v.ang, hl: v.len / 2, hw: v.wid / 2 };
  if (v.state === 'emerging') return { cx: v.tx, cy: v.ty, ang: v.ang, hl: v.len / 2, hw: v.wid / 2 };
  return boxOf(v);
}
function sweepBox(b) {
  const E = 1000;
  return { cx: b.cx + Math.cos(b.ang) * E, cy: b.cy + Math.sin(b.ang) * E, ang: b.ang, hl: b.hl + E, hw: b.hw - 1.5 };
}
function projR(o, ax, ay) {
  const c = Math.cos(o.ang), s = Math.sin(o.ang);
  return o.hl * Math.abs(c * ax + s * ay) + o.hw * Math.abs(-s * ax + c * ay);
}
function overlap(a, b) {
  const axes = [a.ang, a.ang + PI / 2, b.ang, b.ang + PI / 2];
  for (const t of axes) {
    const ax = Math.cos(t), ay = Math.sin(t);
    const d = Math.abs((a.cx - b.cx) * ax + (a.cy - b.cy) * ay);
    if (d >= projR(a, ax, ay) + projR(b, ax, ay)) return false;
  }
  return true;
}
function pointInBox(x, y, b) {
  const c = Math.cos(b.ang), s = Math.sin(b.ang);
  const dx = x - b.cx, dy = y - b.cy;
  return Math.abs(dx * c + dy * s) <= b.hl && Math.abs(-dx * s + dy * c) <= b.hw;
}

/* ------------------------------------------------------- level generation */
// Simulate clearing the lot. Garages release their vehicles one at a time onto the spot in
// front of their door; garage buildings are permanent obstacles. Returns an exit order
// (random choice among free vehicles when rng is given) and whatever could never get out.
function simulateExit(lotV, garages, rng) {
  const rem = new Set(lotV);
  const gq = garages.map((g) => g.queue.slice());
  const gBoxes = garages.map((g) => boxOf(g));
  const order = [];
  for (;;) {
    const present = [...rem];
    gq.forEach((q) => { if (q.length) present.push(q[0]); });
    if (!present.length) break;
    const boxes = present.map((v) => boxOf(v));
    const free = present.filter((v, i) => {
      const sw = sweepBox(boxes[i]);
      if (gBoxes.some((b) => overlap(sw, b))) return false;
      for (let j = 0; j < present.length; j++) if (j !== i && overlap(sw, boxes[j])) return false;
      return true;
    });
    if (!free.length) break;
    const take = rng ? [free[(rng() * free.length) | 0]] : free;
    for (const v of take) {
      order.push(v);
      if (v.garage != null) gq[v.garage].shift(); else rem.delete(v);
    }
  }
  return { order, stuck: [...rem], stuckGarages: gq.map((q, i) => (q.length ? i : -1)).filter((i) => i >= 0) };
}

function tryGenerate(cfg, T, rng) {
  const PAD = 3;
  const axis = [0, PI / 2, PI, -PI / 2], diag = [PI / 4, 3 * PI / 4, -PI / 4, -3 * PI / 4];
  const capPick = () => {
    const r = rng(); let acc = 0;
    for (const k of [4, 6, 10]) { acc += cfg.capW[k] || 0; if (r < acc) return k; }
    return 6;
  };
  const mk = (cap, ang, x, y) => { const [len, wid] = T.sizes[cap]; return { x, y, ang, len, wid, cap }; };
  const maxLen = T.sizes[10][0], maxWid = Math.max(T.sizes[4][1], T.sizes[6][1], T.sizes[10][1]);

  // 1) garages, each with a reserved exit spot in front of the door
  const garages = [], reserved = [];
  for (let gi = 0; gi < cfg.garages; gi++) {
    for (let t = 0; t < 300; t++) {
      const ang = [0, PI / 2, PI, -PI / 2][(rng() * 4) | 0];
      const c = Math.cos(ang), s = Math.sin(ang);
      const gl = 34, gw = maxWid + 10, total = gl + 3 + maxLen;
      const ex = Math.abs(c) * total / 2 + Math.abs(s) * gw / 2 + 4, ey = Math.abs(s) * total / 2 + Math.abs(c) * gw / 2 + 4;
      const mx = LOT.x + ex + rng() * (LOT.w - 2 * ex), my = LOT.y + ey + rng() * (LOT.h - 2 * ey);
      const g = { x: mx - c * (total / 2 - gl / 2), y: my - s * (total / 2 - gl / 2), ang, len: gl, wid: gw, queue: [] };
      const spot = { x: g.x + c * (gl / 2 + 3 + maxLen / 2), y: g.y + s * (gl / 2 + 3 + maxLen / 2), ang, len: maxLen, wid: gw };
      const combo = boxOf({ x: mx, y: my, ang, len: total, wid: gw }, 6);
      if (reserved.some((r) => overlap(combo, boxOf(r, 6)))) continue;
      const sw = sweepBox(boxOf(spot));
      if (reserved.some((r) => overlap(sw, boxOf(r)))) continue;
      if (garages.some((o) => overlap(sweepBox(boxOf(o.spot)), combo))) continue;
      g.spot = spot;
      garages.push(g); reserved.push(g, spot);
      break;
    }
  }
  let inGarages = 0;
  garages.forEach((g, gi) => {
    const k = 2 + ((rng() * (cfg.garageSize - 1)) | 0);
    const c = Math.cos(g.ang), s = Math.sin(g.ang);
    for (let i = 0; i < k; i++) {
      const v = mk(capPick(), g.ang, 0, 0);
      v.x = g.x + c * (g.len / 2 + 3 + v.len / 2); v.y = g.y + s * (g.len / 2 + 3 + v.len / 2);
      v.garage = gi;
      g.queue.push(v);
      inGarages++;
    }
  });

  // 2) vehicles parked in the lot
  const target = Math.max(4, cfg.n - inGarages);
  const lotV = [];
  const fits = (v) => {
    const b = boxOf(v, PAD);
    for (const r of reserved) if (overlap(b, boxOf(r, PAD))) return false;
    for (const u of lotV) if (overlap(b, boxOf(u, PAD))) return false;
    return true;
  };
  let tracks = null;
  if (cfg.theme === 'train') {
    tracks = [];
    if (cfg.spaghetti) {
      // Spaghetti Junction: straight lines at all sorts of angles criss-crossing the yard
      const angs = [0, PI / 2, PI / 6, -PI / 6, PI / 4, -PI / 4, PI / 3, -PI / 3];
      for (let i = 0; i < cfg.spaghetti; i++) {
        tracks.push({ x: LOT.x + 40 + rng() * (LOT.w - 80), y: LOT.y + 40 + rng() * (LOT.h - 80), ang: angs[(rng() * angs.length) | 0] });
      }
    } else {
      // parallel sidings
      for (let i = 0; i < 7; i++) tracks.push({ x: LOT.x + LOT.w / 2, y: LOT.y + 26 + i * (LOT.h - 52) / 6, ang: 0 });
    }
    // trains sit nose-to-tail along each line, mostly facing the nearer end
    for (const t of tracks) {
      const c = Math.cos(t.ang), s = Math.sin(t.ang);
      let cur = -430 + rng() * 10;
      while (cur < 430) {
        const cap = capPick();
        const len = T.sizes[cap][0], wid = T.sizes[cap][1];
        const mid = cur + len / 2;
        const ang = rng() < (mid < 0 ? 0.72 : 0.28) ? t.ang + PI : t.ang;
        const v = mk(cap, ang, t.x + c * mid, t.y + s * mid);
        const ex = Math.abs(c) * len / 2 + Math.abs(s) * wid / 2, ey = Math.abs(s) * len / 2 + Math.abs(c) * wid / 2;
        const inside = v.x - ex >= LOT.x + 2 && v.x + ex <= LOT.x + LOT.w - 2 && v.y - ey >= LOT.y + 2 && v.y + ey <= LOT.y + LOT.h - 2;
        if (inside && fits(v)) { lotV.push(v); cur += len + 6 + rng() * 12; } else cur += 5;
      }
    }
    shuffle(lotV, rng);
    lotV.length = Math.min(lotV.length, target);
  } else {
    let tries = 0;
    while (lotV.length < target && tries < 6000) {
      tries++;
      const cap = capPick();
      const [len, wid] = T.sizes[cap];
      const ang = (cfg.diag && rng() < 0.35) ? diag[(rng() * 4) | 0] : axis[(rng() * 4) | 0];
      const c = Math.abs(Math.cos(ang)), s = Math.abs(Math.sin(ang));
      const ex = c * len / 2 + s * wid / 2 + 2, ey = s * len / 2 + c * wid / 2 + 2;
      const v = mk(cap, ang, Math.round(LOT.x + ex + rng() * (LOT.w - 2 * ex)), Math.round(LOT.y + ey + rng() * (LOT.h - 2 * ey)));
      if (fits(v)) lotV.push(v);
    }
  }

  // 3) make sure everything can eventually leave: flip or remove deadlocked lot vehicles
  for (let it = 0; it < 400; it++) {
    const sim = simulateExit(lotV, garages, null);
    if (!sim.stuck.length && !sim.stuckGarages.length) break;
    if (!sim.stuck.length) { sim.stuckGarages.forEach((gi) => { garages[gi].queue.length = 0; }); continue; }
    const v = sim.stuck[(rng() * sim.stuck.length) | 0];
    if (!v.flipped) { v.ang += PI; v.flipped = true; }
    else lotV.splice(lotV.indexOf(v), 1);
  }
  const fin = simulateExit(lotV, garages, null);
  for (const v of fin.stuck) lotV.splice(lotV.indexOf(v), 1);
  fin.stuckGarages.forEach((gi) => { garages[gi].queue.length = 0; });
  for (const v of lotV) v.ang = Math.atan2(Math.sin(v.ang), Math.cos(v.ang));
  const all = lotV.concat(...garages.map((g) => g.queue));
  if (all.length < 4) return null;

  // 4) colours: every colour appears at least once; the biggest lot vehicle can be the Party one
  if (cfg.party && lotV.length) lotV.slice().sort((a, b) => b.cap - a.cap)[0].party = true;
  const others = all.filter((v) => !v.party);
  const cols = [];
  for (let i = 0; i < others.length; i++) cols.push(i < cfg.colors ? i : (rng() * cfg.colors) | 0);
  shuffle(cols, rng);
  others.forEach((v, i) => { v.color = cols[i]; });
  all.forEach((v) => { if (v.party) v.color = PARTY; });

  // 5) a guaranteed-valid exit order; the passenger queue is built around it
  const order = simulateExit(lotV, garages, rng).order;

  // Locks: a vehicle at plan position i may need up to (i - open + 1) departures first.
  if (cfg.lockCount) {
    const cand = order.map((v, i) => ({ v, i })).filter((o) => o.i >= cfg.open && !o.v.party && o.v.garage == null);
    shuffle(cand, rng);
    cand.slice(0, cfg.lockCount).forEach((o) => { o.v.lock = 1 + ((rng() * Math.min(o.i - cfg.open + 1, 8)) | 0); });
  }
  // Mystery: hide the colours of lot vehicles that start blocked.
  if (cfg.mysteryFrac) {
    const present = lotV.concat(garages.filter((g) => g.queue.length).map((g) => g.queue[0]));
    const gBoxes = garages.map((g) => boxOf(g));
    const blocked = lotV.filter((v) => {
      if (v.party || v.lock) return false;
      const sw = sweepBox(boxOf(v));
      return gBoxes.some((b) => overlap(sw, b)) || present.some((u) => u !== v && overlap(sw, boxOf(u)));
    });
    shuffle(blocked, rng);
    blocked.slice(0, Math.round(cfg.mysteryFrac * all.length)).forEach((v) => { v.mystery = true; });
  }

  const queue = buildQueue(order, cfg.open, cfg.stick, rng);
  return { vehicles: all, garages, tracks, queue };
}

function buildQueue(order, open, stick, rng) {
  const rem = order.map((v) => v.cap);
  const active = [];
  let next = 0, cur = -1;
  const q = [];
  while (active.length < open && next < order.length) active.push(next++);
  while (active.length) {
    if (!active.includes(cur) || rng() > stick) cur = active[(rng() * active.length) | 0];
    q.push(order[cur].color);
    rem[cur]--;
    if (rem[cur] === 0) {
      active.splice(active.indexOf(cur), 1);
      if (next < order.length) active.push(next++);
    }
  }
  return q;
}

function generateLevel(cfg) {
  const T = THEMES[cfg.theme];
  let best = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const rng = mulberry32(cfg.L * 104729 + attempt * 7907 + 17);
    const res = tryGenerate(cfg, T, rng);
    if (res && (!best || res.vehicles.length > best.vehicles.length)) best = res;
    if (res && res.vehicles.length >= cfg.n * 0.85) break;
  }
  return best;
}

/* ----------------------------------------------------------------- audio */
const Snd = {
  ctx: null, master: null, nb: null,
  // iOS only allows audio to start from a completed tap, and mutes web audio when the
  // silent switch is on unless the page asks for "playback" audio.
  unlock() {
    if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ } }
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (!this.kicked) {
      // a one-sample silent sound wakes the audio output up on iOS
      const src = this.ctx.createBufferSource();
      src.buffer = this.ctx.createBuffer(1, 1, 22050);
      src.connect(this.ctx.destination);
      src.start(0);
      this.kicked = true;
    }
    if (!navigator.audioSession && save.sound) {
      // older iOS: a silent looping <audio> puts the page in playback mode
      if (!this.el) {
        this.el = new Audio(silentWav());
        this.el.loop = true;
        this.el.setAttribute('playsinline', '');
      }
      if (this.el.paused) this.el.play().catch(() => {});
    }
  },
  sleep() {
    if (this.el && !this.el.paused) this.el.pause();
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  },
  ok() { return save.sound && this.ctx && this.ctx.state === 'running'; },
  tone(f, d, type = 'sine', v = 0.2, f2 = null, delay = 0) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + d + 0.03);
  },
  noise(d, v, delay = 0, f1 = 800, f2 = 3000) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime + delay;
    if (!this.nb) {
      this.nb = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const ch = this.nb.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource(); src.buffer = this.nb;
    const f = c.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + d); f.Q.value = 1.1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + d * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + d + 0.05);
  },
};
function silentWav() {
  const n = 4000, bytes = new Uint8Array(44 + n);
  const dv = new DataView(bytes.buffer);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) bytes[o + i] = t.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  str(36, 'data'); dv.setUint32(40, n, true);
  bytes.fill(128, 44);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return 'data:audio/wav;base64,' + btoa(bin);
}
const semi = (base, s) => base * Math.pow(2, s / 12);
const sfx = {
  go() {
    const k = G && G.T.key;
    if (k === 'boat') Snd.noise(0.35, 0.12, 0, 300, 900);
    else if (k === 'plane') Snd.noise(0.4, 0.1, 0, 600, 2400);
    else if (k === 'train') { [0, 0.12, 0.24].forEach((d) => Snd.noise(0.09, 0.1, d, 400, 700)); }
    else if (k === 'space') Snd.tone(220, 0.35, 'sine', 0.08, 880);
    else Snd.tone(150, 0.3, 'sawtooth', 0.05, 300);
  },
  pop(n) { Snd.tone(semi(520, n * 1.5), 0.08, 'sine', 0.16, semi(700, n * 1.5)); },
  full() { [0, 4, 7].forEach((s, i) => Snd.tone(semi(523, s), 0.12, 'triangle', 0.12, null, i * 0.06)); },
  depart() {
    const k = G && G.T.key;
    if (k === 'plane') Snd.noise(1.6, 0.13, 0.3, 250, 3200);
    else if (k === 'space') { Snd.noise(1.2, 0.12, 0, 150, 2500); Snd.tone(110, 0.9, 'sawtooth', 0.04, 440); }
    else if (k === 'train') { Snd.tone(311, 0.3, 'sawtooth', 0.05); Snd.tone(392, 0.3, 'sawtooth', 0.04); Snd.tone(311, 0.4, 'sawtooth', 0.05, null, 0.35); Snd.tone(392, 0.4, 'sawtooth', 0.04, null, 0.35); }
    else if (k === 'boat') { Snd.tone(147, 0.45, 'sawtooth', 0.06); Snd.tone(110, 0.45, 'sawtooth', 0.05); }
    else Snd.tone(110, 0.4, 'sawtooth', 0.05, 220);
  },
  honk() {
    const k = G && G.T.key;
    if (k === 'boat') { Snd.tone(130, 0.35, 'sawtooth', 0.08); Snd.tone(196, 0.35, 'sawtooth', 0.05); }
    else if (k === 'plane') { Snd.tone(880, 0.09, 'square', 0.05); Snd.tone(880, 0.09, 'square', 0.05, null, 0.12); }
    else if (k === 'train') { Snd.tone(330, 0.22, 'sawtooth', 0.06); Snd.tone(415, 0.22, 'sawtooth', 0.05); }
    else if (k === 'space') Snd.tone(660, 0.2, 'square', 0.05, 220);
    else { Snd.tone(370, 0.17, 'square', 0.06); Snd.tone(466, 0.17, 'square', 0.05); }
  },
  boom() {
    Snd.noise(1.4, 0.4, 0, 1400, 60);
    Snd.tone(110, 0.9, 'sawtooth', 0.12, 30);
    Snd.tone(70, 1.2, 'sine', 0.3, 25);
  },
  nope() { Snd.tone(220, 0.14, 'triangle', 0.15, 140); },
  coin() { Snd.tone(988, 0.05, 'square', 0.04); Snd.tone(1319, 0.12, 'square', 0.04, null, 0.05); },
  reveal() { Snd.tone(880, 0.1, 'sine', 0.1, 1320); Snd.tone(1320, 0.14, 'sine', 0.08, 1760, 0.06); },
  unlock() { Snd.tone(660, 0.08, 'square', 0.05); Snd.tone(990, 0.12, 'square', 0.05, null, 0.07); },
  lift() { Snd.tone(220, 0.6, 'sawtooth', 0.035, 520); Snd.noise(0.6, 0.06, 0, 200, 600); },
  sort() { [0, 3, 7, 10, 14].forEach((s, i) => Snd.tone(semi(660, s), 0.08, 'sine', 0.08, null, i * 0.04)); },
  win() { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => Snd.tone(semi(523, s), 0.2, 'triangle', 0.13, null, i * 0.08)); },
  lose() { [7, 4, 0, -5].forEach((s, i) => Snd.tone(semi(392, s), 0.25, 'triangle', 0.14, null, i * 0.15)); },
  party() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => Snd.tone(semi(523, s), 0.1, 'square', 0.05, null, i * 0.06)); },
  bay() { Snd.tone(392, 0.1, 'triangle', 0.12); Snd.tone(587, 0.16, 'triangle', 0.12, null, 0.09); },
};
const BASS = [0, 0, 12, 0, 3, 3, 15, 3, 5, 5, 17, 5, 7, 7, 19, 10];
function partyBeat(k) {
  if (k % 4 === 0) Snd.tone(150, 0.16, 'sine', 0.22, 45);
  if (k % 2 === 1) Snd.noise(0.05, 0.05, 0, 6000, 9000);
  Snd.tone(semi(110, BASS[k % 16]), 0.17, 'triangle', 0.08);
  if (k % 8 === 6) Snd.tone(semi(880, BASS[k % 16] % 12), 0.1, 'square', 0.025);
}
function buzz(p) { if (save.vib && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } }

/* ------------------------------------------------------------ game state */
let G = null;
let bgDirty = true;
const bgCanvas = document.createElement('canvas');
const bgCtx = bgCanvas.getContext('2d');

function newPassenger(c) {
  return { c, x: 0, y: 0, skin: pick(SKIN), hair: pick(HAIR), walk: Math.random() * 6, moving: false };
}

function startLevel(n) {
  const cfg = levelConfig(n);
  const T = THEMES[cfg.theme];
  const gen = generateLevel(cfg);
  let id = 0;
  for (const v of gen.vehicles) {
    Object.assign(v, {
      id: id++, state: v.garage != null ? 'garage' : 'lot', filled: 0, incoming: 0, wobble: 0, revealT: 0, unlockT: 0,
      revealed: !v.mystery, lock: v.lock || 0, bay: -1, path: null, pi: 0, speed: 0, maxSpeed: 520, tang: v.ang, fly: 0,
      pulse: 0, parkT: 0, appearT: v.garage != null ? 1 : -0.15 - Math.random() * 0.35,
    });
  }
  const garages = gen.garages.map((g, i) => ({
    x: g.x, y: g.y, ang: g.ang, len: g.len, wid: g.wid, queue: g.queue, wobble: 0, doorT: 0, cool: 0.5 + i * 0.3,
  }));
  const asteroids = [];
  for (let i = 0; i < cfg.asteroids; i++) {
    const r = rand(11, 16), a = rand(0, TAU), sp = rand(20, 32);
    const shape = [];
    for (let k = 0; k < 9; k++) shape.push(rand(0.78, 1.08));
    asteroids.push({
      x: rand(LOT.x + r, LOT.x + LOT.w - r), y: rand(LOT.y + r, LOT.y + LOT.h - r), r, len: r * 2, wid: r * 2, ang: 0,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, TAU), vr: rand(-0.8, 0.8), wobble: 0, shape, active: true, wait: 0,
    });
  }
  G = {
    level: n, cfg, T,
    vehicles: gen.vehicles, garages, asteroids, tracks: gen.tracks, wrecks: [], flash: 0,
    lines: [[], []], nextLine: 0,
    pods: new Array(cfg.pods).fill(null), rot: 0, refillT: 0,
    walkers: [], parts: [], floats: [],
    bays: new Array(cfg.bays).fill(null),
    crashes: 0, departed: 0, earned: 0, taps: 0,
    state: 'play', paused: false,
    boardT: 0.4, loseT: 0, endT: 0,
    fever: 0, partyT: 0, beatT: 0, beatK: 0, lastDepart: -99,
    time: 0, shake: 0, liftMode: false,
    tutorial: n === 1 && !save.seen.tut, hint: null, hintT: 0,
  };
  computeLayout();
  // the holding circle starts full; everyone else is split between the two feeder lines in turn
  const everyone = gen.queue.map(newPassenger);
  for (let i = 0; i < G.pods.length && everyone.length; i++) {
    const p = everyone.shift();
    [p.x, p.y] = podPos(i);
    G.pods[i] = p;
  }
  everyone.forEach((p, i) => G.lines[i % 2].push(p));
  G.lines.forEach((line, li) => line.forEach((p, i) => { [p.x, p.y] = feeders[li].slots[Math.min(i, feeders[li].slots.length - 1)]; }));
  lotChanged(true);
  bgDirty = true;
  hideMenu();
  hideModal();
  refreshHUD();
  showIntros();
}

function showIntros() {
  const cfg = G.cfg, T = G.T;
  const pages = [];
  if (!save.seen.intro) {
    save.seen.intro = 1;
    pages.push({
      emoji: '🎉', title: "Lottie's Bus Party!",
      html: `<p>Everyone's off to the party — get them there!</p>
        <div class="tip">👆 <b>Tap</b> a vehicle to drive it out. It only moves if <b>nothing is in its way</b>.</div>
        <div class="tip">🔄 Passengers walk round the <b>holding circle</b> and hop onto vehicles of <b>their colour</b>. Full vehicles zoom off!</div>
        <div class="tip">👀 Two lines feed in through the side gaps: look at them to see which colours are coming next. People leave through the gap at the bottom.</div>
        <div class="tip">🅿️ Don't fill every bay with the <b>wrong colours</b> or it's a jam!</div>`,
    });
  }
  const wkey = 'w_' + cfg.theme + '_' + Math.min(cfg.cycle, 1);
  if (!save.seen[wkey] && cfg.stage === 0 && !(cfg.theme === 'bus' && cfg.cycle === 0)) {
    save.seen[wkey] = 1;
    if (cfg.cycle === 0 && cfg.theme === 'boat') {
      pages.push({
        emoji: '⛵', title: 'Sunny Harbour',
        html: `<p>Boats sail round the jetty to their berths, and passengers wait on the pier.</p>
          <div class="tip">🎁 <b>NEW: Mystery boats!</b> Grey boats hide their colour under a tarp until they have a clear way out.</div>`,
      });
    } else if (cfg.cycle === 0 && cfg.theme === 'plane') {
      pages.push({
        emoji: '✈️', title: 'Sky Airport',
        html: `<p>Planes taxi round the airport to the gates, then take off when they're full!</p>
          <div class="tip">⛽ <b>NEW: Refuelling planes!</b> They're locked until that many other planes have taken off.</div>`,
      });
    } else if (cfg.cycle === 0 && cfg.theme === 'train') {
      pages.push({
        emoji: '🚂', title: 'Rail Yard',
        html: `<p>Trains wait nose-to-tail on long sidings. Only a train with <b>nothing in front of it</b> can pull out to the platforms.</p>
          <div class="tip">🧠 Think ahead: the train you need might be stuck at the back of a siding!</div>
          <div class="tip">💥 Keep tapping a blocked train and it will <b>crash</b>. Both trains are wrecked, their passengers go home and you can only get 1 star!</div>`,
      });
    } else if (cfg.cycle === 0 && cfg.theme === 'space') {
      pages.push({
        emoji: '🚀', title: 'Star Port',
        html: `<p>The toughest world! Rockets blast off from just <b>4 docking ports</b>.</p>
          <div class="tip">☄️ <b>Asteroids</b> drift across the launch field. Wait for a gap before you launch!</div>
          <div class="tip">🔋 Charging rockets and 🎁 mystery rockets are back too.</div>`,
      });
    } else {
      pages.push({
        emoji: T.emoji, title: `${T.world} — Remix!`,
        html: `<p>Welcome back! This time <b>mystery</b> 🎁, <b>locked</b> ${T.lockIcon} and <b>${T.garage}</b> 🏠 ${T.plural} are everywhere. Good luck!</p>`,
      });
    }
  }
  if (cfg.spaghetti && !save.seen.spag) {
    save.seen.spag = 1;
    pages.push({
      emoji: '🍝', title: 'Spaghetti Junction!',
      html: `<p>The tracks criss-cross everywhere now. A train sitting on a <b>crossing</b> blocks the other line too.</p>
        <div class="tip">🔍 Follow each line carefully before you tap. Remember what happens to trains that are tapped when blocked! 💥</div>`,
    });
  }
  if (cfg.garages && !save.seen.garage) {
    save.seen.garage = 1;
    pages.push({
      emoji: '🏠', title: `NEW: ${T.garage[0].toUpperCase() + T.garage.slice(1)}s!`,
      html: `<p>More ${T.plural} wait inside. They drive out <b>one at a time</b>, only when the spot in front of the door is clear.</p>
        <div class="tip">🔢 The badge shows how many are inside, and the dot shows the colour coming out next.</div>`,
    });
  }
  if (cfg.party && !save.seen.partyLvl) {
    save.seen.partyLvl = 1;
    pages.push({
      emoji: '🥳', title: 'Party Level!',
      html: `<p>Look for the <b>golden Party ${T.noun}</b> with the rainbow stripes.</p>
        <div class="tip">🌈 Fill it up to start an instant <b>PARTY</b> — double coins and super-speedy passengers!</div>`,
    });
  }
  if (!pages.length) return;
  persist();
  G.paused = true;
  const next = () => {
    const p = pages.shift();
    if (!p) { G.paused = false; return; }
    showModal(`<div class="m-emoji">${p.emoji}</div><h2>${p.title}</h2>${p.html}`,
      [{ id: 'ok', label: pages.length ? 'Next ▶' : "Let's go! 🚀", fn: next }]);
  };
  next();
}

/* --------------------------------------------------------------- actions */
function respawnAsteroid(a) {
  // enter from a random edge, heading somewhere across the field
  const side = (Math.random() * 4) | 0, m = a.r + 2;
  if (side === 0) { a.x = rand(LOT.x, LOT.x + LOT.w); a.y = LOT.y - m; }
  else if (side === 1) { a.x = LOT.x + LOT.w + m; a.y = rand(LOT.y, LOT.y + LOT.h); }
  else if (side === 2) { a.x = rand(LOT.x, LOT.x + LOT.w); a.y = LOT.y + LOT.h + m; }
  else { a.x = LOT.x - m; a.y = rand(LOT.y, LOT.y + LOT.h); }
  const tx = LOT.x + LOT.w / 2 + rand(-110, 110), ty = LOT.y + LOT.h / 2 + rand(-120, 120);
  const d = Math.hypot(tx - a.x, ty - a.y) || 1, sp = rand(20, 32);
  a.vx = (tx - a.x) / d * sp; a.vy = (ty - a.y) / d * sp;
  a.active = true;
}

function obstaclesFor(v, withRocks) {
  const list = G.vehicles.filter((u) => u !== v && (u.state === 'lot' || u.state === 'bump' || u.state === 'emerging'));
  return withRocks ? list.concat(G.garages, G.wrecks, G.asteroids.filter((a) => a.active)) : list.concat(G.garages, G.wrecks);
}
function getBlockers(v, withRocks = true) {
  const sw = sweepBox(homeBox(v));
  return obstaclesFor(v, withRocks).filter((u) => overlap(sw, homeBox(u)));
}

function lotChanged(silent) {
  for (const v of G.vehicles) {
    if (v.state === 'lot' && !v.revealed && getBlockers(v, false).length === 0) {
      v.revealed = true;
      if (!silent) {
        v.revealT = 0.5;
        sfx.reveal();
        sparkles(v.x, v.y, PAL[v.color].main, 12);
      }
    }
  }
  G.hintT = 0;
}

function toWorld(cx, cy) { return [(cx - view.ox) / view.scale, (cy - view.oy) / view.scale]; }

function handleTap(x, y) {
  let hit = null, bd = 1e9;
  for (const v of G.vehicles) {
    if (v.state !== 'lot') continue;
    if (pointInBox(x, y, boxOf(v, 6))) {
      const d = Math.hypot(x - v.x, y - v.y);
      if (d < bd) { bd = d; hit = v; }
    }
  }
  if (!hit) return;
  G.taps++;
  const free = freeBay(hit);
  if (G.liftMode) {
    if (free < 0) { toast('No free bay!'); sfx.nope(); return; }
    liftVehicle(hit, free);
    return;
  }
  if (hit.lock > 0) {
    hit.wobble = 1; sfx.nope(); buzz(15);
    toast(`${G.T.lockIcon} ${G.T.lockName}! ${hit.lock} more to go`);
    return;
  }
  const blockers = getBlockers(hit);
  if (blockers.length) {
    if (G.T.key === 'train') {
      hit.wrong = (hit.wrong || 0) + 1;
      const first = firstHit(hit, blockers);
      if (hit.wrong >= 3 && first.u.cap) { startRunaway(hit, first.u, first.d); return; }
      startBump(hit, blockers);
      if (hit.wrong === 2) toast('⚠️ Careful! Tap it again and it will crash!', 1.8);
      return;
    }
    startBump(hit, blockers);
    return;
  }
  if (free < 0) { hit.wobble = 1; sfx.nope(); toast('All bays are full!'); return; }
  sendToBay(hit, free);
}

function freeBay(v) {
  let best = -1, bd = 1e9;
  for (let i = 0; i < G.bays.length; i++) {
    if (G.bays[i]) continue;
    const d = Math.abs(bayPos(i)[0] - v.x);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function sendToBay(v, i) {
  G.bays[i] = v;
  v.bay = i; v.state = 'moving'; v.lift = false;
  v.path = ringPath(v, i); v.pi = 0; v.speed = 150; v.maxSpeed = 540; v.tang = v.ang;
  v.revealed = true;
  if (G.tutorial && G.taps >= 3) { G.tutorial = false; save.seen.tut = 1; persist(); }
  sfx.go(); buzz(8);
  lotChanged();
}

function liftVehicle(v, i) {
  G.liftMode = false;
  pay('lift');
  G.bays[i] = v;
  v.bay = i; v.state = 'moving'; v.lift = true; v.lock = 0; v.revealed = true;
  v.path = [[bayPos(i)[0], bayY(v)]]; v.pi = 0; v.speed = 60; v.maxSpeed = 360; v.tang = v.ang;
  sfx.lift();
  sparkles(v.x, v.y, '#ffffff', 14);
  lotChanged();
  refreshHUD();
}

// how far v can roll forward before touching the first thing in its way, and what that is
function firstHit(v, blockers) {
  const c = Math.cos(v.ang), s = Math.sin(v.ang);
  const boxes = blockers.map(homeBox);
  for (let d = 0; d < 1000; d += 2) {
    const b = { cx: v.x + c * (d + 2), cy: v.y + s * (d + 2), ang: v.ang, hl: v.len / 2, hw: v.wid / 2 - 1.5 };
    for (let k = 0; k < boxes.length; k++) if (overlap(b, boxes[k])) return { u: blockers[k], d };
  }
  return { u: blockers[0], d: 0 };
}

function startBump(v, blockers) {
  const { u: hit, d } = firstHit(v, blockers);
  v.state = 'bump';
  v.bump = { ox: v.x, oy: v.y, s: d, t: 0, d1: Math.max(0.06, d / 650), hit, hitDone: false };
  G.crashes++;
}

function startRunaway(v, target, d) {
  v.state = 'runaway';
  v.run = { ox: v.x, oy: v.y, d, t: 0, T: Math.max(0.35, Math.sqrt(2 * d / 700)), target };
  target.wobble = 1;
  sfx.honk(); buzz(40);
}

// Remove up to n waiting passengers of a colour, from the back of the lines first, then the circle.
function dropPassengers(color, n) {
  let gone = 0;
  for (let i = Math.max(G.lines[0].length, G.lines[1].length) - 1; i >= 0 && gone < n; i--) {
    for (const line of G.lines) {
      if (gone < n && i < line.length && line[i].c === color) {
        const p = line.splice(i, 1)[0];
        G.parts.push({ type: 'puff', x: p.x, y: p.y, vx: 0, vy: -20, life: 0.5, max: 0.5, size: 4, grow: 6, color: 'rgba(255,255,255,0.8)' });
        gone++;
      }
    }
  }
  for (let i = 0; i < G.pods.length && gone < n; i++) {
    const p = G.pods[i];
    if (p && p.c === color && !p.leaving) {
      G.pods[i] = null;
      G.parts.push({ type: 'puff', x: p.x, y: p.y, vx: 0, vy: -20, life: 0.5, max: 0.5, size: 4, grow: 6, color: 'rgba(255,255,255,0.8)' });
      gone++;
    }
  }
  return gone;
}

function explode(v, u) {
  const cx = v.x + Math.cos(v.ang) * v.len / 2, cy = v.y + Math.sin(v.ang) * v.len / 2;
  v.state = 'gone'; u.state = 'gone';
  // fireball, smoke, sparks and flying bits of train
  for (let i = 0; i < 28; i++) {
    const a = rand(0, TAU), sp = rand(30, 150);
    G.parts.push({ type: 'puff', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.5, 1), max: 1, size: rand(7, 15), grow: 26, color: pick(['rgba(255,243,160,0.95)', 'rgba(255,210,63,0.95)', 'rgba(255,140,66,0.9)', 'rgba(255,77,109,0.85)']) });
  }
  for (let i = 0; i < 16; i++) {
    G.parts.push({ type: 'puff', x: cx + rand(-14, 14), y: cy + rand(-14, 14), vx: rand(-20, 20), vy: rand(-45, -15), life: rand(1.2, 2), max: 2, size: rand(8, 13), grow: 34, color: 'rgba(60,50,70,0.5)' });
  }
  for (let i = 0; i < 34; i++) {
    const a = rand(0, TAU), sp = rand(120, 300);
    G.parts.push({ type: 'spark', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), max: 0.9, size: rand(1.5, 3), color: pick(['#fff3a0', '#ffd23f', '#ffffff']) });
  }
  for (const w of [v, u]) {
    for (let i = 0; i < 6; i++) {
      const a = rand(0, TAU), sp = rand(80, 200);
      G.parts.push({ type: 'star', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9, max: 0.9, size: rand(3, 5), color: w.color === PARTY ? pick(RAINBOW) : PAL[w.color].main, rot: rand(0, TAU), vr: rand(-12, 12) });
    }
  }
  G.parts.push({ type: 'ring', x: cx, y: cy, vx: 0, vy: 0, life: 0.45, max: 0.45, size: 20, color: 'rgba(255,220,120,0.9)' });
  G.flash = 0.25; G.shake = 0.7;
  sfx.boom(); buzz([80, 40, 120]);
  // a burning wreck blocks the siding for a while
  G.wrecks.push({ x: cx, y: cy, ang: v.ang, len: 40, wid: 24, t: 10, max: 10 });
  // the passengers who would have ridden these trains go home in a huff
  const gone = dropPassengers(v.color, v.cap) + dropPassengers(u.color, u.cap);
  G.crashes += 3;
  const loss = Math.min(save.coins, 10);
  save.coins -= loss; persist();
  G.floats.push({ x: cx, y: cy - 20, text: '💥 KABOOM!', life: 1.4, max: 1.4, color: '#ffe14d', size: 22 });
  toast(`💥 CRASH! ${gone} passengers went home`, 2.2, true);
  lotChanged();
  refreshHUD();
}

function onCrash(v, b) {
  b.hit.wobble = 1; v.wobble = 0.6;
  const cx = v.x + Math.cos(v.ang) * (b.s + v.len / 2), cy = v.y + Math.sin(v.ang) * (b.s + v.len / 2);
  for (let i = 0; i < 7; i++) {
    const a = rand(0, TAU), sp = rand(60, 160);
    G.parts.push({ type: 'star', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, max: 0.55, size: rand(4, 7), color: '#ffe14d', rot: rand(0, TAU), vr: rand(-8, 8) });
  }
  G.floats.push({ x: cx, y: cy - 8, text: pick(['Honk!', 'Beep!', 'Oops!', 'Bonk!']), life: 0.8, max: 0.8, color: '#ffffff', size: 13 });
  sfx.honk(); buzz(30);
  G.shake = 0.22;
}

// Round off each corner of a path with a short curve so vehicles follow the curved track.
function smoothCorners(pts, r) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1];
    const d1 = Math.hypot(cx - px, cy - py), d2 = Math.hypot(nx - cx, ny - cy);
    const r1 = Math.min(r, d1 / 2), r2 = Math.min(r, d2 / 2);
    if (r1 < 1 || r2 < 1) { out.push(pts[i]); continue; }
    const ax = cx - (cx - px) / d1 * r1, ay = cy - (cy - py) / d1 * r1;
    const bx = cx + (nx - cx) / d2 * r2, by = cy + (ny - cy) / d2 * r2;
    for (let k = 0; k <= 5; k++) {
      const t = k / 5, u = 1 - t;
      out.push([u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by, pts[i][2]]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function ringPath(v, i) {
  const R = RING;
  const dx = Math.cos(v.ang), dy = Math.sin(v.ang);
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (R.x + R.w - v.x) / dx);
  if (dx < -1e-6) t = Math.min(t, (R.x - v.x) / dx);
  if (dy > 1e-6) t = Math.min(t, (R.y + R.h - v.y) / dy);
  if (dy < -1e-6) t = Math.min(t, (R.y - v.y) / dy);
  const E = [v.x + dx * t, v.y + dy * t];
  // snap onto the ring edge
  const near = [Math.abs(E[1] - R.y), Math.abs(E[0] - (R.x + R.w)), Math.abs(E[1] - (R.y + R.h)), Math.abs(E[0] - R.x)];
  const edge = near.indexOf(Math.min(...near));
  if (edge === 0) E[1] = R.y; else if (edge === 1) E[0] = R.x + R.w; else if (edge === 2) E[1] = R.y + R.h; else E[0] = R.x;
  const bx = bayPos(i)[0], by = bayY(v);
  const Tp = [bx, R.y];
  const P = 2 * (R.w + R.h);
  const perimS = ([x, y], e) => {
    if (e === 0) return x - R.x;
    if (e === 1) return R.w + (y - R.y);
    if (e === 2) return R.w + R.h + (R.x + R.w - x);
    return 2 * R.w + R.h + (R.y + R.h - y);
  };
  const sE = perimS(E, edge), sT = perimS(Tp, 0);
  const cw = (sT - sE + P) % P, ccw = (sE - sT + P) % P;
  const corners = [[0, [R.x, R.y]], [R.w, [R.x + R.w, R.y]], [R.w + R.h, [R.x + R.w, R.y + R.h]], [2 * R.w + R.h, [R.x, R.y + R.h]]];
  const pts = [E];
  if (cw <= ccw) {
    corners.map(([s, p]) => [(s - sE + P) % P, p]).filter(([d]) => d > 0.5 && d < cw).sort((a, b) => a[0] - b[0]).forEach(([, p]) => pts.push(p));
  } else {
    corners.map(([s, p]) => [(sE - s + P) % P, p]).filter(([d]) => d > 0.5 && d < ccw).sort((a, b) => a[0] - b[0]).forEach(([, p]) => pts.push(p));
  }
  pts.push(Tp, [bx, by]);
  v.pathBx = bx;
  return smoothCorners([[v.x, v.y]].concat(pts), 14).slice(1);
}

function depart(v) {
  G.bays[v.bay] = null;
  v.state = 'leaving'; v.speed = 40; v.pi = 0;
  const [bx] = bayPos(v.bay);
  if (G.T.depart === 'up') { v.path = [[bx, view.y0 - 200]]; v.maxSpeed = 620; }
  else if (G.T.depart === 'runway') {
    // push back, taxi round to the runway along the bottom, then take off
    const left = bx < LW / 2;
    const cx = left ? RING.x : RING.x + RING.w, ry = RING.y + RING.h, dir = left ? 1 : -1;
    v.path = [[bx, RING.y, 1], [cx, RING.y], [cx, ry], [cx + dir * 320, ry], [cx + dir * 760, ry - 300]];
    v.runway = { x0: cx };
    v.maxSpeed = 230;
  } else if (G.T.key === 'train') {
    // back out of the platform, round the curve and away down the line into the tunnel
    const ex = bx >= LW / 2 ? view.x1 + 140 : view.x0 - 140;
    v.path = smoothCorners([[bx, BAY_CY, 1], [bx, RING.y, 1], [ex, RING.y, 1]], 14).slice(1);
    v.maxSpeed = 420;
  } else {
    const ex = bx >= LW / 2 ? view.x1 + 90 : view.x0 - 90;
    v.path = [[bx, RING.y, 1], [ex, RING.y]];
    v.maxSpeed = 560;
  }
  G.departed++;
  const partying = G.partyT > 0;
  let coins = partying ? 2 : 1;
  if (v.color === PARTY) coins += 15;
  addCoins(coins, v.x, v.y - 20);
  for (const u of G.vehicles) {
    if (u.lock > 0 && (u.state === 'lot' || u.state === 'bump')) {
      u.lock--;
      if (u.lock === 0) { u.unlockT = 0.5; sfx.unlock(); sparkles(u.x, u.y, '#ffd23f', 10); }
    }
  }
  if (!partying) {
    G.fever += (G.time - G.lastDepart < 6) ? 26 : 15;
    if (v.color === PARTY) G.fever = 100;
    if (G.fever >= 100) startParty();
  } else {
    G.partyT = Math.min(G.partyT + 0.8, 9);
  }
  G.lastDepart = G.time;
  sfx.depart();
}

function startParty() {
  G.partyT = 7; G.fever = 100; G.beatT = 0; G.beatK = 0;
  toast('🎉 PARTY TIME! 🎉', 1.8, true);
  sfx.party(); buzz([20, 40, 20]);
  for (let i = 0; i < 60; i++) confetti(rand(0, LW), rand(view.y0, 0), true);
}

function addCoins(n, x, y) {
  save.coins += n; G.earned += n;
  G.floats.push({ x, y, text: `+${n} 🪙`, life: 1, max: 1, color: '#fff36b', size: n > 5 ? 18 : 14 });
  sfx.coin();
  const pill = $('coins'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
  $('coinTxt').textContent = save.coins;
}

function tryBoard() {
  const open = G.bays.filter((v) => v && v.state === 'bay' && v.filled + v.incoming < v.cap)
    .sort((a, b) => (b.filled + b.incoming) - (a.filled + a.incoming));
  for (const v of open) {
    // whoever of that colour will reach the exit gap first
    let bi = -1, bd = 1e9;
    G.pods.forEach((p, i) => {
      if (p && !p.entering && !p.leaving && p.c === v.color) {
        const d = (ring.exitS - podS(i) + ring.P) % ring.P;
        if (d < bd) { bd = d; bi = i; }
      }
    });
    if (bi >= 0) {
      G.pods[bi].leaving = v;
      v.incoming++;
      G.boardT = G.partyT > 0 ? 0.04 : 0.08;
      return;
    }
  }
}

function waitingCount() { return G.lines[0].length + G.lines[1].length; }

// The two feeder lines take turns sending their front person into the nearest gap in the circle.
function refill() {
  let li = G.nextLine;
  if (!G.lines[li].length) li = 1 - li;
  if (!G.lines[li].length) return;
  // the empty spot that is next to arrive at this side's entrance
  let bi = -1, bd = 1e9;
  for (let i = 0; i < G.pods.length; i++) {
    if (G.pods[i]) continue;
    const d = (ring.gateS[li] - podS(i) + ring.P) % ring.P;
    if (d < bd) { bd = d; bi = i; }
  }
  if (bi < 0) return;
  const p = G.lines[li].shift();
  p.entering = true;
  p.via = [gateOut(li)];
  G.pods[bi] = p;
  G.nextLine = 1 - li;
  G.refillT = G.partyT > 0 ? 0.04 : 0.07;
}

/* --------------------------------------------------------------- boosters */
function pay(kind) {
  if (save.boost[kind] > 0) save.boost[kind]--;
  else save.coins -= PRICE[kind];
  persist();
  refreshHUD();
}
function canAfford(kind) { return save.boost[kind] > 0 || save.coins >= PRICE[kind]; }

function useBooster(kind) {
  Snd.unlock();
  if (!G || G.state !== 'play' || G.paused) return;
  if (kind === 'lift' && G.liftMode) { G.liftMode = false; refreshHUD(); return; }
  if (!canAfford(kind)) { toast(`Need ${PRICE[kind]} 🪙`); sfx.nope(); return; }
  if (kind === 'bay') {
    if (G.bays.length >= MAX_BAYS) { toast('Max bays reached!'); sfx.nope(); return; }
    G.bays.push(null);
    pay('bay'); sfx.bay();
    const [bx, by] = bayPos(G.bays.length - 1);
    sparkles(bx, by, '#ffffff', 14);
    toast('🅿️ Extra bay!');
  } else if (kind === 'sort') {
    if (waitingCount() < 3) { toast('Nobody waiting in line!'); return; }
    // prefer colours already waiting in a bay, then order of appearance
    const order = [];
    for (const v of G.bays) if (v && v.filled + v.incoming < v.cap && !order.includes(v.color)) order.push(v.color);
    G.lines.forEach((line, li) => {
      const n = Math.min(12, line.length);
      const head = line.slice(0, n);
      head.forEach((p) => { if (!order.includes(p.c)) order.push(p.c); });
      head.sort((a, b) => order.indexOf(a.c) - order.indexOf(b.c));
      line.splice(0, n, ...head);
      head.forEach((p, i) => { const sl = feeders[li].slots[Math.min(i, feeders[li].slots.length - 1)]; p.x = sl[0]; p.y = sl[1]; sparkles(p.x, p.y, '#ffffff', 1); });
    });
    pay('sort'); sfx.sort();
    toast('✨ Line sorted!');
  } else if (kind === 'lift') {
    if (!G.bays.some((b) => !b)) { toast('No free bay to lift into!'); sfx.nope(); return; }
    G.liftMode = true;
    toast(`${G.T.lift[0]} Tap any ${G.T.noun}!`);
  }
  refreshHUD();
}

/* ----------------------------------------------------------------- update */
function followPath(v, dt) {
  let d = v.speed * dt;
  while (d > 0 && v.pi < v.path.length) {
    const p = v.path[v.pi];
    const dx = p[0] - v.x, dy = p[1] - v.y, dist = Math.hypot(dx, dy);
    if (dist > 0.01) v.tang = p[2] ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
    if (dist <= d) { v.x = p[0]; v.y = p[1]; d -= dist; v.pi++; }
    else { v.x += dx / dist * d; v.y += dy / dist * d; d = 0; }
  }
  v.ang += angDiff(v.ang, v.tang) * Math.min(1, dt * (v.lift ? 5 : 11));
  return v.pi >= v.path.length;
}

function updateVehicle(v, dt) {
  if (v.wobble > 0) v.wobble = Math.max(0, v.wobble - dt * 2.4);
  if (v.pulse > 0) v.pulse = Math.max(0, v.pulse - dt * 5);
  if (v.parkT > 0) v.parkT = Math.max(0, v.parkT - dt);
  if (v.appearT < 1) v.appearT += dt;
  if (v.revealT > 0) v.revealT = Math.max(0, v.revealT - dt);
  if (v.unlockT > 0) v.unlockT = Math.max(0, v.unlockT - dt);
  switch (v.state) {
    case 'bump': {
      const b = v.bump;
      b.t += dt;
      let f;
      if (b.t < b.d1) f = (b.t / b.d1) * (b.t / b.d1);
      else {
        if (!b.hitDone) { b.hitDone = true; onCrash(v, b); }
        f = 1 - easeOut(Math.min(1, (b.t - b.d1) / 0.24));
      }
      v.x = b.ox + Math.cos(v.ang) * b.s * f;
      v.y = b.oy + Math.sin(v.ang) * b.s * f;
      if (b.t >= b.d1 + 0.24) { v.x = b.ox; v.y = b.oy; v.state = 'lot'; v.bump = null; }
      break;
    }
    case 'runaway': {
      const r = v.run;
      r.t += dt;
      const f = Math.min(1, (r.t / r.T) * (r.t / r.T));
      v.x = r.ox + Math.cos(v.ang) * r.d * f; v.y = r.oy + Math.sin(v.ang) * r.d * f;
      if (Math.random() < dt * 30) G.parts.push({ type: 'puff', x: v.x, y: v.y, vx: rand(-10, 10), vy: rand(-25, -10), life: 0.6, max: 0.6, size: 3, grow: 8, color: 'rgba(80,80,90,0.5)' });
      if (f >= 1) {
        if (r.target.state === 'lot' || r.target.state === 'bump') explode(v, r.target);
        else { v.state = 'lot'; v.run = null; lotChanged(); } // its target drove off: it just rolls to a stop
      }
      break;
    }
    case 'emerging': {
      v.emT += dt;
      const t = easeOut(Math.min(1, v.emT / 0.6));
      v.x = v.sx + (v.tx - v.sx) * t; v.y = v.sy + (v.ty - v.sy) * t;
      if (v.emT >= 0.6) { v.x = v.tx; v.y = v.ty; v.state = 'lot'; v.parkT = 0.3; lotChanged(); }
      break;
    }
    case 'moving': {
      v.speed = Math.min(v.maxSpeed, v.speed + dt * 1500);
      const n = v.path.length;
      const bx = bayPos(v.bay)[0], by = bayY(v);
      if (v.lift) v.path[n - 1] = [bx, by];
      else if (v.pathBx !== bx) {
        // the bays moved (extra bay): slide the end of the route across
        const dx = bx - v.pathBx;
        for (let k = Math.max(v.pi, n - 8); k < n; k++) v.path[k] = [v.path[k][0] + dx, v.path[k][1], v.path[k][2]];
        v.pathBx = bx;
      }
      if (v.pi >= n - 1) v.speed = Math.min(v.speed, Math.max(70, Math.hypot(bx - v.x, by - v.y) * 7)); // ease into the bay
      if (followPath(v, dt)) { v.state = 'bay'; v.lift = false; v.parkT = 0.35; }
      trail(v, dt);
      break;
    }
    case 'bay': {
      const bx = bayPos(v.bay)[0], by = bayY(v);
      const k = Math.min(1, dt * 10);
      v.x += (bx - v.x) * k; v.y += (by - v.y) * k;
      v.ang += angDiff(v.ang, -PI / 2) * Math.min(1, dt * 12);
      break;
    }
    case 'full': {
      v.fullT -= dt;
      if (v.fullT <= 0) depart(v);
      break;
    }
    case 'leaving': {
      let acc = 1300;
      if (v.runway) {
        const onRunway = v.pi >= 3;
        v.maxSpeed = onRunway ? 780 : 230;
        acc = onRunway ? 430 : 700;
        if (onRunway) v.fly = clamp((Math.abs(v.x - v.runway.x0) - 120) / 190, 0, 1);
      } else if (G.T.depart === 'up') {
        acc = 520;
        v.fly = clamp((BAY_CY - v.y) / 260, 0, 1);
      }
      v.speed = Math.min(v.maxSpeed, v.speed + dt * acc);
      if (followPath(v, dt)) v.state = 'gone';
      trail(v, dt);
      break;
    }
  }
}

function trail(v, dt) {
  const k = G.T.key;
  const bx = v.x - Math.cos(v.ang) * v.len / 2, by = v.y - Math.sin(v.ang) * v.len / 2;
  if (k === 'boat' && !v.lift) {
    if (Math.random() < dt * 30) G.parts.push({ type: 'puff', x: bx + rand(-2, 2), y: by + rand(-2, 2), vx: 0, vy: 0, life: 0.45, max: 0.45, size: rand(1.5, 2.5), grow: 5, color: 'rgba(255,255,255,0.7)' });
  } else if (k === 'bus' && !v.lift) {
    if (Math.random() < dt * 14) G.parts.push({ type: 'puff', x: bx, y: by, vx: rand(-10, 10), vy: rand(-10, 10), life: 0.5, max: 0.5, size: 2.5, grow: 7, color: 'rgba(90,90,110,0.45)' });
  } else if (k === 'space' && !v.lift) {
    if (Math.random() < dt * 45) G.parts.push({ type: 'puff', x: bx + rand(-2, 2), y: by + rand(-2, 2), vx: -Math.cos(v.ang) * 40, vy: -Math.sin(v.ang) * 40, life: 0.35, max: 0.35, size: rand(2, 3.5), grow: 4, color: pick(['rgba(255,180,70,0.9)', 'rgba(255,240,150,0.9)', 'rgba(255,110,90,0.8)']) });
  } else if (k === 'train' && !v.lift) {
    if (Math.random() < dt * 8) { const fx = v.x + Math.cos(v.ang) * (v.len / 2 - 8), fy = v.y + Math.sin(v.ang) * (v.len / 2 - 8); G.parts.push({ type: 'puff', x: fx, y: fy, vx: rand(-8, 8), vy: rand(-20, -8), life: 0.8, max: 0.8, size: 3, grow: 8, color: 'rgba(255,255,255,0.7)' }); }
  } else if (k === 'plane' && v.state === 'leaving' && v.fly > 0.05) {
    if (Math.random() < dt * 30) G.parts.push({ type: 'puff', x: bx, y: by, vx: 0, vy: 30, life: 0.7, max: 0.7, size: 3, grow: 9, color: 'rgba(255,255,255,0.75)' });
  }
}

function update(dt) {
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);

  if (G.partyT > 0) {
    G.partyT -= dt;
    G.beatT -= dt;
    if (G.beatT <= 0) { G.beatT += 0.2; partyBeat(G.beatK++); }
    if (Math.random() < dt * 25) confetti(rand(view.x0, view.x1), view.y0 - 10, false);
    if (G.partyT <= 0) { G.partyT = 0; G.fever = 0; }
  } else {
    G.fever = Math.max(0, G.fever - dt * 2.2);
  }

  for (const v of G.vehicles) if (v.state !== 'lot' && v.state !== 'gone' && v.state !== 'garage') updateVehicle(v, dt);
  for (const v of G.vehicles) if (v.state === 'lot') updateVehicle(v, dt);

  // garages let their next vehicle out as soon as the spot in front of the door is clear
  for (const g of G.garages) {
    if (g.wobble > 0) g.wobble = Math.max(0, g.wobble - dt * 2.4);
    if (g.doorT > 0) g.doorT = Math.max(0, g.doorT - dt);
    if (g.cool > 0) { g.cool -= dt; continue; }
    const v = g.queue[0];
    if (!v) continue;
    const tb = boxOf(v);
    if (G.vehicles.some((u) => u !== v && (u.state === 'lot' || u.state === 'bump' || u.state === 'emerging') && overlap(tb, homeBox(u)))) continue;
    g.queue.shift();
    const c = Math.cos(g.ang), s = Math.sin(g.ang);
    v.tx = v.x; v.ty = v.y;
    v.sx = g.x + c * (g.len / 2 - v.len / 2); v.sy = g.y + s * (g.len / 2 - v.len / 2);
    v.x = v.sx; v.y = v.sy; v.emT = 0; v.state = 'emerging';
    g.cool = 0.4; g.doorT = 0.8;
    if (G.time > 1) sfx.go();
  }
  // wrecks burn out and get cleared away
  for (let i = G.wrecks.length - 1; i >= 0; i--) {
    const w = G.wrecks[i];
    w.t -= dt;
    if (Math.random() < dt * 10) G.parts.push({ type: 'puff', x: w.x + rand(-8, 8), y: w.y + rand(-6, 6), vx: rand(-6, 6), vy: rand(-30, -15), life: 1.2, max: 1.2, size: 4, grow: 12, color: 'rgba(70,60,80,0.45)' });
    if (w.t <= 0) {
      G.wrecks.splice(i, 1);
      sparkles(w.x, w.y, '#ffffff', 10);
      lotChanged();
    }
  }
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt);
  // asteroids drift across the launch field, out the other side, and come back somewhere new
  for (const a of G.asteroids) {
    if (a.wobble > 0) a.wobble = Math.max(0, a.wobble - dt * 2.4);
    if (!a.active) {
      a.wait -= dt;
      if (a.wait <= 0) respawnAsteroid(a);
      continue;
    }
    a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vr * dt;
    const m = a.r + 4;
    if (a.x < LOT.x - m || a.x > LOT.x + LOT.w + m || a.y < LOT.y - m || a.y > LOT.y + LOT.h + m) {
      a.active = false; a.wait = rand(0.8, 2.5);
    }
  }

  // people walk round the holding circle; newcomers step in from the feeder lines
  const partying = G.partyT > 0;
  const step = dt * (partying ? 110 : 52);
  G.rot = (G.rot + step) % ring.P;
  const esp = 340 * dt;
  for (let i = 0; i < G.pods.length; i++) {
    const p = G.pods[i];
    if (!p) continue;
    const [x, y] = podPos(i);
    p.walk += dt;
    if (p.entering) {
      const [tx, ty] = p.via && p.via.length ? p.via[0] : [x, y];
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d <= esp + 1) {
        p.x = tx; p.y = ty;
        if (p.via && p.via.length) p.via.shift(); else p.entering = false;
      } else { p.x += dx / d * esp; p.y += dy / d * esp; }
    } else {
      p.x = x; p.y = y;
      // reached the exit gap: step out and head down to the vehicle
      const ahead = (ring.exitS - podS(i) + ring.P) % ring.P;
      if (p.leaving && (ahead <= step + 1 || ahead > ring.P - 3)) {
        G.pods[i] = null;
        G.walkers.push({ p, v: p.leaving, stage: 0 });
        p.leaving = null;
      }
    }
  }
  const qsp = (partying ? 440 : 270) * dt;
  G.lines.forEach((line, li) => {
    const slots = feeders[li].slots, last = slots.length - 1;
    for (let i = 0; i < line.length; i++) {
      const p = line[i];
      const s = slots[Math.min(i, last)];
      const dx = s[0] - p.x, dy = s[1] - p.y, d = Math.hypot(dx, dy);
      if (d <= qsp) { p.x = s[0]; p.y = s[1]; p.moving = false; }
      else { p.x += dx / d * qsp; p.y += dy / d * qsp; p.moving = true; p.walk += dt; }
    }
  });
  G.refillT -= dt;
  if (G.refillT <= 0) refill();

  if (G.state === 'play' && !G.paused) {
    G.boardT -= dt;
    if (G.boardT <= 0) tryBoard();
  }

  // walkers hop on
  const wsp = (G.partyT > 0 ? 760 : 430) * dt;
  for (let i = G.walkers.length - 1; i >= 0; i--) {
    const w = G.walkers[i], p = w.p, v = w.v;
    p.walk += dt;
    if (w.stage < 2) {
      // stay on dry land: down the exit path, then along the edge to the right berth
      const [tx, ty] = w.stage === 0 ? ring.exitOut : [v.x, ring.exitOut[1]];
      const ddx = tx - p.x, ddy = ty - p.y, dd = Math.hypot(ddx, ddy);
      if (dd <= wsp) { p.x = tx; p.y = ty; w.stage++; w.sx = p.x; w.sy = p.y; w.D = 0; }
      else { p.x += ddx / dd * wsp; p.y += ddy / dd * wsp; }
      continue;
    }
    const [doorX, doorY] = doorPos(v);
    const dx = doorX - p.x, dy = doorY - p.y, dist = Math.hypot(dx, dy);
    if (dist <= wsp + 3) {
      G.walkers.splice(i, 1);
      v.incoming--; v.filled++; v.pulse = 1;
      sfx.pop(v.filled);
      G.parts.push({ type: 'ring', x: v.x, y: v.y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 10, color: PAL[p.c].main });
      if (v.filled >= v.cap) {
        v.state = 'full'; v.fullT = 0.3;
        sfx.full();
        G.floats.push({ x: v.x, y: v.y - 30, text: v.color === PARTY ? 'PARTY!' : pick(['Full!', 'Let\'s go!', 'Woo!', 'Yay!']), life: 0.9, max: 0.9, color: '#ffffff', size: 15 });
      }
    } else { p.x += dx / dist * wsp; p.y += dy / dist * wsp; }
  }

  if (G.state === 'play') {
    if (!waitingCount() && !G.walkers.length && G.pods.every((p) => !p)) {
      G.state = 'won'; G.endT = 1.3; G.liftMode = false;
      sfx.win(); buzz([30, 50, 30]);
      for (let i = 0; i < 80; i++) confetti(rand(0, LW), rand(view.y0, 100), true);
      refreshHUD();
    } else checkLose(dt);
  } else if (G.state === 'won') {
    G.endT -= dt;
    if (Math.random() < dt * 30) confetti(rand(view.x0, view.x1), view.y0 - 10, false);
    if (G.endT <= 0 && !G.shownEnd) { G.shownEnd = true; showWin(); }
  }

  // particles
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life -= dt;
    if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 'confetti') { p.vy += 260 * dt; p.vx *= 0.99; p.rot += p.vr * dt; }
    if (p.type === 'star') { p.vx *= 0.92; p.vy *= 0.92; p.rot += p.vr * dt; }
    if (p.type === 'spark') { p.vy += 120 * dt; }
  }
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i];
    f.life -= dt; f.y -= 34 * dt;
    if (f.life <= 0) G.floats.splice(i, 1);
  }

  // tutorial hint
  if (G.tutorial) {
    G.hintT -= dt;
    if (G.hintT <= 0) {
      G.hintT = 0.3;
      const count = {};
      G.pods.forEach((p) => { if (p) count[p.c] = (count[p.c] || 0) + 1; });
      const cands = G.vehicles.filter((v) => v.state === 'lot' && !v.lock && getBlockers(v).length === 0);
      cands.sort((a, b) => (count[b.color] || 0) - (count[a.color] || 0));
      G.hint = cands[0] || null;
      if (!G.bays.some((b) => !b)) G.hint = null;
    }
  }
}

function checkLose(dt) {
  const riders = G.pods.filter(Boolean);
  const busy = G.walkers.length || G.bays.some((b) => !b) || riders.some((p) => p.entering) ||
    (waitingCount() && riders.length < G.pods.length) || !riders.length || riders.some((p) => p.leaving);
  if (busy) { G.loseT = 0; return; }
  for (const v of G.bays) {
    if (v.state !== 'bay' && v.state !== 'moving') { G.loseT = 0; return; }
    if (v.filled + v.incoming < v.cap && riders.some((p) => p.c === v.color)) { G.loseT = 0; return; }
  }
  G.loseT += dt;
  if (G.loseT > 1) lose();
}

/* ------------------------------------------------------------- particles */
function confetti(x, y, burst) {
  G.parts.push({
    type: 'confetti', x, y,
    vx: burst ? rand(-160, 160) : rand(-30, 30), vy: burst ? rand(-260, -40) : rand(20, 80),
    life: rand(1.6, 2.6), max: 2.6, size: rand(4, 7), color: pick(RAINBOW.concat(['#ff70c8', '#2ee6d6', '#ffffff'])),
    rot: rand(0, TAU), vr: rand(-10, 10),
  });
}
function sparkles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(40, 130);
    G.parts.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: rand(0.4, 0.7), max: 0.7, size: rand(2, 4), color });
  }
}

/* --------------------------------------------------------------- drawing */
function rebuildBg() {
  bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
  paintBg(bgCtx, G ? G.T.key : 'bus');
  bgDirty = false;
}

// Sleepers and two rails along any polyline (used for curves and angled lines).
function railPath(g, pts) {
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const L = Math.hypot(bx - ax, by - ay);
    if (L > 0.01) segs.push({ ax, ay, bx, by, L, nx: -(by - ay) / L, ny: (bx - ax) / L });
  }
  g.strokeStyle = '#7a5a3a'; g.lineWidth = 2.6; g.lineCap = 'butt';
  let carry = 0;
  for (const sg of segs) {
    for (let t = carry; t < sg.L; t += 7) {
      const x = sg.ax + (sg.bx - sg.ax) * t / sg.L, y = sg.ay + (sg.by - sg.ay) * t / sg.L;
      g.beginPath(); g.moveTo(x - sg.nx * 7, y - sg.ny * 7); g.lineTo(x + sg.nx * 7, y + sg.ny * 7); g.stroke();
      carry = t + 7 - sg.L;
    }
  }
  g.strokeStyle = '#5d6270'; g.lineWidth = 1.8; g.lineJoin = 'round';
  for (const side of [-4.4, 4.4]) {
    g.beginPath();
    segs.forEach((sg, i) => {
      if (!i) g.moveTo(sg.ax + sg.nx * side, sg.ay + sg.ny * side);
      g.lineTo(sg.bx + sg.nx * side, sg.by + sg.ny * side);
    });
    g.stroke();
  }
}
function curvePts(ax, ay, cx, cy, bx, by) {
  const out = [];
  for (let k = 0; k <= 8; k++) { const t = k / 8, u = 1 - t; out.push([u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by]); }
  return out;
}

// Yard tracks: all sleepers first, then all rails, so crossings look right.
function drawYardTracks(g, tracks) {
  g.save();
  g.beginPath(); g.rect(RING.x, RING.y, RING.w, RING.h); g.clip();
  for (const pass of [0, 1]) {
    for (const t of tracks) {
      g.save(); g.translate(t.x, t.y); g.rotate(t.ang);
      if (pass === 0) { g.fillStyle = '#7a5a3a'; for (let x = -600; x < 600; x += 7) g.fillRect(x, -7, 3, 14); }
      else {
        g.fillStyle = '#5d6270'; g.fillRect(-600, -5.3, 1200, 1.8); g.fillRect(-600, 3.5, 1200, 1.8);
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-600, -5.3, 1200, 0.6); g.fillRect(-600, 3.5, 1200, 0.6);
      }
      g.restore();
    }
  }
  g.restore();
}

function railH(g, x1, x2, y) {
  g.fillStyle = '#7a5a3a';
  for (let x = x1; x < x2; x += 7) g.fillRect(x, y - 7, 3, 14);
  g.fillStyle = '#5d6270'; g.fillRect(x1, y - 5.3, x2 - x1, 1.8); g.fillRect(x1, y + 3.5, x2 - x1, 1.8);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x1, y - 5.3, x2 - x1, 0.6); g.fillRect(x1, y + 3.5, x2 - x1, 0.6);
}
function railV(g, x, y1, y2) {
  g.fillStyle = '#7a5a3a';
  for (let y = y1; y < y2; y += 7) g.fillRect(x - 7, y, 14, 3);
  g.fillStyle = '#5d6270'; g.fillRect(x - 5.3, y1, 1.8, y2 - y1); g.fillRect(x + 3.5, y1, 1.8, y2 - y1);
}

function tree(g, x, y, r) {
  g.fillStyle = 'rgba(0,0,0,0.15)'; circ(g, x + 3, y + 4, r); g.fill();
  g.fillStyle = '#2fa84f'; circ(g, x, y, r); g.fill();
  g.fillStyle = '#4cc96a'; circ(g, x - r * 0.25, y - r * 0.25, r * 0.65); g.fill();
  g.fillStyle = '#7be08f'; circ(g, x - r * 0.4, y - r * 0.4, r * 0.25); g.fill();
}

function paintBg(g, th) {
  const V = view;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  g.setTransform(V.dpr * V.scale, 0, 0, V.dpr * V.scale, V.dpr * V.ox, V.dpr * V.oy);
  const X0 = V.x0 - 4, Y0 = V.y0 - 4, W = V.x1 - V.x0 + 8, H = V.y1 - V.y0 + 8;
  const qTop = -8 - V.qH;
  const rng = mulberry32(7);
  const roadH = LOT.h + ROAD * 2;
  const outside = (x, y) => y > WORLD_BOTTOM - 4 || x < -2 || x > LW + 2 || y < qTop - 10;

  if (th === 'bus') {
    g.fillStyle = '#8fdc5e'; g.fillRect(X0, Y0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let y = Math.floor(Y0 / 36) * 36; y < Y0 + H; y += 36) g.fillRect(X0, y, W, 18);
    for (let i = 0; i < 260; i++) {
      const x = X0 + rng() * W, y = Y0 + rng() * H;
      if (!outside(x, y)) continue;
      g.fillStyle = pick(['#ffffff', '#ffe14d', '#ff8fc8']); circ(g, x, y, 1.8); g.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = X0 + rng() * W, y = Y0 + rng() * H;
      if (outside(x, y) && (y > WORLD_BOTTOM + 10 || x < -16 || x > LW + 16)) tree(g, x, y, 10 + rng() * 8);
    }
    // plaza where the queue waits
    g.fillStyle = '#ffe3b8'; rr(g, 6, qTop - 4, 388, V.qH + 2, 16); g.fill();
    g.save(); rr(g, 6, qTop - 4, 388, V.qH + 2, 16); g.clip();
    g.strokeStyle = 'rgba(214,160,90,0.28)'; g.lineWidth = 1;
    for (let x = 6; x < 400; x += 20) { g.beginPath(); g.moveTo(x, qTop - 4); g.lineTo(x, 0); g.stroke(); }
    for (let y = qTop - 4; y < 0; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(400, y); g.stroke(); }
    g.restore();
    g.strokeStyle = '#f0c27f'; g.lineWidth = 3; rr(g, 6, qTop - 4, 388, V.qH + 2, 16); g.stroke();
    // kerb + stop strip
    g.fillStyle = '#5d6480'; g.fillRect(X0, 0, W, BAY_H);
    g.fillStyle = '#ece6da'; g.fillRect(X0, -3, W, 5);
    // road + lot
    g.fillStyle = '#4b5168'; rr(g, 2, BAY_H - 2, 396, roadH + 2, 18); g.fill();
    g.fillStyle = '#737b99'; rr(g, LOT.x, LOT.y, LOT.w, LOT.h, 10); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    for (let x = LOT.x + 22; x < LOT.x + LOT.w - 10; x += 34) {
      g.beginPath(); g.moveTo(x, LOT.y + 3); g.lineTo(x, LOT.y + 16); g.stroke();
      g.beginPath(); g.moveTo(x, LOT.y + LOT.h - 16); g.lineTo(x, LOT.y + LOT.h - 3); g.stroke();
    }
    g.setLineDash([10, 10]); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2;
    rr(g, RING.x, RING.y, RING.w, RING.h, 14); g.stroke(); g.setLineDash([]);
  } else if (th === 'boat') {
    g.fillStyle = '#38c8f4'; g.fillRect(X0, Y0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 140; i++) {
      const x = X0 + rng() * W, y = Y0 + rng() * H;
      g.beginPath(); g.arc(x, y, 5, PI * 1.15, PI * 1.85); g.stroke();
    }
    // little islands off to the sides / bottom
    for (let i = 0; i < 18; i++) {
      const x = X0 + rng() * W, y = Y0 + rng() * H;
      if (!(y > WORLD_BOTTOM + 14 || x < -20 || x > LW + 20)) continue;
      const r = 12 + rng() * 10;
      g.fillStyle = '#ffe3a1'; circ(g, x, y, r); g.fill();
      tree(g, x + 2, y - 2, r * 0.55);
    }
    // pier for the queue
    g.fillStyle = '#e7ad6e'; rr(g, 6, qTop - 4, 388, V.qH + 2, 10); g.fill();
    g.save(); rr(g, 6, qTop - 4, 388, V.qH + 2, 10); g.clip();
    g.strokeStyle = 'rgba(160,95,40,0.4)'; g.lineWidth = 1;
    for (let x = 6; x < 400; x += 10) { g.beginPath(); g.moveTo(x, qTop - 4); g.lineTo(x, 0); g.stroke(); }
    g.restore();
    g.strokeStyle = '#a8692f'; g.lineWidth = 3; rr(g, 6, qTop - 4, 388, V.qH + 2, 10); g.stroke();
    // jetty edge
    g.fillStyle = '#d99a5b'; g.fillRect(X0, -4, W, 8);
    g.fillStyle = '#8a5526';
    for (let x = Math.floor(X0 / 24) * 24; x < X0 + W; x += 24) { circ(g, x, 0, 3); g.fill(); }
    // channel + marina
    g.fillStyle = '#69dafb'; rr(g, 2, BAY_H - 2, 396, roadH + 2, 22); g.fill();
    g.fillStyle = '#1ea2dd'; rr(g, LOT.x, LOT.y, LOT.w, LOT.h, 14); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const x = LOT.x + 10 + rng() * (LOT.w - 20), y = LOT.y + 10 + rng() * (LOT.h - 20);
      g.beginPath(); g.arc(x, y, 6, PI * 1.15, PI * 1.85); g.stroke();
    }
    // floating boom
    const per = 2 * (LOT.w + LOT.h);
    for (let s = 0; s < per; s += 11) {
      let x, y;
      if (s < LOT.w) { x = LOT.x + s; y = LOT.y; }
      else if (s < LOT.w + LOT.h) { x = LOT.x + LOT.w; y = LOT.y + s - LOT.w; }
      else if (s < 2 * LOT.w + LOT.h) { x = LOT.x + LOT.w - (s - LOT.w - LOT.h); y = LOT.y + LOT.h; }
      else { x = LOT.x; y = LOT.y + LOT.h - (s - 2 * LOT.w - LOT.h); }
      g.fillStyle = (s / 11) % 2 < 1 ? '#ffd23f' : '#ff7a3d'; circ(g, x, y, 2.4); g.fill();
    }
    // buoys
    [[RING.x, RING.y + RING.h], [RING.x + RING.w, RING.y + RING.h], [RING.x, RING.y + RING.h / 2], [RING.x + RING.w, RING.y + RING.h / 2]].forEach(([x, y]) => {
      g.fillStyle = '#ffffff'; circ(g, x, y, 5); g.fill();
      g.fillStyle = '#ff4d6d'; circ(g, x, y, 3); g.fill();
    });
  } else if (th === 'plane') {
    g.fillStyle = '#9fe372'; g.fillRect(X0, Y0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.04)';
    for (let x = Math.floor(X0 / 44) * 44; x < X0 + W; x += 44) g.fillRect(x, Y0, 22, H);
    // terminal
    g.fillStyle = '#f5f8ff'; rr(g, 6, qTop - 4, 388, V.qH + 2, 12); g.fill();
    g.save(); rr(g, 6, qTop - 4, 388, V.qH + 2, 12); g.clip();
    g.strokeStyle = '#e1e8f7'; g.lineWidth = 1;
    for (let x = 6; x < 400; x += 24) { g.beginPath(); g.moveTo(x, qTop - 4); g.lineTo(x, 0); g.stroke(); }
    for (let y = qTop - 4; y < 0; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(400, y); g.stroke(); }
    g.fillStyle = '#86cfff'; g.fillRect(6, qTop - 4, 388, 5);
    g.restore();
    g.strokeStyle = '#a9b8de'; g.lineWidth = 4; rr(g, 6, qTop - 4, 388, V.qH + 2, 12); g.stroke();
    // gates apron
    g.fillStyle = '#b6bdcd'; g.fillRect(X0, 0, W, BAY_H);
    g.fillStyle = '#7d8db3'; g.fillRect(X0, -3, W, 5);
    // taxiway + apron
    g.fillStyle = '#62697f'; rr(g, 2, BAY_H - 2, 396, roadH + 2, 20); g.fill();
    g.fillStyle = '#a7aec1'; rr(g, LOT.x, LOT.y, LOT.w, LOT.h, 8); g.fill();
    g.strokeStyle = 'rgba(255,210,63,0.35)'; g.lineWidth = 1.5;
    for (let x = LOT.x + 40; x < LOT.x + LOT.w; x += 60) { g.beginPath(); g.moveTo(x, LOT.y + 6); g.lineTo(x, LOT.y + LOT.h - 6); g.stroke(); }
    g.strokeStyle = '#ffd23f'; g.lineWidth = 2;
    rr(g, RING.x, RING.y, RING.w, RING.h, 14); g.stroke();
    for (let y = BAY_H + 6; y < LOT.y + LOT.h; y += 22) {
      g.fillStyle = '#5fb7ff'; circ(g, 4, y, 1.8); g.fill(); circ(g, 396, y, 1.8); g.fill();
    }
    // the runway runs along the bottom of the taxiway loop, out past both edges of the screen
    const ry = RING.y + RING.h;
    g.fillStyle = '#41475a'; g.fillRect(X0, ry - 18, W, 36);
    g.fillStyle = '#ffffff';
    g.fillRect(X0, ry - 16, W, 1.5); g.fillRect(X0, ry + 14.5, W, 1.5);
    for (let x = Math.floor(X0 / 34) * 34; x < X0 + W; x += 34) g.fillRect(x, ry - 1.2, 18, 2.4);
    for (const x0 of [RING.x + 6, RING.x + RING.w - 30]) for (let k = 0; k < 5; k++) g.fillRect(x0, ry - 12.5 + k * 5.6, 24, 2.6);
    g.font = '900 11px ui-rounded, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('09', RING.x + 46, ry + 0.5); g.fillText('27', RING.x + RING.w - 46, ry + 0.5);
    for (let x = Math.floor(X0 / 22) * 22; x < X0 + W; x += 22) {
      g.fillStyle = '#ffe36e'; circ(g, x, ry - 19, 1.6); g.fill(); circ(g, x, ry + 19, 1.6); g.fill();
    }
  } else if (th === 'train') {
    g.fillStyle = '#a6e07a'; g.fillRect(X0, Y0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let y = Math.floor(Y0 / 36) * 36; y < Y0 + H; y += 36) g.fillRect(X0, y, W, 18);
    for (let i = 0; i < 40; i++) {
      const x = X0 + rng() * W, y = Y0 + rng() * H;
      if (outside(x, y) && (y > WORLD_BOTTOM + 10 || x < -16 || x > LW + 16)) tree(g, x, y, 10 + rng() * 8);
    }
    // station concourse
    g.fillStyle = '#ffe9c9'; rr(g, 6, qTop - 4, 388, V.qH + 2, 14); g.fill();
    g.strokeStyle = '#e8b97a'; g.lineWidth = 3; g.stroke();
    // platforms strip
    g.fillStyle = '#d6cfc4'; g.fillRect(X0, 0, W, BAY_H);
    g.fillStyle = '#ece6da'; g.fillRect(X0, -3, W, 5);
    // ballast loop + yard
    g.fillStyle = '#ab9c84'; rr(g, 2, BAY_H - 2, 396, roadH + 2, 18); g.fill();
    g.fillStyle = '#c8bba4'; rr(g, LOT.x, LOT.y, LOT.w, LOT.h, 8); g.fill();
    g.fillStyle = 'rgba(120,100,80,0.18)';
    for (let i = 0; i < 260; i++) { circ(g, LOT.x + rng() * LOT.w, LOT.y + rng() * LOT.h, 1.2); g.fill(); }
    drawYardTracks(g, (G && G.tracks) || []);
    railH(g, RING.x + 12, RING.x + RING.w - 12, RING.y);
    // the main line runs off both sides of the screen (into tunnels)
    railH(g, X0 - 10, RING.x + 12, RING.y);
    railH(g, RING.x + RING.w - 12, X0 + W + 10, RING.y);
    railH(g, RING.x + 12, RING.x + RING.w - 12, RING.y + RING.h);
    railV(g, RING.x, RING.y + 12, RING.y + RING.h - 12);
    railV(g, RING.x + RING.w, RING.y + 12, RING.y + RING.h - 12);
    g.strokeStyle = '#5d6270'; g.lineWidth = 1.8;
    rr(g, RING.x - 4.5, RING.y - 4.5, RING.w + 9, RING.h + 9, 18); g.stroke();
    rr(g, RING.x + 4.5, RING.y + 4.5, RING.w - 9, RING.h - 9, 10); g.stroke();
  } else {
    const gr = g.createLinearGradient(0, Y0, 0, Y0 + H);
    gr.addColorStop(0, '#140d36'); gr.addColorStop(1, '#2d1b63');
    g.fillStyle = gr; g.fillRect(X0, Y0, W, H);
    for (const [nx, ny, nc] of [[X0 + W * 0.15, WORLD_BOTTOM - 60, '255,95,180'], [X0 + W * 0.85, 160, '60,220,255'], [X0 + W * 0.5, WORLD_BOTTOM + 40, '155,93,229']]) {
      const ng = g.createRadialGradient(nx, ny, 0, nx, ny, 170);
      ng.addColorStop(0, `rgba(${nc},0.28)`); ng.addColorStop(1, `rgba(${nc},0)`);
      g.fillStyle = ng; g.fillRect(X0, Y0, W, H);
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + rng() * 0.7})`;
      circ(g, X0 + rng() * W, Y0 + rng() * H, 0.4 + rng() * 1.2); g.fill();
    }
    if (V.y1 > WORLD_BOTTOM + 30) {
      const px = LW - 30, py = WORLD_BOTTOM + 46;
      const pg = g.createRadialGradient(px - 12, py - 12, 4, px, py, 38);
      pg.addColorStop(0, '#ffd58a'); pg.addColorStop(1, '#ff7a59');
      g.fillStyle = pg; circ(g, px, py, 36); g.fill();
      g.strokeStyle = 'rgba(255,230,180,0.8)'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(px, py, 58, 13, -0.3, 0, TAU); g.stroke();
    }
    // star lounge (queue area)
    g.fillStyle = '#3a2d80'; rr(g, 6, qTop - 4, 388, V.qH + 2, 16); g.fill();
    g.strokeStyle = '#8f7dff'; g.lineWidth = 3; g.stroke();
    // docking strip
    g.fillStyle = '#231a57'; g.fillRect(X0, 0, W, BAY_H);
    g.fillStyle = '#8f7dff'; g.fillRect(X0, -3, W, 4);
    // orbit lane + launch field
    g.fillStyle = '#30266f'; rr(g, 2, BAY_H - 2, 396, roadH + 2, 22); g.fill();
    g.fillStyle = '#1d1648'; rr(g, LOT.x, LOT.y, LOT.w, LOT.h, 12); g.fill();
    g.save(); rr(g, LOT.x, LOT.y, LOT.w, LOT.h, 12); g.clip();
    g.strokeStyle = 'rgba(120,100,255,0.22)'; g.lineWidth = 1;
    for (let x = LOT.x; x < LOT.x + LOT.w; x += 28) { g.beginPath(); g.moveTo(x, LOT.y); g.lineTo(x, LOT.y + LOT.h); g.stroke(); }
    for (let y = LOT.y; y < LOT.y + LOT.h; y += 28) { g.beginPath(); g.moveTo(LOT.x, y); g.lineTo(LOT.x + LOT.w, y); g.stroke(); }
    g.restore();
    g.setLineDash([2, 8]); g.strokeStyle = '#6ef3ff'; g.lineWidth = 2;
    rr(g, RING.x, RING.y, RING.w, RING.h, 14); g.stroke(); g.setLineDash([]);
  }
  drawQueueArea(g, th);
}

const CIRCLE = {
  bus:   { path: '#f6cf98', edge: '#dea25c', island: '#8fdc5e', rope: '#ff5fa2' },
  boat:  { path: '#d99a5b', edge: '#8a5526', island: '#38c8f4', rope: '#8b5a2b' },
  plane: { path: '#d6def2', edge: '#9aa8cc', island: '#b9ecff', rope: '#3d6bff' },
  train: { path: '#ead6ae', edge: '#c4a77a', island: '#a6e07a', rope: '#c45f1d' },
  space: { path: '#4b3fa6', edge: '#7c5cff', island: '#1d1748', rope: '#8f7dff' },
};

function walkway(g, pts, C, w) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineWidth = w + 4; g.strokeStyle = C.edge; g.stroke();
}
function walkwayFill(g, pts, C, w) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineWidth = w; g.strokeStyle = C.path; g.stroke();
}
function chevron(g, x, y, ang, col) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.strokeStyle = col; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-3, -4); g.lineTo(2, 0); g.lineTo(-3, 4); g.stroke();
  g.restore();
}

function drawQueueArea(g, th) {
  const R = ring, C = CIRCLE[th];
  // paths: each feeder line into its entrance, and the exit down to the bays
  const paths = [0, 1].map((li) => {
    const F = feeders[li], [gx, gy] = ringPoint(R.gateS[li]), [ox, oy] = gateOut(li);
    return [[F.xin, F.y0], [ox, oy], [gx, gy]];
  });
  const exitPath = [R.exitPt, R.exitOut];
  for (const pth of paths) walkway(g, pth, C, 18);
  walkway(g, exitPath, C, 18);
  // the walkway people circle round
  rr(g, R.x, R.y + 2, R.w, R.h, R.r); g.lineWidth = 30; g.strokeStyle = 'rgba(0,0,0,0.1)'; g.stroke();
  rr(g, R.x, R.y, R.w, R.h, R.r);
  g.lineWidth = 30; g.strokeStyle = C.edge; g.stroke();
  g.lineWidth = 26; g.strokeStyle = C.path; g.stroke();
  // open the walkway edge where the paths join, and mark which way people go
  for (const pth of paths) walkwayFill(g, pth, C, 18);
  walkwayFill(g, exitPath, C, 18);
  const arrowCol = th === 'space' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)';
  paths.forEach((pth) => {
    const [[ax, ay], [bx, by]] = pth;
    chevron(g, (ax + bx) / 2, (ay + by) / 2, Math.atan2(by - ay, bx - ax), arrowCol);
  });
  chevron(g, R.exitOut[0], (R.exitPt[1] + R.exitOut[1]) / 2 + 2, PI / 2, arrowCol);
  // centre: a little fountain garden (a glowing beacon in space)
  const ix = R.x + 16, iy = R.y + 16, iw = R.w - 32, ih = R.h - 32;
  const cx = R.x + R.w / 2, cy = R.cy;
  if (ih > 6 && iw > 6) {
    g.fillStyle = C.island; rr(g, ix, iy, iw, ih, ih / 2); g.fill();
    const fr = Math.min(ih, iw) / 2 - 5;
    if (th === 'space') {
      const gl = g.createRadialGradient(cx, cy, 0, cx, cy, fr + 4);
      gl.addColorStop(0, 'rgba(110,243,255,0.95)'); gl.addColorStop(0.45, 'rgba(124,92,255,0.6)'); gl.addColorStop(1, 'rgba(124,92,255,0)');
      g.fillStyle = gl; circ(g, cx, cy, fr + 4); g.fill();
    } else if (fr > 4) {
      g.fillStyle = '#e8e4dc'; circ(g, cx, cy, fr); g.fill();
      g.strokeStyle = '#c9c2b4'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#6fd2ff'; circ(g, cx, cy, fr - 4); g.fill();
      g.fillStyle = '#e8e4dc'; circ(g, cx, cy, Math.max(2, fr * 0.28)); g.fill();
      if (th !== 'boat') {
        g.fillStyle = '#ff8fc8';
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; circ(g, cx + Math.cos(a) * (fr + 6), cy + Math.sin(a) * (fr + 6), 2.2); g.fill(); }
      }
    }
  }
  // two roped feeder lines
  g.lineCap = 'round';
  for (const F of feeders) {
    const a = Math.min(F.xin, F.xout) - 10, b = Math.max(F.xin, F.xout) + 10;
    const yb = F.y0 + F.rowH / 2 + 1, yt = F.y0 - (F.rows - 1) * F.rowH - F.rowH / 2 - 1;
    g.fillStyle = th === 'space' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.35)';
    rr(g, a, yt, b - a, yb - yt, 10); g.fill();
    const inLeft = F.xin < F.xout;
    for (let k = 0; k < F.rows - 1; k++) {
      const y = F.y0 - k * F.rowH - F.rowH / 2;
      // the gap is at the end where the line turns
      const turnAtOuter = k % 2 === 0;
      let x1 = a + 3, x2 = b - 3;
      if (turnAtOuter === inLeft) x2 = b - 16; else x1 = a + 16;
      g.strokeStyle = C.rope; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke();
      g.fillStyle = C.rope; circ(g, x1, y, 2.5); g.fill(); circ(g, x2, y, 2.5); g.fill();
    }
    g.setLineDash([4, 4]); g.strokeStyle = C.rope; g.lineWidth = 1.5;
    rr(g, a, yt, b - a, yb - yt, 10); g.stroke(); g.setLineDash([]);
  }
}

function drawCarouselFx() {
  const R = ring;
  // little arrows on the walkway show which way everyone is walking
  rr(ctx, R.x, R.y, R.w, R.h, R.r);
  ctx.setLineDash([2, 16]); ctx.lineDashOffset = -G.rot;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.stroke();
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  // fountain spray
  if (G.T.key !== 'space' && R.h - 32 > 14) {
    const cx = R.x + R.w / 2, cy = R.cy;
    for (let k = 0; k < 6; k++) {
      const t = (G.time * 1.4 + k / 6) % 1, a = k / 6 * TAU + G.time * 0.5;
      const d = t * Math.min(R.h - 32, R.w - 32) * 0.28;
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - t)})`;
      circ(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d - Math.sin(t * PI) * 4, 1.6); ctx.fill();
    }
  }
}

function drawLiveBg() {
  const th = G.T.key;
  if (th === 'boat') {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const x = LOT.x + 20 + ((i * 97 + G.time * 12) % (LOT.w - 40));
      const y = LOT.y + 20 + ((i * 61) % (LOT.h - 40)) + Math.sin(G.time * 2 + i) * 3;
      ctx.beginPath(); ctx.arc(x, y, 7, PI * 1.2, PI * 1.8); ctx.stroke();
    }
  }
  // bays
  const n = G.bays.length, bw = bayW();
  for (let i = 0; i < n; i++) {
    const [bx] = bayPos(i);
    const empty = !G.bays[i];
    if (th === 'bus') {
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(bx - bw / 2 + 5, 80); ctx.lineTo(bx - bw / 2 + 5, 7); ctx.lineTo(bx + bw / 2 - 5, 7); ctx.lineTo(bx + bw / 2 - 5, 80); ctx.stroke();
      ctx.fillStyle = '#ff5fa2'; rr(ctx, bx - 14, 1, 28, 6, 3); ctx.fill();
    } else if (th === 'boat') {
      ctx.fillStyle = '#d99a5b'; rr(ctx, bx - bw / 2 - 3, 0, 6, 68, 3); ctx.fill();
      ctx.fillStyle = '#8a5526'; circ(ctx, bx - bw / 2, 68, 3.2); ctx.fill();
      if (i === n - 1) { ctx.fillStyle = '#d99a5b'; rr(ctx, bx + bw / 2 - 3, 0, 6, 68, 3); ctx.fill(); ctx.fillStyle = '#8a5526'; circ(ctx, bx + bw / 2, 68, 3.2); ctx.fill(); }
    } else if (th === 'plane') {
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, 14); ctx.lineTo(bx, 84); ctx.stroke();
      ctx.fillStyle = '#d5dbe8'; ctx.strokeStyle = '#8e97ad'; ctx.lineWidth = 1.5;
      rr(ctx, bx - 6, -4, 12, 16, 3); ctx.fill(); ctx.stroke();
    } else if (th === 'train') {
      // a platform on each side of every track, buffer stop at the end
      ctx.fillStyle = '#efe9df'; ctx.fillRect(bx - bw / 2 - 5, 0, 10, 80);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(bx - bw / 2 - 5, 0, 1.5, 80); ctx.fillRect(bx - bw / 2 + 3.5, 0, 1.5, 80);
      if (i === n - 1) { ctx.fillStyle = '#efe9df'; ctx.fillRect(bx + bw / 2 - 5, 0, 10, 80); }
      railPath(ctx, [[bx, 6], [bx, RING.y - 14]]);
      railPath(ctx, curvePts(bx, RING.y - 14, bx, RING.y, bx - 14, RING.y));
      railPath(ctx, curvePts(bx, RING.y - 14, bx, RING.y, bx + 14, RING.y));
      ctx.fillStyle = '#ff4d6d'; rr(ctx, bx - 8, 1, 16, 5, 2); ctx.fill();
    } else {
      ctx.save();
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = -G.time * 12;
      ctx.strokeStyle = 'rgba(110,243,255,0.55)'; ctx.lineWidth = 2;
      circ(ctx, bx, BAY_CY, Math.min(30, bw / 2 - 4)); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#8f7dff'; rr(ctx, bx - 5, -4, 10, 12, 3); ctx.fill();
    }
    if (empty) {
      ctx.fillStyle = th === 'plane' || th === 'train' ? 'rgba(80,90,120,0.35)' : 'rgba(255,255,255,0.35)';
      ctx.font = '900 18px ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(th === 'plane' ? 'G' + (i + 1) : String(i + 1), bx, BAY_CY + 4);
    }
  }
}

function drawPerson(x, y, c, skin, hair, bob, scale) {
  const col = PAL[c];
  ctx.save();
  ctx.translate(x, y);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, 6, 5.5, 2.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = c === PARTY ? rainbowGrad(5, 0) : col.main;
  ctx.strokeStyle = c === PARTY ? '#6a2fb8' : col.dark; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.ellipse(0, 1.5 + bob * 0.4, 5.4, 5.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = skin; circ(ctx, 0, -4 + bob, 3.8); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0, -4.6 + bob, 3.9, PI * 1.05, PI * 1.95); ctx.fill();
  if (c === PARTY) {
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-2.5, -7.3 + bob); ctx.lineTo(2.5, -7.3 + bob); ctx.lineTo(0, -13 + bob); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawQueue() {
  drawCarouselFx();
  const party = G.partyT > 0;
  // the two feeder lines (back to front so the front is on top)
  G.lines.forEach((line, li) => {
    const slots = feeders[li].slots;
    const n = Math.min(line.length, slots.length);
    for (let i = n - 1; i >= 0; i--) {
      const p = line[i];
      let bob = p.moving ? Math.sin(p.walk * 18) * 1.2 : 0;
      if (party) bob = Math.sin(G.time * 14 + i * 0.7) * 1.6;
      drawPerson(p.x, p.y, p.c, p.skin, p.hair, bob, 1);
    }
    const hidden = line.length - n;
    if (hidden > 0) {
      const [x, y] = slots[slots.length - 1];
      ctx.fillStyle = '#ffffff'; rr(ctx, x - 16, y - 9, 32, 18, 9); ctx.fill();
      ctx.fillStyle = '#7b4dff'; ctx.font = '900 11px ui-rounded, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+' + hidden, x, y + 0.5);
    }
  });
  // people walking round the holding circle, drawn top-to-bottom so nearer ones overlap
  const walkers = G.pods.filter(Boolean).sort((a, b) => a.y - b.y);
  for (const p of walkers) {
    const bob = Math.sin(p.walk * (party ? 22 : 13)) * (party ? 1.8 : 1.1);
    drawPerson(p.x, p.y, p.c, p.skin, p.hair, bob, 1);
  }
}

function seatFill(v, i) {
  if (v.color === PARTY) return RAINBOW[i % RAINBOW.length];
  return PAL[v.color].main;
}
function drawSeats(v, x0, x1, rowOff, r) {
  const cols = v.cap / 2, step = (x1 - x0) / cols;
  for (let i = 0; i < v.cap; i++) {
    const ci = Math.floor(i / 2);
    const x = x1 - (ci + 0.5) * step, y = i % 2 ? rowOff : -rowOff;
    if (i < v.filled) {
      ctx.fillStyle = seatFill(v, i); circ(ctx, x, y, r); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.fillStyle = '#ffd9b8'; circ(ctx, x + r * 0.2, y, r * 0.5); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; circ(ctx, x, y, r); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.9; ctx.stroke();
    }
  }
}

function hullPath(hl, hw, bow) {
  ctx.beginPath();
  ctx.moveTo(-hl + 5, -hw);
  ctx.lineTo(hl - bow, -hw);
  ctx.quadraticCurveTo(hl - bow * 0.2, -hw, hl, 0);
  ctx.quadraticCurveTo(hl - bow * 0.2, hw, hl - bow, hw);
  ctx.lineTo(-hl + 5, hw);
  ctx.quadraticCurveTo(-hl, hw, -hl, hw - 5);
  ctx.lineTo(-hl, -hw + 5);
  ctx.quadraticCurveTo(-hl, -hw, -hl + 5, -hw);
  ctx.closePath();
}
function planePaths(len, wid) {
  const hl = len / 2, hw = wid / 2, fh = Math.max(6.5, wid * 0.17);
  const wr = len * 0.14, wt = -len * 0.1, wt2 = -len * 0.24;
  return {
    hl, hw, fh,
    wings() {
      ctx.beginPath();
      ctx.moveTo(wr, -fh); ctx.lineTo(wt, -hw); ctx.lineTo(wt2, -hw); ctx.lineTo(-len * 0.12, -fh);
      ctx.lineTo(-len * 0.12, fh); ctx.lineTo(wt2, hw); ctx.lineTo(wt, hw); ctx.lineTo(wr, fh);
      ctx.closePath();
    },
    tail() {
      const th = hw * 0.45;
      ctx.beginPath();
      ctx.moveTo(-hl + 11, -fh * 0.8); ctx.lineTo(-hl + 3, -th); ctx.lineTo(-hl, -th); ctx.lineTo(-hl + 2, 0);
      ctx.lineTo(-hl, th); ctx.lineTo(-hl + 3, th); ctx.lineTo(-hl + 11, fh * 0.8);
      ctx.closePath();
    },
    body() { rr(ctx, -hl, -fh, len, fh * 2, fh); },
  };
}

function silhouette(v) {
  const k = G.T.key, hl = v.len / 2, hw = v.wid / 2;
  if (k === 'bus') rr(ctx, -hl, -hw, v.len, v.wid, 6);
  else if (k === 'train') rr(ctx, -hl, -hw, v.len, v.wid, 3);
  else if (k === 'boat') hullPath(hl, hw, v.wid * 0.9);
  else if (k === 'space') rocketBody(hl, hw);
  else {
    const p = planePaths(v.len, v.wid);
    p.wings(); ctx.fill(); p.tail(); ctx.fill(); p.body();
  }
}

function headBeam(x, half, spread, len) {
  const beam = ctx.createLinearGradient(x, 0, x + len, 0);
  beam.addColorStop(0, 'rgba(255,245,160,0.6)'); beam.addColorStop(1, 'rgba(255,245,160,0)');
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(x, -half); ctx.lineTo(x + len, -half - spread); ctx.lineTo(x + len, half + spread); ctx.lineTo(x, half); ctx.closePath(); ctx.fill();
}

function drawBus(v, col) {
  const hl = v.len / 2, hw = v.wid / 2;
  // headlight beams make the front (and the way it will drive) obvious
  for (const sy of [-1, 1]) {
    const beam = ctx.createLinearGradient(hl, 0, hl + 18, 0);
    beam.addColorStop(0, 'rgba(255,245,160,0.6)'); beam.addColorStop(1, 'rgba(255,245,160,0)');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(hl - 1, sy * (hw - 3)); ctx.lineTo(hl + 18, sy * (hw + 2)); ctx.lineTo(hl + 18, sy * (hw - 12)); ctx.lineTo(hl - 1, sy * (hw - 7)); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = col.dark; rr(ctx, -hl, -hw, v.len, v.wid, 6); ctx.fill();
  ctx.fillStyle = col.main; rr(ctx, -hl + 1, -hw + 1, v.len - 2, v.wid - 3, 5); ctx.fill();
  // back: engine grille and tail lights
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, -hl + 1.6, -hw + 5, 2.6, v.wid - 11, 1); ctx.fill();
  ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-hl, -hw + 1.5, 2, 3.2); ctx.fillRect(-hl, hw - 5, 2, 3.2);
  // big dark wrap-around windscreen across the front
  ctx.fillStyle = '#23305e'; rr(ctx, hl - 12, -hw + 1.8, 10, v.wid - 4.6, 3); ctx.fill();
  ctx.fillStyle = 'rgba(140,210,255,0.85)'; rr(ctx, hl - 10.5, -hw + 3.6, 2.6, v.wid - 8.2, 1.3); ctx.fill();
  // bumper + headlights
  ctx.fillStyle = '#f2f2f7'; rr(ctx, hl - 2.4, -hw + 2, 2.6, v.wid - 5, 1.2); ctx.fill();
  ctx.fillStyle = '#fff36b'; rr(ctx, hl - 2.6, -hw + 2, 2.8, 4, 1); ctx.fill(); rr(ctx, hl - 2.6, hw - 7, 2.8, 4, 1); ctx.fill();
  // wing mirrors sticking out at the front corners
  ctx.fillStyle = '#2b2b3a'; ctx.fillRect(hl - 7.5, -hw - 3, 2.4, 4); ctx.fillRect(hl - 7.5, hw - 2, 2.4, 4);
  drawSeats(v, -hl + 6, hl - 14, Math.min(5.6, hw - 5.5), 3.4);
}

function trainNosePath(x0, x1, hw) {
  const n = Math.min(9, (x1 - x0) * 0.42);
  ctx.beginPath();
  ctx.moveTo(x0 + 2.5, -hw);
  ctx.lineTo(x1 - n, -hw);
  ctx.bezierCurveTo(x1 - n * 0.3, -hw, x1, -hw * 0.55, x1, 0);
  ctx.bezierCurveTo(x1, hw * 0.55, x1 - n * 0.3, hw, x1 - n, hw);
  ctx.lineTo(x0 + 2.5, hw);
  ctx.quadraticCurveTo(x0, hw, x0, hw - 2.5);
  ctx.lineTo(x0, -hw + 2.5);
  ctx.quadraticCurveTo(x0, -hw, x0 + 2.5, -hw);
  ctx.closePath();
}

function drawTrain(v, col) {
  const hl = v.len / 2, hw = v.wid / 2;
  const cars = v.cap === 4 ? 2 : v.cap === 6 ? 3 : 4, gap = 2;
  const seg = (v.len - gap * (cars - 1)) / cars;
  headBeam(hl, 3, 7, 24);
  // gangway connectors between the carriages
  ctx.fillStyle = '#2b2b38';
  for (let k = 0; k < cars - 1; k++) { const x = -hl + (k + 1) * seg + k * gap; ctx.fillRect(x - 1, -hw + 4, gap + 2, v.wid - 8); }
  for (let k = 0; k < cars; k++) {
    const x0 = -hl + k * (seg + gap), x1 = x0 + seg, loco = k === cars - 1;
    if (loco) trainNosePath(x0, x1, hw); else rr(ctx, x0, -hw, seg, v.wid, 2.5);
    ctx.fillStyle = col.dark; ctx.fill();
    if (loco) trainNosePath(x0 + 0.6, x1 - 0.6, hw - 1.1); else rr(ctx, x0 + 0.6, -hw + 0.6, seg - 1.2, v.wid - 2.6, 2);
    ctx.fillStyle = col.main; ctx.fill();
    // roof panel, livery stripes and roof vents
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(ctx, x0 + 2, -hw * 0.38, seg - (loco ? 12 : 4), hw * 0.76, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(x0 + 1.5, -hw + 1.1, seg - (loco ? 8 : 3), 0.8);
    ctx.fillRect(x0 + 1.5, hw - 2.1, seg - (loco ? 8 : 3), 0.8);
    if (!loco) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x0 + seg / 2 - 2.5, -1.2, 5, 2.4); }
  }
  // locomotive: yellow warning nose, wrap-around windscreen, headlights and roof fans
  const lx0 = hl - seg;
  ctx.save(); trainNosePath(lx0, hl, hw); ctx.clip();
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(hl - 5.5, -hw, 6, v.wid);
  ctx.restore();
  ctx.fillStyle = '#1d2848'; rr(ctx, hl - 10, -hw + 2.4, 4, v.wid - 4.8, 1.5); ctx.fill();
  ctx.fillStyle = 'rgba(150,215,255,0.85)'; ctx.fillRect(hl - 9.3, -hw + 3.4, 1, v.wid - 6.8);
  ctx.fillStyle = '#fffbe0'; circ(ctx, hl - 1.6, -hw + 4.2, 1.3); ctx.fill(); circ(ctx, hl - 1.6, hw - 4.2, 1.3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; circ(ctx, lx0 + 5, 0, 2.4); ctx.fill(); circ(ctx, lx0 + 10.5, 0, 2.4); ctx.fill();
  // passenger windows down both sides fill up as people board
  const x1 = hl - 13, x0 = -hl + 3, per = v.cap / 2, step = (x1 - x0) / per;
  for (let i = 0; i < v.cap; i++) {
    const ci = Math.floor(i / 2);
    const x = x1 - (ci + 0.5) * step, y = i % 2 ? hw - 3.9 : -hw + 3.9;
    if (i < v.filled) {
      ctx.fillStyle = seatFill(v, i); rr(ctx, x - 2.4, y - 1.6, 4.8, 3.2, 1); ctx.fill();
      ctx.fillStyle = '#ffd9b8'; circ(ctx, x, y, 0.95); ctx.fill();
    } else {
      ctx.fillStyle = '#c7ecff'; rr(ctx, x - 2.4, y - 1.6, 4.8, 3.2, 1); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(20,30,60,0.55)'; ctx.lineWidth = 0.7; ctx.stroke();
  }
}

function rocketBody(hl, hw) {
  const bw = hw * 0.66;
  ctx.beginPath();
  ctx.moveTo(-hl + 3, -bw);
  ctx.lineTo(hl - hw * 1.3, -bw);
  ctx.quadraticCurveTo(hl - hw * 0.25, -bw * 0.9, hl, 0);
  ctx.quadraticCurveTo(hl - hw * 0.25, bw * 0.9, hl - hw * 1.3, bw);
  ctx.lineTo(-hl + 3, bw);
  ctx.quadraticCurveTo(-hl, bw, -hl, bw - 3);
  ctx.lineTo(-hl, -bw + 3);
  ctx.quadraticCurveTo(-hl, -bw, -hl + 3, -bw);
  ctx.closePath();
}
function drawRocket(v, col) {
  const hl = v.len / 2, hw = v.wid / 2, bw = hw * 0.66;
  if (v.state === 'moving' || v.state === 'leaving' || v.state === 'emerging') {
    const f = 8 + Math.sin(G.time * 40) * 2.5 + (v.state === 'leaving' ? 8 : 0);
    ctx.fillStyle = '#ff7a3d'; ctx.beginPath(); ctx.moveTo(-hl, -bw * 0.65); ctx.lineTo(-hl - f, 0); ctx.lineTo(-hl, bw * 0.65); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.moveTo(-hl, -bw * 0.35); ctx.lineTo(-hl - f * 0.55, 0); ctx.lineTo(-hl, bw * 0.35); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = col.dark;
  for (const sy of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-hl + 15, sy * bw); ctx.lineTo(-hl + 2, sy * hw); ctx.lineTo(-hl - 1.5, sy * hw); ctx.lineTo(-hl + 1, sy * bw * 0.4); ctx.closePath(); ctx.fill();
  }
  rocketBody(hl, hw); ctx.fillStyle = col.main; ctx.fill(); ctx.strokeStyle = col.dark; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(ctx, -hl + 3, -bw + 1.4, v.len - hw * 1.6, bw * 0.45, 2); ctx.fill();
  ctx.fillStyle = '#bfefff'; circ(ctx, hl - hw * 1.45, 0, bw * 0.5); ctx.fill();
  ctx.strokeStyle = col.dark; ctx.lineWidth = 1.2; ctx.stroke();
  drawSeats(v, -hl + 5, hl - hw * 1.45 - bw * 0.6, bw * 0.42, Math.min(2.6, bw * 0.38));
}

function drawBoat(v, col) {
  const hl = v.len / 2, hw = v.wid / 2, bow = v.wid * 0.9;
  ctx.fillStyle = '#3d4352'; ctx.fillRect(-hl - 4, -3, 5, 6);
  hullPath(hl, hw, bow); ctx.fillStyle = col.main; ctx.fill(); ctx.strokeStyle = col.dark; ctx.lineWidth = 1.5; ctx.stroke();
  hullPath(hl - 3.5, hw - 3.5, bow - 3); ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fill();
  ctx.strokeStyle = '#59c6ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(hl - bow * 0.55, 0, hw - 5, -1.1, 1.1); ctx.stroke();
  drawSeats(v, -hl + 6, hl - bow * 0.95, Math.min(5.4, hw - 6), 3.3);
}
function drawPlane(v, col) {
  const p = planePaths(v.len, v.wid);
  ctx.fillStyle = col.main; ctx.strokeStyle = col.dark; ctx.lineWidth = 1.3;
  p.wings(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4a4f63';
  rr(ctx, -v.len * 0.02, -p.hw * 0.62, 8, 4.5, 2); ctx.fill();
  rr(ctx, -v.len * 0.02, p.hw * 0.62 - 4.5, 8, 4.5, 2); ctx.fill();
  ctx.fillStyle = col.main; p.tail(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col.main; p.body(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(ctx, -p.hl + 3, -p.fh + 1.5, v.len - 8, p.fh * 0.6, 2); ctx.fill();
  ctx.fillStyle = '#22315e';
  ctx.beginPath(); ctx.moveTo(p.hl - 3, -p.fh * 0.55); ctx.quadraticCurveTo(p.hl + 0.5, 0, p.hl - 3, p.fh * 0.55); ctx.lineTo(p.hl - 6, p.fh * 0.5); ctx.lineTo(p.hl - 6, -p.fh * 0.5); ctx.closePath(); ctx.fill();
  drawSeats(v, -p.hl + 10, p.hl - 8, p.fh * 0.45, Math.min(2.8, p.fh * 0.42));
}

function rainbowGrad(x, y) {
  const g = ctx.createLinearGradient(-x, -y, x, y);
  RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
  return g;
}
function partyCol(x, y) { return { main: rainbowGrad(x, y), dark: '#6a2fb8', light: '#fff6c8' }; }

function drawVehicle(v) {
  const k = G.T.key;
  let col = v.revealed ? PAL[v.color] : MYST;
  let sc = 1, shOff = 3;
  if (v.lift && v.state === 'moving') { sc = 1.2; shOff = 14; }
  if (v.state === 'full') sc = 1 + 0.08 * Math.sin((0.3 - v.fullT) * 30);
  if (v.revealT > 0) sc *= 1 + 0.3 * Math.sin((1 - v.revealT / 0.5) * PI);
  if (v.unlockT > 0) sc *= 1 + 0.2 * Math.sin((1 - v.unlockT / 0.5) * PI);
  if ((k === 'plane' || k === 'space') && v.state === 'leaving') { sc = 1 + v.fly * 0.8; shOff = 4 + v.fly * 34; }
  if (v.appearT < 0.4) {
    if (v.appearT <= 0) return;
    sc *= easeBack(v.appearT / 0.4);
  }
  if (v.parkT > 0) sc *= 1 + 0.07 * Math.sin((1 - v.parkT / 0.35) * PI);
  if (v.pulse > 0) sc *= 1 + 0.06 * v.pulse;
  const wob = v.wobble > 0 ? Math.sin(G.time * 45) * 0.1 * v.wobble : 0;

  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.scale(sc, sc);
  // shadow
  ctx.save();
  ctx.translate(shOff * 0.6, shOff);
  ctx.rotate(v.ang + wob);
  ctx.fillStyle = k === 'boat' ? 'rgba(0,40,90,0.22)' : 'rgba(0,0,0,0.22)';
  silhouette(v); ctx.fill();
  ctx.restore();
  ctx.rotate(v.ang + wob);
  if (v.revealed && v.color === PARTY) col = partyCol(k === 'plane' ? 0 : v.len / 2, k === 'plane' ? v.wid / 2 : 0);
  if (k === 'bus') drawBus(v, col);
  else if (k === 'boat') drawBoat(v, col);
  else if (k === 'train') drawTrain(v, col);
  else if (k === 'space') drawRocket(v, col);
  else drawPlane(v, col);
  if (v.lock > 0) { ctx.fillStyle = 'rgba(40,30,70,0.25)'; silhouette(v); ctx.fill(); }
  ctx.restore();

  if (!v.revealed) {
    ctx.fillStyle = 'rgba(40,40,60,0.55)'; circ(ctx, v.x, v.y, 9); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '900 14px ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', v.x, v.y + 1);
  }
  if (v.lock > 0) {
    ctx.fillStyle = '#ffffff'; rr(ctx, v.x - 15, v.y - 9, 30, 18, 9); ctx.fill();
    ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '11px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(G.T.lockIcon, v.x - 6, v.y + 1);
    ctx.fillStyle = '#ff3d71'; ctx.font = '900 12px ui-rounded, system-ui, sans-serif';
    ctx.fillText(String(v.lock), v.x + 7, v.y + 1);
  }
  if (v.wrong >= 2 && (v.state === 'lot' || v.state === 'bump')) {
    ctx.font = '16px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚠️', v.x, v.y - 14 + Math.sin(G.time * 10) * 2);
  }
  if (v.lift && v.state === 'moving') {
    ctx.strokeStyle = 'rgba(60,60,80,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(v.x - 6, v.y - 4); ctx.lineTo(v.x, v.y - 34); ctx.lineTo(v.x + 6, v.y - 4); ctx.stroke();
    ctx.font = '26px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(G.T.lift[0], v.x, v.y - 44 + Math.sin(G.time * 20) * 1.5);
  }
}

const GARAGE_STYLE = {
  bus:   { roof: '#ff9f43', dark: '#c4651a', door: '#4a3b5c' },
  boat:  { roof: '#e7ad6e', dark: '#a8692f', door: '#5a3a1a' },
  plane: { roof: '#d5dbe8', dark: '#8e97ad', door: '#4a4f63' },
  train: { roof: '#c46a4a', dark: '#8a4630', door: '#3b2a24' },
  space: { roof: '#7c5cff', dark: '#4a33c9', door: '#140d36' },
};
function drawGarage(g) {
  const st = GARAGE_STYLE[G.T.key];
  const hl = g.len / 2, hw = g.wid / 2;
  const wob = g.wobble > 0 ? Math.sin(G.time * 45) * 0.05 * g.wobble : 0;
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.save(); ctx.translate(2, 4); ctx.rotate(g.ang); ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, -hl, -hw, g.len, g.wid, 6); ctx.fill(); ctx.restore();
  ctx.rotate(g.ang + wob);
  ctx.fillStyle = st.dark; rr(ctx, -hl, -hw, g.len, g.wid, 6); ctx.fill();
  ctx.fillStyle = st.roof; rr(ctx, -hl + 1, -hw + 1, g.len - 2, g.wid - 4, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1;
  for (let y = -hw + 5; y < hw - 4; y += 4) { ctx.beginPath(); ctx.moveTo(-hl + 3, y); ctx.lineTo(hl - 8, y); ctx.stroke(); }
  // roller door on the exit side: it rolls up while a vehicle drives out
  const open = g.doorT > 0 ? Math.sin(Math.min(1, g.doorT / 0.8) * PI) : 0;
  ctx.fillStyle = st.door; rr(ctx, hl - 6, -hw + 3, 6, g.wid - 7, 1.5); ctx.fill();
  if (open < 0.95) {
    ctx.fillStyle = '#e9e4f5';
    const dh = (g.wid - 7) * (1 - open);
    rr(ctx, hl - 5, -hw + 3, 4.5, dh, 1); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let y = -hw + 5; y < -hw + 3 + dh; y += 3) { ctx.beginPath(); ctx.moveTo(hl - 5, y); ctx.lineTo(hl - 0.5, y); ctx.stroke(); }
  }
  // arrow: which way they come out
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.moveTo(hl - 9, 0); ctx.lineTo(hl - 16, -5); ctx.lineTo(hl - 16, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  const n = g.queue.length;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (n) {
    const bx = g.x - Math.cos(g.ang) * 5, by = g.y - Math.sin(g.ang) * 5;
    ctx.fillStyle = '#ffffff'; circ(ctx, bx, by, 9); ctx.fill();
    ctx.strokeStyle = st.dark; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#5a2fd6'; ctx.font = '900 12px ui-rounded, system-ui, sans-serif';
    ctx.fillText(String(n), bx, by + 0.5);
    const next = g.queue[0];
    ctx.fillStyle = next.color === PARTY ? rainbowGrad(4, 0) : PAL[next.color].main;
    circ(ctx, bx + 8, by - 8, 4.5); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

function drawAsteroid(a) {
  const wob = a.wobble > 0 ? Math.sin(G.time * 45) * 2 * a.wobble : 0;
  ctx.save();
  ctx.translate(a.x + wob, a.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; circ(ctx, 8, 12, a.r * 0.85); ctx.fill();
  ctx.rotate(a.rot);
  ctx.beginPath();
  a.shape.forEach((k, i) => { const t = i / a.shape.length * TAU; ctx.lineTo(Math.cos(t) * a.r * k, Math.sin(t) * a.r * k); });
  ctx.closePath();
  ctx.fillStyle = '#9a8fb0'; ctx.fill();
  ctx.strokeStyle = '#5c5270'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = '#7a6f92';
  circ(ctx, -a.r * 0.3, -a.r * 0.2, a.r * 0.24); ctx.fill();
  circ(ctx, a.r * 0.35, a.r * 0.28, a.r * 0.16); ctx.fill();
  circ(ctx, a.r * 0.1, a.r * 0.45, a.r * 0.1); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; circ(ctx, -a.r * 0.35, -a.r * 0.4, a.r * 0.18); ctx.fill();
  ctx.restore();
}

function drawTunnels() {
  for (const side of [-1, 1]) {
    const x = side < 0 ? view.x0 : view.x1, y = RING.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-side, 1); // the mouth faces into the screen
    ctx.fillStyle = '#6fbf4f'; ctx.beginPath(); ctx.ellipse(-4, 0, 22, 24, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8f8a84'; rr(ctx, -2, -15, 12, 30, 5); ctx.fill();
    ctx.fillStyle = '#a9a39b';
    for (let k = -12; k < 13; k += 6) ctx.fillRect(7, k, 3, 4);
    ctx.fillStyle = '#16141c'; rr(ctx, -8, -11, 15, 22, 6); ctx.fill();
    ctx.restore();
  }
}

function drawWreck(w) {
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(w.ang);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, -w.len / 2 + 2, -w.wid / 2 + 3, w.len, w.wid, 6); ctx.fill();
  ctx.fillStyle = '#3b3340'; rr(ctx, -w.len / 2, -w.wid / 2, w.len, w.wid, 6); ctx.fill();
  ctx.fillStyle = '#5a4f60'; rr(ctx, -w.len / 2 + 5, -w.wid / 2 + 3, w.len * 0.4, w.wid * 0.45, 3); ctx.fill();
  ctx.fillStyle = '#2a2430'; rr(ctx, 2, -2, w.len * 0.35, w.wid * 0.5, 3); ctx.fill();
  ctx.restore();
  // flickering flames while it burns
  const k = clamp(w.t / 3, 0, 1);
  for (let i = 0; i < 4; i++) {
    const fx = w.x + Math.cos(i * 1.7) * 9, fy = w.y + Math.sin(i * 2.3) * 5;
    const h = (7 + Math.sin(G.time * 18 + i * 2) * 3) * k;
    if (h <= 0.5) continue;
    ctx.fillStyle = '#ff8c42'; ctx.beginPath(); ctx.ellipse(fx, fy - h * 0.4, h * 0.45, h * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.ellipse(fx, fy - h * 0.25, h * 0.22, h * 0.45, 0, 0, TAU); ctx.fill();
  }
}

function drawWalker(w) {
  const p = w.p;
  if (w.stage < 2) { drawPerson(p.x, p.y, p.c, p.skin, p.hair, Math.sin(p.walk * 18) * 1.2, 1); return; }
  const [doorX, doorY] = doorPos(w.v);
  if (!w.D) w.D = Math.max(1, Math.hypot(doorX - w.sx, doorY - w.sy));
  const t = clamp(1 - Math.hypot(doorX - p.x, doorY - p.y) / w.D, 0, 1);
  const hop = Math.abs(Math.sin(t * PI * 2)) * 6;
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 4.5 - hop * 0.3, 2, 0, 0, TAU); ctx.fill();
  drawPerson(p.x, p.y - hop, p.c, p.skin, p.hair, 0, 1);
}

function drawParticles() {
  for (const p of G.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.type === 'confetti' ? Math.min(1, a * 2) : a;
    if (p.type === 'confetti') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else if (p.type === 'star') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? p.size * 0.45 : p.size; const t = i * PI / 5; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
      ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (p.type === 'ring') {
      ctx.strokeStyle = p.color; ctx.lineWidth = 2.5;
      circ(ctx, p.x, p.y, p.size + (1 - a) * 16); ctx.stroke();
    } else if (p.type === 'puff') {
      ctx.fillStyle = p.color; circ(ctx, p.x, p.y, p.size + (1 - a) * p.grow); ctx.fill();
    } else {
      ctx.fillStyle = p.color; circ(ctx, p.x, p.y, p.size * a + 0.5); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of G.floats) {
    const a = clamp(f.life / f.max, 0, 1);
    ctx.globalAlpha = Math.min(1, a * 2);
    ctx.font = `900 ${f.size}px ui-rounded, system-ui, sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,20,110,0.75)'; ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawParty() {
  if (G.partyT <= 0) return;
  const a = Math.min(1, G.partyT / 1.2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cols = ['255,80,180', '60,220,255', '255,220,60'];
  for (let k = 0; k < 3; k++) {
    const t = G.time * 1.6 + k * TAU / 3;
    const x = 200 + Math.cos(t) * 140, y = 220 + Math.sin(t * 1.3) * 200;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, 210);
    gr.addColorStop(0, `rgba(${cols[k]},${0.22 * a})`);
    gr.addColorStop(1, `rgba(${cols[k]},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
  }
  ctx.restore();
}

let lastHint = null;
function drawTutorial() {
  const on = G.tutorial && G.hint && G.state === 'play' && !G.paused;
  const msg = on ? (G.taps === 0 ? '👆 Tap a vehicle with a clear path!' : '🎨 Match colours in the circle!') : '';
  if (msg !== lastHint) {
    lastHint = msg;
    const el = $('worldName');
    el.classList.toggle('hint', !!msg);
    el.textContent = msg || `${G.T.emoji} World ${G.cfg.world} · ${G.T.world}`;
  }
  if (!on) return;
  const v = G.hint;
  const b = Math.sin(G.time * 6) * 5;
  ctx.font = '34px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('👆', v.x + 8, v.y + 26 + b);
}

let lastFever = -1, lastPartyState = false;
function render() {
  if (!view) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (bgDirty) rebuildBg();
  ctx.drawImage(bgCanvas, 0, 0);
  if (!G) return;
  let sx = 0, sy = 0;
  if (G.shake > 0) { sx = rand(-3, 3) * G.shake / 0.22; sy = rand(-3, 3) * G.shake / 0.22; }
  const V = view;
  ctx.setTransform(V.dpr * V.scale, 0, 0, V.dpr * V.scale, V.dpr * (V.ox + sx), V.dpr * (V.oy + sy));
  drawLiveBg();
  drawQueue();
  for (const v of G.vehicles) if (v.state === 'emerging') drawVehicle(v);
  for (const g of G.garages) drawGarage(g);
  for (const v of G.vehicles) if (v.state === 'lot' || v.state === 'bump' || v.state === 'runaway') drawVehicle(v);
  for (const a of G.asteroids) if (a.active) drawAsteroid(a);
  for (const w of G.wrecks) drawWreck(w);
  for (const v of G.vehicles) if (v.state === 'bay' || v.state === 'full') drawVehicle(v);
  for (const v of G.vehicles) if (v.state === 'moving' && !v.lift) drawVehicle(v);
  if (G.liftMode) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + 0.08 * Math.sin(G.time * 8)) + ')';
    rr(ctx, LOT.x, LOT.y, LOT.w, LOT.h, 10); ctx.fill();
  }
  for (const w of G.walkers) drawWalker(w);
  for (const v of G.vehicles) if (v.state === 'leaving') drawVehicle(v);
  if (G.T.key === 'train') drawTunnels();
  for (const v of G.vehicles) if (v.state === 'moving' && v.lift) drawVehicle(v);
  drawParticles();
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(255,236,190,${G.flash * 2.4})`;
    ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
  }
  drawTutorial();
  drawParty();

  const party = G.partyT > 0;
  const fv = Math.round(party ? (G.partyT / 7) * 100 : G.fever);
  if (fv !== lastFever) { $('feverFill').style.width = clamp(fv, 0, 100) + '%'; lastFever = fv; }
  if (party !== lastPartyState) { $('fever').classList.toggle('party', party); lastPartyState = party; }
}

/* --------------------------------------------------------------------- UI */
let toastTimer = 0;
function toast(msg, secs = 1.4, big = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('big', big);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), secs * 1000);
}

function showModal(html, actions) {
  const card = $('modalCard');
  card.innerHTML = html + actions.map((a) => `<button class="btn ${a.cls || ''}" data-a="${a.id}">${a.label}</button>`).join('');
  $('modal').classList.remove('hidden');
  card.scrollTop = 0;
  card.querySelectorAll('button[data-a]').forEach((b) => {
    b.addEventListener('click', () => {
      Snd.unlock();
      const a = actions.find((x) => x.id === b.dataset.a);
      if (!a.keep) hideModal();
      if (a.fn) a.fn();
    });
  });
  return card;
}
function hideModal() { $('modal').classList.add('hidden'); }

function refreshHUD() {
  $('coinTxt').textContent = save.coins;
  $('menuCoins').textContent = save.coins;
  if (G) {
    $('lvlTitle').textContent = `Level ${G.level}` + (G.cfg.party ? ' 🎉' : '');
    $('worldName').textContent = `${G.T.emoji} World ${G.cfg.world} · ${G.T.world}`;
    lastHint = null;
    $('liftIcon').textContent = G.T.lift[0];
    $('liftLbl').textContent = G.T.lift[1];
  }
  for (const k of ['bay', 'lift', 'sort']) {
    const b = $('n_' + k), n = save.boost[k];
    if (n > 0) { b.textContent = n; b.classList.remove('price'); }
    else { b.textContent = PRICE[k] + '🪙'; b.classList.add('price'); }
  }
  $('b_lift').classList.toggle('active', !!(G && G.liftMode));
  $('btnSound').textContent = save.sound ? '🔊 Sound' : '🔇 Muted';
}

function showWin() {
  const n = G.level;
  const stars = G.crashes === 0 ? 3 : G.crashes <= 2 ? 2 : 1;
  const reward = 10 + stars * 5 + (G.cfg.party ? 10 : 0);
  save.coins += reward;
  save.stars[n] = Math.max(save.stars[n] || 0, stars);
  save.maxLevel = Math.max(save.maxLevel, n + 1);
  persist(); refreshHUD();
  const crashTxt = G.crashes === 0 ? 'No crashes — perfect driving!' : `${G.crashes} bump${G.crashes > 1 ? 's' : ''} along the way`;
  const nextCfg = levelConfig(n + 1);
  const nextTxt = nextCfg.theme !== G.cfg.theme ? `<div class="tip">Next stop: <b>${THEMES[nextCfg.theme].emoji} ${THEMES[nextCfg.theme].world}</b>!</div>` : '';
  showModal(`<div class="m-emoji">${pick(['🎉', '🥳', '🎊'])}</div><h2>Level ${n} Complete!</h2>
    <div class="stars">${'⭐'.repeat(stars)}${'<span class="dim">⭐</span>'.repeat(3 - stars)}</div>
    <p>${crashTxt}</p><p>+${reward + G.earned} 🪙 earned</p>${nextTxt}`,
    [{ id: 'next', label: `Next Level ▶`, fn: () => startLevel(n + 1) },
     { id: 'menu', label: 'Menu', cls: 'alt', fn: showMenu }]);
}

function lose() {
  G.state = 'lost'; G.liftMode = false;
  sfx.lose(); buzz([40, 40, 40]);
  persist(); refreshHUD();
  const n = G.level;
  const canBay = G.bays.length < MAX_BAYS && canAfford('bay');
  const acts = [];
  if (canBay) {
    acts.push({
      id: 'cont', cls: 'gold',
      label: save.boost.bay > 0 ? '🅿️ Extra bay & keep going' : `🅿️ Extra bay · ${PRICE.bay} 🪙`,
      fn: () => { pay('bay'); G.bays.push(null); G.state = 'play'; G.loseT = 0; sfx.bay(); refreshHUD(); },
    });
  }
  acts.push({ id: 'retry', label: '↻ Try again', cls: 'pink', fn: () => startLevel(n) });
  acts.push({ id: 'menu', label: 'Menu', cls: 'alt', fn: showMenu });
  showModal(`<div class="m-emoji">😱</div><h2>Traffic Jam!</h2><p>Every bay is full and nobody in the circle can get on.</p>
    <div class="tip">💡 Check the circle and the two lines before you tap.</div>`, acts);
}

function pauseGame() {
  if (!G || G.state !== 'play') return;
  G.paused = true;
  const n = G.level;
  const resume = () => { G.paused = false; };
  const card = showModal(`<h2>Paused</h2>`, [
    { id: 'resume', label: '▶ Resume', fn: resume },
    { id: 'restart', label: '↻ Restart level', cls: 'pink', fn: () => startLevel(n) },
    { id: 'sound', label: save.sound ? '🔊 Sound: On' : '🔇 Sound: Off', cls: 'alt', keep: true, fn: () => { save.sound = !save.sound; persist(); refreshHUD(); card.querySelector('[data-a=sound]').textContent = save.sound ? '🔊 Sound: On' : '🔇 Sound: Off'; } },
    { id: 'vib', label: save.vib ? '📳 Vibration: On' : '📴 Vibration: Off', cls: 'alt', keep: true, fn: () => { save.vib = !save.vib; persist(); card.querySelector('[data-a=vib]').textContent = save.vib ? '📳 Vibration: On' : '📴 Vibration: Off'; } },
    { id: 'menu', label: '🏠 Main menu', cls: 'alt', fn: showMenu },
  ]);
}

function showMenu() {
  hideModal();
  $('menu').classList.remove('hidden');
  if (G) G.paused = true;
  $('playLvl').textContent = `Level ${save.maxLevel} · ${THEMES[levelConfig(save.maxLevel).theme].emoji} ${THEMES[levelConfig(save.maxLevel).theme].world}`;
  refreshHUD();
}
function hideMenu() { $('menu').classList.add('hidden'); }

function showLevels() {
  const worlds = Math.max(THEME_ORDER.length, Math.ceil((save.maxLevel + 1) / 5));
  let html = '<h2>Levels</h2><div class="lvgrid">';
  for (let w = 0; w < worlds; w++) {
    const th = THEMES[THEME_ORDER[w % THEME_ORDER.length]];
    html += `<div class="lvworld">${th.emoji} World ${w + 1} · ${th.world}${w >= THEME_ORDER.length ? ' (Remix)' : ''}</div>`;
    for (let k = 1; k <= 5; k++) {
      const n = w * 5 + k, locked = n > save.maxLevel, st = save.stars[n] || 0;
      html += `<button class="lv ${locked ? 'locked' : ''} ${k === 5 ? 'partylv' : ''} ${n === save.maxLevel ? 'current' : ''}" data-lv="${n}" ${locked ? 'disabled' : ''}>${locked ? '🔒' : n}<small>${st ? '⭐'.repeat(st) : (k === 5 && !locked ? '🎉' : '')}</small></button>`;
    }
  }
  html += '</div>';
  const card = showModal(html, [{ id: 'close', label: 'Close', cls: 'alt' }]);
  card.querySelectorAll('.lv[data-lv]').forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    Snd.unlock();
    startLevel(+b.dataset.lv);
  }));
  setTimeout(() => { const cur = card.querySelector('.lv.current'); if (cur) cur.scrollIntoView({ block: 'center' }); }, 30);
}

/* ------------------------------------------------------------------ input */
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  Snd.unlock();
  if (!G || G.state !== 'play' || G.paused) return;
  const [x, y] = toWorld(e.clientX, e.clientY);
  handleTap(x, y);
});
$('btnPause').addEventListener('click', () => { Snd.unlock(); pauseGame(); });
$('b_bay').addEventListener('click', () => useBooster('bay'));
$('b_lift').addEventListener('click', () => useBooster('lift'));
$('b_sort').addEventListener('click', () => useBooster('sort'));
$('btnPlay').addEventListener('click', () => {
  Snd.unlock();
  if (G && G.level === save.maxLevel && G.state === 'play') { hideMenu(); G.paused = false; return; }
  startLevel(save.maxLevel);
});
$('btnLevels').addEventListener('click', () => { Snd.unlock(); showLevels(); });
$('btnSound').addEventListener('click', () => { save.sound = !save.sound; persist(); if (save.sound) { Snd.unlock(); sfx.coin(); } else Snd.sleep(); refreshHUD(); });

document.addEventListener('touchmove', (e) => {
  if (!e.target.closest || !e.target.closest('.card')) e.preventDefault();
}, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
['touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, () => Snd.unlock(), { passive: true }));
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) Snd.sleep();
  if (document.hidden && G && G.state === 'play' && !G.paused && $('modal').classList.contains('hidden')) pauseGame();
});

// Re-measure whenever the screen, HUD or booster bar actually change size. iOS home-screen
// apps can report the viewport and safe-area insets late, without a resize event.
let resizeQueued = false;
function scheduleLayout() {
  if (resizeQueued) return;
  resizeQueued = true;
  setTimeout(() => { resizeQueued = false; computeLayout(); }, 30);
}
window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', scheduleLayout);
window.addEventListener('pageshow', scheduleLayout);
if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleLayout);
if (window.ResizeObserver) {
  const ro = new ResizeObserver(scheduleLayout);
  [canvas, $('hud'), $('boosters')].forEach((el) => ro.observe(el));
}
[250, 1000, 2500].forEach((ms) => setTimeout(computeLayout, ms));

/* -------------------------------------------------------------- main loop */
let lastT = performance.now();
let layoutTick = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (++layoutTick % 30 === 0 && layoutKey() !== lastLayoutKey) computeLayout();
  if (G && !G.paused && $('menu').classList.contains('hidden')) update(dt);
  if ($('menu').classList.contains('hidden')) render();
  requestAnimationFrame(frame);
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
if (isIOS && !standalone) $('installHint').classList.remove('hidden');

computeLayout();
showMenu();
requestAnimationFrame(frame);

// handy for testing in the console
window.__lottie = {
  startLevel, levelConfig, generateLevel, getBlockers, handleTap, render, save,
  get G() { return G; }, get view() { return view; },
  step(secs) { for (let t = 0; t < secs; t += 1 / 60) if (G && !G.paused) update(1 / 60); render(); },
};
})();
