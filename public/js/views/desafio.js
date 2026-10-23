/* Cartão de desafio de uma paragem: propor, começar, outro desafio, concluir, saltar.
 * Tudo local: o catálogo está em challenges.js e o progresso fica em state.challenges[stopId]. */
import { h, icon, toast } from '../ui.js';
import * as store from '../store.js';
import { session } from '../session.js';
import { CATS, getChallenge, mainChallenge, nextChallenge, usedChallengeIds, promptOptions } from '../challenges.js';
import { CHALLENGE_POINTS } from '../logic.js';

const FIRST = () => 0; // propostas determinísticas (a mesma em cada desenho do ecrã)

function playerName(state, id) {
  return state.players.find((p) => p.id === id)?.name || '?';
}

function newRecord(ch, seen, status = 'proposed') {
  return {
    v: 2, challengeId: ch.id, title: ch.title, text: ch.text, points: 0, status,
    revealedAt: new Date().toISOString(), doneAt: null, by: [],
    cat: ch.cat, scoring: ch.scoring || 'none', seen: [...new Set([...seen, ch.id])],
    winners: [], shown: false, sec: { i: 0, picks: [] },
  };
}

/* ---------- ações ---------- */

function proposalFor(state, st) {
  const rec = state.challenges[st.id];
  if (rec?.v === 2) return getChallenge(rec.challengeId) || { id: rec.challengeId, cat: rec.cat, title: rec.title, text: rec.text, scoring: rec.scoring };
  return mainChallenge(st, usedChallengeIds(state), FIRST);
}

function start(st, ch) {
  session.concluding = null;
  return store.update((s) => {
    const rec = s.challenges[st.id];
    if (rec?.v === 2 && rec.challengeId === ch.id) rec.status = 'started';
    else s.challenges[st.id] = newRecord(ch, rec?.v === 2 ? rec.seen : [], 'started');
    store.ensureVisited(st.id);
  });
}

function other(state, st, ch) {
  session.concluding = null;
  const rec = state.challenges[st.id];
  const seen = rec?.v === 2 ? rec.seen : [ch.id];
  const next = nextChallenge(st, { seen, used: usedChallengeIds(state), currentId: ch.id });
  return store.update((s) => {
    s.challenges[st.id] = newRecord(next, [...seen, ch.id], 'proposed');
  });
}

function skip(st) {
  session.concluding = null;
  return store.update((s) => { s.challenges[st.id].status = 'skipped'; });
}

function retry(st) {
  return store.update((s) => { s.challenges[st.id].status = 'started'; });
}

function finish(st, winners, extra) {
  session.concluding = null;
  return store.update((s) => {
    const rec = s.challenges[st.id];
    rec.status = 'done';
    rec.doneAt = new Date().toISOString();
    rec.winners = winners;
    if (extra) extra(s);
  }).then(() => toast('Desafio concluído (+1 ponto para o rally).', { ms: 2200 }));
}

function undo(st) {
  return store.update((s) => {
    const rec = s.challenges[st.id];
    rec.status = 'started';
    rec.doneAt = null;
    rec.winners = [];
    if (rec.scoring === 'compare' && s.summary) s.summary.compare = null;
  });
}

function conclude(state, st, rec, ch) {
  if (rec.scoring === 'compare') {
    const keys = ch.secret.compare;
    const pk = rec.sec.picks[0] || {};
    const picks = {};
    for (const p of state.players) if (Number.isInteger(pk[p.id])) picks[p.id] = keys[pk[p.id]];
    const vals = Object.values(picks);
    const winner = vals.length === state.players.length && vals.every((v) => v === vals[0]) ? vals[0] : 'empate';
    return finish(st, [], (s) => { (s.summary ||= { favorites: {}, best: null, compare: null }).compare = { winner, picks }; });
  }
  if (rec.scoring === 'none') return finish(st, []);
  session.concluding = st.id; // pergunta quem acertou / venceu
  return store.update(() => {});
}

/* ---------- blocos interativos ---------- */

function secretBlock(state, st, rec, ch) {
  const prompts = ch.secret.prompts;
  const i = Math.min(rec.sec.i, prompts.length - 1);
  const prompt = prompts[i];
  const opts = promptOptions(prompt, state.players);
  const pk = rec.sec.picks[i] || {};
  const turn = state.players.find((p) => !Number.isInteger(pk[p.id]));

  const setPick = (pid, idx) => store.update(() => {
    const live = store.get().challenges[st.id];
    while (live.sec.picks.length <= i) live.sec.picks.push({});
    live.sec.picks[i][pid] = idx;
  });

  const box = h('div', { class: 'secret' },
    h('p', { class: 'tiny muted' }, `Pergunta ${i + 1} de ${prompts.length}`),
    h('p', { class: 'secret-q' }, prompt.q));

  if (turn) {
    const scale = prompt.opts === 'scale10';
    box.append(
      h('p', { class: 'tiny muted' }, `Vez de ${turn.name}: escolhe em segredo (o outro não espreita).`),
      h('div', { class: `opt-grid ${scale ? 'scale' : ''}` },
        ...opts.map((label, idx) => h('button', { class: 'btn small', type: 'button', onclick: () => setPick(turn.id, idx) }, label)))
    );
  } else {
    const a = state.players.map((p) => pk[p.id]);
    const same = a[0] === a[1];
    const diff = prompt.opts === 'scale10' ? ` (diferença de ${Math.abs(a[0] - a[1])})` : '';
    box.append(
      h('div', { class: 'reveal fade-in' },
        ...state.players.map((p) => h('div', { class: 'reveal-col' }, h('span', { class: 'tiny muted' }, p.name), h('strong', null, opts[pk[p.id]])))),
      h('p', { class: 'tiny muted fade-in' }, same ? 'Coincidiram!' : `Escolhas diferentes${diff}.`),
      h('div', { class: 'row' },
        i < prompts.length - 1
          ? h('button', { class: 'btn small primary', type: 'button', onclick: () => store.update(() => { store.get().challenges[st.id].sec.i = i + 1; }) }, 'Pergunta seguinte')
          : h('span', { class: 'tiny muted grow' }, 'Fim das perguntas.'),
        h('button', { class: 'link-btn', type: 'button', onclick: () => store.update(() => { store.get().challenges[st.id].sec.picks[i] = {}; }) }, 'Refazer')
      )
    );
  }
  return box;
}

function riddleBlock(st, rec, ch) {
  const box = h('div', { class: 'secret' }, h('p', { class: 'secret-q' }, ch.riddle.q));
  if (rec.shown) box.append(h('p', { class: 'riddle-a fade-in' }, `Resposta: ${ch.riddle.a}`));
  else box.append(h('button', { class: 'btn small', type: 'button', onclick: () => store.update(() => { store.get().challenges[st.id].shown = true; }) }, 'Ver resposta'));
  return box;
}

function timerBlock(seconds) {
  const label = `Cronómetro ${seconds} s`;
  const btn = h('button', { class: 'btn small timer-btn', type: 'button' }, label);
  btn.addEventListener('click', () => {
    if (btn.dataset.running) return;
    btn.dataset.running = '1';
    const end = Date.now() + seconds * 1000;
    const tick = () => {
      const left = Math.ceil((end - Date.now()) / 1000);
      if (!btn.isConnected) { clearInterval(id); return; }
      if (left <= 0) {
        clearInterval(id);
        btn.textContent = 'Tempo!';
        btn.classList.add('timer-end');
        setTimeout(() => { if (btn.isConnected) { btn.textContent = label; btn.classList.remove('timer-end'); delete btn.dataset.running; } }, 2500);
      } else btn.textContent = `${left} s`;
    };
    const id = setInterval(tick, 250);
    tick();
  });
  return btn;
}

function concludeChooser(state, st, rec) {
  const names = state.players;
  const label = rec.scoring === 'guess' ? 'Quem acertou?' : 'Quem venceu?';
  const choices = rec.scoring === 'guess'
    ? [...names.map((p) => [p.name, [p.id]]), ['Os dois', names.map((p) => p.id)], ['Ninguém', []]]
    : [...names.map((p) => [p.name, [p.id]]), ['Empate', []]];
  return h('div', { class: 'chooser fade-in' },
    h('p', { class: 'tiny muted' }, `${label} (+${CHALLENGE_POINTS.individual} ponto individual; sem pontos por respostas pessoais)`),
    h('div', { class: 'row wrap' },
      ...choices.map(([text, ids]) => h('button', { class: 'btn small', type: 'button', onclick: () => finish(st, ids) }, text)),
      h('button', { class: 'link-btn', type: 'button', onclick: () => { session.concluding = null; store.update(() => {}); } }, 'Cancelar'))
  );
}

/* ---------- cartão (versão anterior: desafios sem catálogo) ---------- */

function legacyCard(state, st, rec) {
  const card = h('section', { class: 'card challenge' }, h('h2', null, 'Desafio'));
  card.append(h('div', { class: 'challenge-box' },
    h('div', { class: 'row between' }, h('strong', null, rec.title), rec.points ? h('span', { class: 'chip warn' }, `${rec.points} pts`) : null),
    h('p', null, rec.text)));
  if (rec.status === 'revealed') {
    const done = (ids) => store.update((s) => { const c = s.challenges[st.id]; c.status = 'done'; c.doneAt = new Date().toISOString(); c.by = ids; });
    card.append(
      h('p', { class: 'muted small' }, 'Quem cumpriu?'),
      h('div', { class: 'row wrap' },
        ...state.players.map((p) => h('button', { class: 'btn small', type: 'button', onclick: () => done([p.id]) }, p.name)),
        h('button', { class: 'btn small primary', type: 'button', onclick: () => done(state.players.map((p) => p.id)) }, 'Os dois')),
      h('div', { class: 'row' },
        h('button', { class: 'link-btn', type: 'button', onclick: () => store.update((s) => { s.challenges[st.id].status = 'skipped'; }) }, 'Saltar'),
        h('button', { class: 'link-btn', type: 'button', onclick: () => { const ch = mainChallenge(st, usedChallengeIds(state), FIRST); other(state, st, ch); } }, 'Outro desafio'))
    );
  } else if (rec.status === 'done') {
    card.append(h('div', { class: 'row between' },
      h('span', { class: 'state ok' }, icon('check', 14), `Cumprido por ${rec.by.map((id) => playerName(state, id)).join(' e ')}`),
      h('button', { class: 'link-btn', type: 'button', onclick: () => store.update((s) => { const c = s.challenges[st.id]; c.status = 'revealed'; c.by = []; c.doneAt = null; }) }, 'Desfazer')));
  } else {
    card.append(h('div', { class: 'row between' },
      h('span', { class: 'state' }, 'Saltado, sem penalização'),
      h('div', { class: 'row' },
        h('button', { class: 'link-btn', type: 'button', onclick: () => store.update((s) => { s.challenges[st.id].status = 'revealed'; }) }, 'Voltar a tentar'),
        h('button', { class: 'link-btn', type: 'button', onclick: () => other(state, st, getChallenge(rec.challengeId) || mainChallenge(st, new Set(), FIRST)) }, 'Outro desafio'))));
  }
  return card;
}

/* ---------- cartão ---------- */

export function challengeCard(state, st) {
  const rec = state.challenges[st.id];
  if (rec && rec.v !== 2) return legacyCard(state, st, rec);

  const ch = proposalFor(state, st);
  const status = rec?.status || 'proposed';
  const cat = CATS[ch.cat]?.label || '';
  const card = h('section', { class: `card challenge-card ${status}`, 'aria-label': 'Desafio' });

  card.append(h('div', { class: 'row between' },
    h('span', { class: 'eyebrow' }, cat || 'Desafio'),
    status === 'done' ? h('span', { class: 'state ok' }, icon('check', 14), 'Concluído')
      : status === 'skipped' ? h('span', { class: 'state' }, 'Saltado')
      : null));
  card.append(h('h3', { class: 'ch-title' }, ch.title), h('p', { class: 'small ch-text' }, ch.text));

  const active = status === 'started';
  if (active && ch.secret) card.append(secretBlock(state, st, rec, ch));
  if ((active || status === 'done') && ch.riddle) card.append(riddleBlock(st, rec, ch));
  if (active && ch.timer) card.append(h('div', { class: 'row' }, timerBlock(ch.timer)));

  if (status === 'done') {
    const w = rec.winners.map((id) => playerName(state, id));
    const summ = state.summary?.compare;
    const note = rec.scoring === 'compare'
      ? `Vencedor: ${summ?.winner === 'gazela' ? 'Gazela' : summ?.winner === 'republica' ? 'República dos Cachorros' : 'empate'}.`
      : w.length ? `Ponto individual: ${w.join(' e ')}.` : '';
    card.append(h('div', { class: 'row between visited-row fade-in' },
      h('span', { class: 'tiny' }, `+${CHALLENGE_POINTS.team} ponto para o rally. ${note}`),
      h('button', { class: 'link-btn', type: 'button', onclick: () => undo(st) }, 'Desfazer')));
    return card;
  }

  if (session.concluding === st.id && active) {
    card.append(concludeChooser(state, st, rec));
    return card;
  }

  const compareReady = rec?.scoring !== 'compare' || state.players.every((p) => Number.isInteger(rec.sec.picks[0]?.[p.id]));
  const buttons = [];
  if (status === 'skipped') buttons.push(h('button', { class: 'btn small primary', type: 'button', onclick: () => retry(st) }, 'Voltar a tentar'));
  else if (!active) buttons.push(h('button', { class: 'btn small primary', type: 'button', onclick: () => start(st, ch) }, 'Começar desafio'));
  else buttons.push(h('button', { class: 'btn small primary', type: 'button', disabled: !compareReady, onclick: () => conclude(state, st, rec, ch) }, 'Concluir desafio'));
  buttons.push(h('button', { class: 'btn small', type: 'button', onclick: () => other(state, st, ch) }, 'Outro desafio'));
  card.append(h('div', { class: 'row wrap' }, ...buttons,
    active ? h('button', { class: 'link-btn', type: 'button', onclick: () => skip(st) }, 'Saltar') : null));
  if (active && rec.scoring === 'compare' && !compareReady) card.append(h('p', { class: 'tiny muted' }, 'Escolham os dois para poderem concluir.'));
  return card;
}
