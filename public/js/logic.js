/* Lógica pura (sem DOM nem rede): pontuações, ranking, conquistas, mapa, validação.
 * É testada em Node (tests/logic.test.mjs). */

export const CATEGORIES = [
  { key: 'food', label: 'Comida', icon: '🍽️', hint: 'Sabor, tempero, ponto de cozedura' },
  { key: 'value', label: 'Qualidade/preço', icon: '💶', hint: 'Compensou o que pagámos?' },
  { key: 'ambience', label: 'Ambiente', icon: '🏮', hint: 'Espaço, música, vibe' },
  { key: 'service', label: 'Atendimento', icon: '🤝', hint: 'Simpatia e rapidez' },
];

export const POINTS = { visit: 10, rating: 5, photo: 2, photoCap: 3 };
export const SCHEMA_VERSION = 2;

/* ---------- utilitários ---------- */

export function uid(prefix = 'x') {
  let hex;
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    hex = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    hex = Math.random().toString(16).slice(2, 14).padEnd(12, '0');
  }
  return `${prefix}${hex}`;
}

export function slugify(text) {
  const s = String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || 'paragem';
}

export function clampStar(n) {
  if (n === null || n === undefined || n === '') return null;
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 1 && v <= 5 ? v : null;
}

export function average(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Aceita "41.1496, -8.6074" (Apple/Google Maps) ou "41,1496 -8,6074". Devolve {lat,lng} ou null. */
export function parseCoords(text) {
  let t = String(text ?? '').trim();
  if (!t) return null;
  if (!t.includes('.')) t = t.replace(/(\d),(\d)/g, '$1.$2'); // vírgula decimal
  const nums = t.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length !== 2) return null;
  const lat = Number(nums[0]);
  const lng = Number(nums[1]);
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return null;
  return { lat, lng };
}

/** Uma paragem por linha: "Nome | Morada | coordenadas (opcional)". Aceita | ou ; como separador. */
export function parseBulkStops(text) {
  const out = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split(/[|;]/).map((x) => x.trim());
    const name = parts[0].slice(0, 60);
    if (!name) continue;
    const c = parts[2] ? parseCoords(parts[2]) : null;
    out.push({ name, address: (parts[1] || '').slice(0, 120), lat: c ? c.lat : null, lng: c ? c.lng : null });
  }
  return out.slice(0, 60);
}

export function formatCoords(stop) {
  return Number.isFinite(stop?.lat) && Number.isFinite(stop?.lng) ? `${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}` : '';
}

export function hasCoords(stop) {
  return Number.isFinite(stop?.lat) && Number.isFinite(stop?.lng);
}

/* ---------- avaliações ---------- */

export function ratingValues(r) {
  return CATEGORIES.map((c) => clampStar(r?.[c.key])).filter((v) => v !== null);
}

export function isRatingComplete(r) {
  return !!r && CATEGORIES.every((c) => clampStar(r[c.key]) !== null);
}

export function stopSummary(state, stopId) {
  const ratings = state.ratings?.[stopId] || {};
  const byPlayer = {};
  const perCat = Object.fromEntries(CATEGORIES.map((c) => [c.key, []]));
  const all = [];
  for (const p of state.players) {
    const r = ratings[p.id];
    byPlayer[p.id] = average(ratingValues(r));
    for (const c of CATEGORIES) {
      const v = clampStar(r?.[c.key]);
      if (v !== null) {
        perCat[c.key].push(v);
        all.push(v);
      }
    }
  }
  return {
    overall: average(all),
    byCategory: Object.fromEntries(CATEGORIES.map((c) => [c.key, average(perCat[c.key])])),
    byPlayer,
    count: all.length,
  };
}

/** Ranking das paragens avaliadas (empates partilham a posição). */
export function rankStops(state) {
  const rows = state.stops
    .map((stop) => ({ stop, ...stopSummary(state, stop.id) }))
    .filter((r) => r.overall !== null);
  rows.sort(
    (a, b) =>
      b.overall - a.overall ||
      (b.byCategory.food ?? 0) - (a.byCategory.food ?? 0) ||
      a.stop.name.localeCompare(b.stop.name, 'pt')
  );
  let lastKey = null;
  let lastPos = 0;
  rows.forEach((row, i) => {
    const key = row.overall.toFixed(2);
    if (key !== lastKey) {
      lastPos = i + 1;
      lastKey = key;
    }
    row.position = lastPos;
  });
  return rows;
}

/* ---------- visitas, desafios, pontos ---------- */

export function isVisited(state, stopId) {
  return !!state.visits?.[stopId]?.arrivedAt;
}

export function nextStop(state) {
  return state.stops.find((s) => !isVisited(state, s.id)) || null;
}

export function computeScores(state, photoCounts = {}) {
  const players = {};
  for (const p of state.players) players[p.id] = { challenges: 0, ratings: 0, total: 0 };

  for (const stop of state.stops) {
    const rs = state.ratings?.[stop.id] || {};
    for (const p of state.players) if (isRatingComplete(rs[p.id])) players[p.id].ratings += POINTS.rating;
    const ch = state.challenges?.[stop.id];
    if (ch?.status === 'done') {
      for (const pid of ch.by || []) if (players[pid]) players[pid].challenges += Number(ch.points) || 0;
    }
  }
  for (const p of state.players) players[p.id].total = players[p.id].challenges + players[p.id].ratings;

  const visited = state.stops.filter((s) => isVisited(state, s.id)).length;
  const photoPts = state.stops.reduce((n, s) => n + Math.min(photoCounts[s.id] || 0, POINTS.photoCap) * POINTS.photo, 0);
  const team = {
    visits: visited * POINTS.visit,
    photos: photoPts,
    total: visited * POINTS.visit + photoPts + state.players.reduce((n, p) => n + players[p.id].total, 0),
  };

  const [a, b] = state.players;
  let leader = null;
  if (a && b) leader = players[a.id].total === players[b.id].total ? 'tie' : players[a.id].total > players[b.id].total ? a.id : b.id;
  return { players, team, leader };
}

export function progress(state, photoCounts = {}) {
  const total = state.stops.length;
  const visited = state.stops.filter((s) => isVisited(state, s.id)).length;
  const challenges = Object.values(state.challenges || {});
  const bothRated = state.stops.filter((s) =>
    state.players.every((p) => isRatingComplete(state.ratings?.[s.id]?.[p.id]))
  ).length;
  const photos = state.stops.reduce((n, s) => n + (photoCounts[s.id] || 0), 0);
  return {
    total,
    visited,
    pct: total ? Math.round((visited / total) * 100) : 0,
    challengesDone: challenges.filter((c) => c.status === 'done').length,
    challengesRevealed: challenges.filter((c) => c.status && c.status !== 'pending').length,
    ratedStops: bothRated,
    photos,
    stopsWithPhotos: state.stops.filter((s) => (photoCounts[s.id] || 0) > 0).length,
  };
}

/* ---------- conquistas ---------- */

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🥖', title: 'Primeira dentada', desc: 'Visitar a primeira paragem.', goal: () => 1, value: (c) => c.prog.visited },
  { id: 'half', icon: '🚶', title: 'A meio caminho', desc: 'Visitar metade das paragens.', goal: (c) => Math.max(1, Math.ceil(c.prog.total / 2)), value: (c) => c.prog.visited },
  { id: 'all', icon: '🏁', title: 'Rally completo', desc: 'Visitar todas as paragens.', goal: (c) => Math.max(1, c.prog.total), value: (c) => c.prog.visited },
  { id: 'reporter', icon: '📸', title: 'Repórter de tasca', desc: 'Tirar 5 fotografias.', goal: () => 5, value: (c) => c.prog.photos },
  { id: 'album', icon: '🖼️', title: 'Álbum completo', desc: 'Ter pelo menos uma fotografia em todas as paragens.', goal: (c) => Math.max(1, c.prog.total), value: (c) => c.prog.stopsWithPhotos },
  { id: 'accepted', icon: '🎁', title: 'Desafio aceite', desc: 'Cumprir o primeiro desafio surpresa.', goal: () => 1, value: (c) => c.prog.challengesDone },
  { id: 'fearless', icon: '🔥', title: 'Sem medo', desc: 'Cumprir 3 desafios surpresa.', goal: () => 3, value: (c) => c.prog.challengesDone },
  { id: 'critics', icon: '📝', title: 'Críticos gastronómicos', desc: 'Avaliarem os dois, por completo, 3 paragens.', goal: () => 3, value: (c) => c.prog.ratedStops },
  {
    id: 'sync', icon: '💞', title: 'Paladares em sintonia', desc: 'Numa paragem, médias dos dois com menos de 0,5 de diferença.', goal: () => 1,
    value: (c) => c.state.stops.filter((s) => {
      const [a, b] = c.state.players.map((p) => c.summaries[s.id]?.byPlayer[p.id]);
      return a != null && b != null && Math.abs(a - b) < 0.5 && isRatingComplete(c.state.ratings?.[s.id]?.[c.state.players[0].id]) && isRatingComplete(c.state.ratings?.[s.id]?.[c.state.players[1].id]);
    }).length,
  },
  {
    id: 'five', icon: '⭐', title: 'Cinco estrelas', desc: 'Uma paragem com 5 em comida dos dois.', goal: () => 1,
    value: (c) => c.state.stops.filter((s) => c.state.players.every((p) => clampStar(c.state.ratings?.[s.id]?.[p.id]?.food) === 5)).length,
  },
];

export function evaluateAchievements(state, photoCounts = {}) {
  const prog = progress(state, photoCounts);
  const summaries = Object.fromEntries(state.stops.map((s) => [s.id, stopSummary(state, s.id)]));
  const ctx = { state, prog, summaries };
  return ACHIEVEMENTS.map((a) => {
    const goal = a.goal(ctx);
    const value = Math.min(a.value(ctx), goal);
    return { id: a.id, icon: a.icon, title: a.title, desc: a.desc, goal, value, unlocked: value >= goal };
  });
}

/* ---------- desafios ---------- */

export function pickChallenge(pool, usedIds = new Set(), rnd = Math.random) {
  if (!pool.length) return null;
  const free = pool.filter((c) => !usedIds.has(c.id));
  const list = free.length ? free : pool;
  return list[Math.min(list.length - 1, Math.floor(rnd() * list.length))];
}

/* ---------- mapa e ligações ---------- */

/** Projeta as paragens com coordenadas num retângulo width x height (mantém proporções). */
export function projectStops(stops, width, height, pad = 34) {
  const pts = stops.filter(hasCoords);
  const out = new Map();
  if (!pts.length) return out;
  const lats = pts.map((s) => s.lat);
  const lngs = pts.map((s) => s.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const MIN_SPAN = 0.004; // ~400 m: evita zoom exagerado quando as paragens estão coladas
  const spanX = Math.max((maxLng - minLng) * kx, MIN_SPAN * kx);
  const spanY = Math.max(maxLat - minLat, MIN_SPAN);
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const cx = ((minLng + maxLng) / 2) * kx;
  const cy = (minLat + maxLat) / 2;
  for (const s of pts) {
    out.set(s.id, {
      x: width / 2 + (s.lng * kx - cx) * scale,
      y: height / 2 - (s.lat - cy) * scale,
    });
  }
  return out;
}

const overlaps = (a, b) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);

/** Escolhe, para cada pino, onde pôr o nome (por baixo ou por cima) sem tapar outros nomes ou pinos.
 *  Se não couber, fica sem nome no mapa (a lista por baixo tem todos). */
export function placeLabels(stops, pos, W = 360, H = 260) {
  const dots = [...pos.values()].map((p) => ({ x1: p.x - 15, x2: p.x + 15, y1: p.y - 15, y2: p.y + 15 }));
  const placed = [];
  const out = new Map();
  for (const st of stops) {
    const p = pos.get(st.id);
    if (!p) continue;
    const full = st.short || st.name;
    const text = full.length > 18 ? `${full.slice(0, 17)}…` : full;
    const w = text.length * 5.6 + 8;
    for (const dy of [29, -20]) {
      const r = { x1: p.x - w / 2, x2: p.x + w / 2, y1: p.y + dy - 10, y2: p.y + dy + 3 };
      const inside = r.x1 >= 2 && r.x2 <= W - 2 && r.y1 >= 2 && r.y2 <= H - 2;
      if (inside && !dots.some((d) => overlaps(r, d)) && !placed.some((q) => overlaps(r, q))) {
        placed.push(r);
        out.set(st.id, { text, dy });
        break;
      }
    }
  }
  return out;
}

/* Distância em linha reta (metros) entre duas paragens com coordenadas; null se faltarem. */
export function distanceM(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) return null;
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function formatDistance(m) {
  if (m === null || m === undefined) return '';
  if (m < 950) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export function mapsLinks(stop) {
  const q = [stop.name, stop.address].filter(Boolean).join(', ') || stop.name;
  if (hasCoords(stop)) {
    const ll = `${stop.lat},${stop.lng}`;
    return {
      apple: `https://maps.apple.com/?ll=${ll}&q=${encodeURIComponent(stop.name)}`,
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ll)}`,
    };
  }
  return {
    apple: `https://maps.apple.com/?q=${encodeURIComponent(q)}`,
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
  };
}

/* ---------- exportação ---------- */

export function photoFileName(stopIndex, stop, n, isoDate) {
  const day = String(isoDate || '').slice(0, 10) || 'sem-data';
  return `${day}_${String(stopIndex + 1).padStart(2, '0')}-${slugify(stop.name)}_${String(n).padStart(2, '0')}.jpg`;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ratingsToCsv(state) {
  const head = ['Paragem', 'Jogador', ...CATEGORIES.map((c) => c.label), 'Média', 'Comentário', 'Data'];
  const rows = [head];
  for (const stop of state.stops) {
    for (const p of state.players) {
      const r = state.ratings?.[stop.id]?.[p.id];
      if (!r) continue;
      const avg = average(ratingValues(r));
      rows.push([
        stop.name,
        p.name,
        ...CATEGORIES.map((c) => clampStar(r[c.key]) ?? ''),
        avg === null ? '' : avg.toFixed(2).replace('.', ','),
        r.comment || '',
        r.at || '',
      ]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

/* ---------- validação de dados importados ---------- */

const isoOrNull = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);
const str = (v, max) => String(v ?? '').trim().slice(0, max);

export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Dados inválidos.');

  const rawPlayers = Array.isArray(raw.players) ? raw.players.slice(0, 2) : [];
  const players = [0, 1].map((i) => ({
    id: str(rawPlayers[i]?.id || `p${i + 1}`, 20) || `p${i + 1}`,
    name: str(rawPlayers[i]?.name, 30) || `Jogador ${i + 1}`,
  }));
  if (players[0].id === players[1].id) players[1].id = `${players[0].id}_2`;
  const playerIds = new Set(players.map((p) => p.id));

  const seen = new Set();
  const stops = (Array.isArray(raw.stops) ? raw.stops : []).slice(0, 60).map((s) => {
    let id = str(s?.id, 40) || uid('s');
    while (seen.has(id)) id = uid('s');
    seen.add(id);
    const lat = typeof s?.lat === 'number' && s.lat >= -90 && s.lat <= 90 ? s.lat : null;
    const lng = typeof s?.lng === 'number' && s.lng >= -180 && s.lng <= 180 ? s.lng : null;
    const ok = lat !== null && lng !== null;
    return {
      id,
      name: str(s?.name, 60) || 'Paragem',
      address: str(s?.address, 120),
      lat: ok ? lat : null,
      lng: ok ? lng : null,
      note: str(s?.note, 300),
      example: !!s?.example,
      short: str(s?.short, 20),
      zone: str(s?.zone, 40),
      specialty: str(s?.specialty, 60),
      ask: str(s?.ask, 200),
      desc: str(s?.desc, 300),
      hours: str(s?.hours, 80),
      optional: !!s?.optional,
    };
  });

  const visits = {};
  const challenges = {};
  const ratings = {};
  for (const s of stops) {
    const arrivedAt = isoOrNull(raw.visits?.[s.id]?.arrivedAt);
    if (arrivedAt) visits[s.id] = { arrivedAt };

    const c = raw.challenges?.[s.id];
    if (c && typeof c === 'object' && ['revealed', 'done', 'skipped'].includes(c.status)) {
      challenges[s.id] = {
        challengeId: str(c.challengeId, 40),
        title: str(c.title, 80),
        text: str(c.text, 400),
        points: Math.max(0, Math.min(100, Math.round(Number(c.points) || 0))),
        status: c.status,
        revealedAt: isoOrNull(c.revealedAt),
        doneAt: isoOrNull(c.doneAt),
        by: (Array.isArray(c.by) ? c.by : []).filter((id) => playerIds.has(id)),
      };
    }

    const rs = raw.ratings?.[s.id];
    if (rs && typeof rs === 'object') {
      for (const p of players) {
        const r = rs[p.id];
        if (!r || typeof r !== 'object') continue;
        const clean = { comment: str(r.comment, 300), at: isoOrNull(r.at) };
        let any = !!clean.comment;
        for (const cat of CATEGORIES) {
          const v = clampStar(r[cat.key]);
          if (v !== null) { clean[cat.key] = v; any = true; }
        }
        if (any) (ratings[s.id] ||= {})[p.id] = clean;
      }
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: isoOrNull(raw.createdAt) || new Date().toISOString(),
    setupDone: !!raw.setupDone,
    players,
    stops,
    visits,
    challenges,
    ratings,
    settings: { hideInstallHint: !!raw.settings?.hideInstallHint },
  };
}
