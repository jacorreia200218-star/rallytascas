/* Ecrã de uma paragem: chegada, desafio surpresa, fotografias e avaliações. */
import { h, pageHeader, toast, plural, formatTime, formatScore, starInput, starText } from '../ui.js';
import * as store from '../store.js';
import { session } from '../session.js';
import { CHALLENGES } from '../data.js';
import { CATEGORIES, POINTS, isVisited, mapsLinks, pickChallenge, stopSummary, isRatingComplete } from '../logic.js';
import { openStopForm } from './roteiro.js';
import { thumbGrid, WHERE_NOTE } from './galeria.js';

function playerName(state, id) {
  return state.players.find((p) => p.id === id)?.name || '?';
}

/* ---------- chegada ---------- */

function arrivalCard(state, st) {
  const visited = isVisited(state, st.id);
  const links = mapsLinks(st);
  const card = h('section', { class: 'card' });
  if (!visited) {
    card.append(
      h('p', { class: 'muted' }, 'Quando chegarem, toquem aqui para começar esta paragem.'),
      h('button', { class: 'btn primary block big', type: 'button', onclick: () => store.update((s) => store.ensureVisited(st.id)) }, `📍 Chegámos! (+${POINTS.visit} pts)`)
    );
  } else {
    card.append(
      h('div', { class: 'row between' },
        h('span', { class: 'chip ok' }, `✓ Chegada às ${formatTime(state.visits[st.id].arrivedAt)}`),
        h('button', { class: 'link-btn', type: 'button', onclick: () => store.update((s) => { delete s.visits[st.id]; }) }, 'Desfazer')
      )
    );
  }
  if (st.address) card.append(h('p', { class: 'stop-addr' }, st.address));
  if (st.note) card.append(h('p', { class: 'note-text' }, st.note));
  card.append(h('div', { class: 'row wrap' },
    h('a', { class: 'btn small', href: links.apple, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir no Mapas'),
    h('a', { class: 'btn small ghost', href: links.google, target: '_blank', rel: 'noopener noreferrer' }, 'Google Maps'),
    h('button', { class: 'btn small ghost', type: 'button', onclick: () => openStopForm({ stop: st }) }, '✎ Editar')
  ));
  return card;
}

/* ---------- desafio surpresa ---------- */

function revealChallenge(stopId) {
  const s = store.get();
  const used = new Set(Object.values(s.challenges).map((c) => c.challengeId));
  const c = pickChallenge(CHALLENGES, used);
  session.justRevealed = stopId;
  return store.update((st) => {
    store.ensureVisited(stopId);
    st.challenges[stopId] = {
      challengeId: c.id, title: c.title, text: c.text, points: c.points,
      status: 'revealed', revealedAt: new Date().toISOString(), doneAt: null, by: [],
    };
  });
}

function challengeCard(state, st) {
  const ch = state.challenges[st.id];
  const card = h('section', { class: 'card challenge' }, h('h2', null, '🎁 Desafio surpresa'));

  if (!ch) {
    card.append(
      h('p', { class: 'muted' }, 'Só se revela quando estiverem no sítio. É opcional: se não se adequar (alergias, preferências), passem à frente.'),
      h('button', { class: 'btn accent block big', type: 'button', onclick: () => revealChallenge(st.id) }, 'Revelar desafio')
    );
    return card;
  }

  const pop = session.justRevealed === st.id;
  if (pop) session.justRevealed = null;
  const box = h('div', { class: `challenge-box ${pop ? 'pop' : ''} ${ch.status}` },
    h('div', { class: 'row between' }, h('strong', null, ch.title), h('span', { class: 'chip warn' }, `${ch.points} pts`)),
    h('p', null, ch.text)
  );
  card.append(box);

  if (ch.status === 'revealed') {
    const done = (ids) => store.update((s) => {
      const c = s.challenges[st.id];
      c.status = 'done'; c.doneAt = new Date().toISOString(); c.by = ids;
    });
    card.append(
      h('p', { class: 'muted small' }, 'Quem cumpriu?'),
      h('div', { class: 'row wrap' },
        ...state.players.map((p) => h('button', { class: 'btn small', type: 'button', onclick: () => done([p.id]) }, p.name)),
        h('button', { class: 'btn small primary', type: 'button', onclick: () => done(state.players.map((p) => p.id)) }, 'Os dois')),
      h('button', { class: 'link-btn', type: 'button', onclick: () => store.update((s) => { s.challenges[st.id].status = 'skipped'; }) }, 'Passar este desafio')
    );
  } else if (ch.status === 'done') {
    card.append(h('div', { class: 'row between' },
      h('span', { class: 'chip ok' }, `✓ Cumprido por ${ch.by.map((id) => playerName(state, id)).join(' e ')} (+${ch.points} pts cada)`),
      h('button', { class: 'link-btn', type: 'button', onclick: () => store.update((s) => { const c = s.challenges[st.id]; c.status = 'revealed'; c.by = []; c.doneAt = null; }) }, 'Desfazer')
    ));
  } else if (ch.status === 'skipped') {
    card.append(h('div', { class: 'row between' },
      h('span', { class: 'chip' }, 'Desafio ignorado'),
      h('button', { class: 'link-btn', type: 'button', onclick: () => store.update((s) => { s.challenges[st.id].status = 'revealed'; }) }, 'Voltar a tentar')
    ));
  }
  return card;
}

/* ---------- fotografias ---------- */

function photosCard({ state, photos }, st) {
  const list = photos.forStop(st.id);
  const camId = `cam-${st.id}`;
  const libId = `lib-${st.id}`;

  async function handle(input) {
    const files = [...input.files];
    input.value = '';
    if (!files.length) return;
    toast(files.length > 1 ? `A guardar ${files.length} fotografias…` : 'A guardar fotografia…', { ms: 1800 });
    let saved = 0;
    for (const f of files) {
      try { await photos.add(st.id, f); saved += 1; } catch (err) { console.error(err); toast('Não foi possível guardar uma fotografia (sem espaço?).'); }
    }
    if (saved) {
      await store.update(() => store.ensureVisited(st.id));
      toast(`${plural(saved, 'fotografia guardada', 'fotografias guardadas')} na app (só neste telemóvel). Para as ter em Fotografias, exporta.`, { ms: 5200 });
    }
  }

  const camera = h('input', { id: camId, class: 'visually-hidden', type: 'file', accept: 'image/*', capture: 'environment', onchange: (e) => handle(e.target) });
  const library = h('input', { id: libId, class: 'visually-hidden', type: 'file', accept: 'image/*', multiple: true, onchange: (e) => handle(e.target) });

  return h('section', { class: 'card' },
    h('h2', null, '📷 Fotografias'),
    h('div', { class: 'row wrap' },
      h('label', { class: 'btn primary', for: camId }, 'Tirar fotografia'),
      h('label', { class: 'btn', for: libId }, 'Escolher da biblioteca'),
      camera, library),
    list.length ? thumbGrid({ list, state, photos }) : h('p', { class: 'muted' }, 'Ainda sem fotografias nesta paragem.'),
    h('p', { class: 'muted small' }, `${WHERE_NOTE} (+${POINTS.photo} pts por fotografia, até ${POINTS.photoCap} por paragem.)`)
  );
}

/* ---------- avaliações ---------- */

function setRating(stopId, pid, key, value) {
  return store.update((s) => {
    store.ensureVisited(stopId);
    const byPlayer = (s.ratings[stopId] ||= {});
    const r = (byPlayer[pid] ||= {});
    if (value === null) delete r[key]; else r[key] = value;
    r.at = new Date().toISOString();
    const hasAny = CATEGORIES.some((c) => r[c.key] !== undefined) || r.comment;
    if (!hasAny) delete byPlayer[pid];
    if (!Object.keys(byPlayer).length) delete s.ratings[stopId];
  });
}

function ratingCard(state, st) {
  const players = state.players;
  if (!players.some((p) => p.id === session.ratingPlayer)) session.ratingPlayer = players[0].id;
  const pid = session.ratingPlayer;
  const r = state.ratings[st.id]?.[pid] || {};
  const sum = stopSummary(state, st.id);

  const card = h('section', { class: 'card' }, h('h2', null, '⭐ Avaliação'));
  card.append(h('div', { class: 'segmented', role: 'tablist', 'aria-label': 'Quem avalia' },
    ...players.map((p) => {
      const complete = isRatingComplete(state.ratings[st.id]?.[p.id]);
      return h('button', {
        type: 'button', role: 'tab', 'aria-selected': String(p.id === pid), class: `seg ${p.id === pid ? 'on' : ''}`,
        onclick: () => { session.ratingPlayer = p.id; store.update(() => {}); },
      }, p.name, complete ? ' ✓' : '');
    })
  ));

  for (const c of CATEGORIES) {
    card.append(h('div', { class: 'rate-row' },
      h('div', { class: 'rate-label' }, h('span', { 'aria-hidden': 'true' }, c.icon), ' ', h('strong', null, c.label), h('span', { class: 'muted small' }, c.hint)),
      starInput({ value: r[c.key] ?? null, label: `${c.label} — ${playerName(state, pid)}`, onChange: (v) => setRating(st.id, pid, c.key, v) })
    ));
  }

  const comment = h('textarea', {
    rows: '2', maxlength: '300', placeholder: `Comentário de ${playerName(state, pid)} (opcional)`, 'aria-label': 'Comentário',
    onchange: (e) => {
      const text = e.target.value.trim().slice(0, 300);
      store.update((s) => {
        const byPlayer = (s.ratings[st.id] ||= {});
        const rr = (byPlayer[pid] ||= {});
        if (text) rr.comment = text; else delete rr.comment;
        if (!CATEGORIES.some((c) => rr[c.key] !== undefined) && !rr.comment) delete byPlayer[pid];
        if (!Object.keys(byPlayer).length) delete s.ratings[st.id];
      }, { silent: true });
    },
  }, r.comment || '');
  card.append(comment);

  card.append(h('div', { class: 'summary' },
    sum.overall !== null
      ? h('div', null, h('strong', null, `Média da paragem ${formatScore(sum.overall)}`), ' ', h('span', { class: 'stars-static', 'aria-hidden': 'true' }, starText(sum.overall)),
        h('div', { class: 'muted small' }, players.map((p) => `${p.name}: ${formatScore(sum.byPlayer[p.id])}`).join(' · ')))
      : h('div', { class: 'muted' }, 'Ainda sem avaliações.'),
    h('div', { class: 'muted small' }, `Avaliação completa (4 critérios) vale +${POINTS.rating} pts a quem avalia.`)
  ));
  return card;
}

/* ---------- vista ---------- */

export function renderParagem({ state, photos }, { id }) {
  const idx = state.stops.findIndex((s) => s.id === id);
  if (idx < 0) {
    return h('div', { class: 'view' }, pageHeader({ title: 'Paragem não encontrada', back: '#/' }),
      h('div', { class: 'content' }, h('div', { class: 'card center' }, h('p', null, 'Esta paragem já não existe.'), h('a', { class: 'btn primary', href: '#/' }, 'Voltar ao roteiro'))));
  }
  const st = state.stops[idx];
  const prev = state.stops[idx - 1];
  const next = state.stops[idx + 1];

  const content = h('div', { class: 'content' },
    arrivalCard(state, st),
    challengeCard(state, st),
    photosCard({ state, photos }, st),
    ratingCard(state, st),
    h('nav', { class: 'row between pager', 'aria-label': 'Outras paragens' },
      prev ? h('a', { class: 'btn small ghost', href: `#/paragem/${prev.id}` }, `‹ ${prev.name}`) : h('span'),
      next ? h('a', { class: 'btn small', href: `#/paragem/${next.id}` }, `${next.name} ›`) : h('span'))
  );

  return h('div', { class: 'view' },
    pageHeader({ title: st.name, subtitle: `Paragem ${idx + 1} de ${state.stops.length}`, back: '#/' }),
    content
  );
}
