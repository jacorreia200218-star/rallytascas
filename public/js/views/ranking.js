/* Ranking das paragens, duelo entre jogadores, conquistas e progresso. */
import { h, icon, pageHeader, progressBar, formatScore, starText, plural } from '../ui.js';
import * as store from '../store.js';
import { session } from '../session.js';
import { CHALLENGE_POINTS, isVisited, CATEGORIES, POINTS, rankStops, computeScores, progress, evaluateAchievements } from '../logic.js';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function progressLine(label, value, total) {
  const pct = total ? (value / total) * 100 : 0;
  return h('div', { class: 'prog-line' },
    h('div', { class: 'row between' }, h('span', null, label), h('strong', null, `${value}/${total}`)),
    progressBar(pct, label));
}

function progressCard(state, counts) {
  const p = progress(state, counts);
  return h('section', { class: 'card' },
    h('h2', null, 'Progresso'),
    progressLine('Paragens visitadas', p.visited, p.total),
    progressLine('Desafios cumpridos', p.challengesDone, p.total),
    progressLine('Paragens avaliadas pelos dois', p.ratedStops, p.total),
    progressLine('Paragens com fotografia', p.stopsWithPhotos, p.total),
    h('p', { class: 'muted small' }, `${plural(p.photos, 'fotografia', 'fotografias')} no total.`)
  );
}

function stopsTab(state) {
  const rows = rankStops(state);
  if (!rows.length) {
    return h('div', { class: 'card center' }, h('h2', null, 'Ainda sem avaliações'),
      h('p', { class: 'muted' }, 'Avaliem as paragens (comida, qualidade/preço, ambiente e atendimento) para ver o ranking.'),
      h('a', { class: 'btn primary', href: '#/' }, 'Ir para o roteiro'));
  }
  return h('div', { class: 'stack' }, ...rows.map((r) => {
    const bars = CATEGORIES.map((c) => {
      const v = r.byCategory[c.key];
      const fill = h('div', { class: 'bar-fill' });
      fill.style.width = `${v === null ? 0 : (v / 5) * 100}%`;
      return h('div', { class: 'bar-row' },
        h('span', { class: 'bar-label' }, c.label),
        h('div', { class: 'bar', 'aria-hidden': 'true' }, fill),
        h('span', { class: 'bar-val' }, formatScore(v)));
    });
    return h('a', { class: 'rank-card', href: `#/paragem/${r.stop.id}` },
      h('div', { class: 'rank-head' },
        h('span', { class: 'medal', 'aria-label': `Posição ${r.position}` }, MEDALS[r.position] || `${r.position}.`),
        h('span', { class: 'grow' }, h('span', { class: 'stop-name' }, r.stop.name),
          h('span', { class: 'muted small' }, state.players.map((p) => `${p.name} ${formatScore(r.byPlayer[p.id])}`).join(' · '))),
        h('span', { class: 'score' }, h('strong', null, formatScore(r.overall)), h('span', { class: 'stars-static', 'aria-hidden': 'true' }, starText(r.overall)))),
      h('div', { class: 'bars' }, ...bars));
  }));
}

function duelTab(state, counts) {
  const sc = computeScores(state, counts);
  const [a, b] = state.players;
  const banner = sc.leader === 'tie'
    ? 'Empate técnico'
    : `${state.players.find((p) => p.id === sc.leader).name} está na frente`;

  const col = (p) => h('div', { class: `duel-col ${sc.leader === p.id ? 'lead' : ''}` },
    h('div', { class: 'duel-name' }, p.name),
    h('div', { class: 'duel-total' }, String(sc.players[p.id].total)),
    h('div', { class: 'muted small' }, 'pontos'),
    h('div', { class: 'duel-detail' }, `Desafios ${sc.players[p.id].challenges}`),
    h('div', { class: 'duel-detail' }, `Avaliações ${sc.players[p.id].ratings}`));

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, 'Duelo'), h('h2', null, banner),
      h('div', { class: 'duel' }, col(a), h('div', { class: 'duel-vs', 'aria-hidden': 'true' }, 'vs'), col(b)),
      h('p', { class: 'muted small' }, `Desafios: +${CHALLENGE_POINTS.individual} por adivinha certa ou prova vencida. Avaliações completas: +${POINTS.rating} cada.`)),
    h('section', { class: 'card' },
      h('h2', null, 'Pontos da equipa'),
      h('div', { class: 'row between' }, h('span', null, `Paragens visitadas (+${POINTS.visit} cada)`), h('strong', null, String(sc.team.visits))),
      h('div', { class: 'row between' }, h('span', null, `Desafios concluídos (+${CHALLENGE_POINTS.team} cada)`), h('strong', null, String(sc.team.challenges))),
      h('div', { class: 'row between' }, h('span', null, `Fotografias (+${POINTS.photo} cada, até ${POINTS.photoCap} por paragem)`), h('strong', null, String(sc.team.photos))),
      h('div', { class: 'row between total' }, h('span', null, 'Total do rally'), h('strong', null, String(sc.team.total))))
  );
}

function stopSelect({ label, value, options, onChange }) {
  const sel = h('select', { 'aria-label': label, onchange: (e) => onChange(e.target.value || null) },
    h('option', { value: '' }, 'Por escolher'),
    ...options.map((o) => h('option', { value: o.id, selected: o.id === value }, o.label)));
  return h('label', { class: 'field' }, h('span', null, label), sel);
}

function summaryTab(state, counts) {
  const sc = computeScores(state, counts);
  const prog = progress(state, counts);
  const sm = state.summary || { favorites: {}, best: null, compare: null };
  const visited = state.stops.filter((s) => isVisited(state, s.id));
  const stopOpts = (list) => list.map((s) => ({ id: s.id, label: s.short || s.name }));
  const doneStops = state.stops.filter((s) => state.challenges[s.id]?.status === 'done');
  const bestOpts = doneStops.map((s) => ({ id: s.id, label: `${state.challenges[s.id].title} · ${s.short || s.name}` }));
  const cmp = sm.compare;
  const cmpText = !cmp ? 'Ainda por decidir' : cmp.winner === 'gazela' ? 'Gazela' : cmp.winner === 'republica' ? 'República dos Cachorros' : 'Empate';
  const row = (k, v) => h('div', { class: 'row between' }, h('span', { class: 'muted' }, k), h('strong', null, v));

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, 'Resumo do rally'),
      row('Paragens visitadas', `${prog.visited} de ${prog.total}`),
      row('Desafios concluídos', `${prog.challengesDone} de ${prog.total}`),
      ...state.players.map((p) => row(`Pontos individuais · ${p.name}`, String(sc.players[p.id].challenges))),
      h('p', { class: 'tiny muted' }, 'Pontos individuais dos desafios: só adivinhas certas e provas vencidas. Conversas e memórias não dão pontos.')),
    h('section', { class: 'card' },
      h('h2', null, 'Os vossos favoritos'),
      ...state.players.map((p) => stopSelect({
        label: `Snack favorito de ${p.name}`, value: sm.favorites[p.id] || '', options: stopOpts(visited),
        onChange: (v) => store.update((s) => { const x = (s.summary ||= { favorites: {}, best: null, compare: null }); if (v) x.favorites[p.id] = v; else delete x.favorites[p.id]; }),
      })),
      stopSelect({
        label: 'Melhor desafio da noite', value: sm.best || '', options: bestOpts,
        onChange: (v) => store.update((s) => { (s.summary ||= { favorites: {}, best: null, compare: null }).best = v; }),
      }),
      !visited.length ? h('p', { class: 'tiny muted' }, 'Os favoritos aparecem à medida que visitam paragens.') : null,
      !bestOpts.length ? h('p', { class: 'tiny muted' }, 'O melhor desafio pode ser escolhido depois de concluírem pelo menos um.') : null),
    h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, 'Gazela vs. República dos Cachorros'),
      h('h2', null, cmpText),
      h('p', { class: 'tiny muted' }, 'Decide-se no desafio “Gazela vs. República”, na paragem da República dos Cachorros.'))
  );
}

function achievementsTab(state, counts) {
  const list = evaluateAchievements(state, counts);
  const unlocked = list.filter((a) => a.unlocked).length;
  return h('div', { class: 'stack' },
    h('p', { class: 'muted' }, `${unlocked} de ${list.length} conquistas desbloqueadas.`),
    h('div', { class: 'achievements' }, ...list.map((a) => h('div', { class: `ach ${a.unlocked ? 'on' : ''}` },
      h('div', { class: 'ach-icon', 'aria-hidden': 'true' }, a.unlocked ? a.icon : '🔒'),
      h('div', { class: 'grow' },
        h('strong', null, a.title, a.unlocked ? h('span', { class: 'sr-only' }, ' (desbloqueada)') : null),
        h('div', { class: 'muted small' }, a.desc),
        a.unlocked ? null : h('div', { class: 'ach-prog' }, progressBar((a.value / a.goal) * 100, a.title), h('span', { class: 'muted small' }, `${a.value}/${a.goal}`)))
    )))
  );
}

export function renderRanking({ state, photos }) {
  const counts = photos.counts();
  const tabs = [
    { id: 'paragens', label: 'Paragens' },
    { id: 'duelo', label: 'Duelo' },
    { id: 'conquistas', label: 'Conquistas' },
    { id: 'resumo', label: 'Resumo' },
  ];
  if (!tabs.some((t) => t.id === session.rankingTab)) session.rankingTab = 'paragens';

  const seg = h('div', { class: 'segmented', role: 'tablist', 'aria-label': 'Secções do ranking' },
    ...tabs.map((t) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(session.rankingTab === t.id), class: `seg ${session.rankingTab === t.id ? 'on' : ''}`,
      onclick: () => { session.rankingTab = t.id; store.update(() => {}); },
    }, t.label)));

  const body = session.rankingTab === 'duelo' ? duelTab(state, counts) : session.rankingTab === 'conquistas' ? achievementsTab(state, counts) : session.rankingTab === 'resumo' ? summaryTab(state, counts) : stopsTab(state);

  return h('div', { class: 'view' },
    pageHeader({ title: 'Ranking', subtitle: `${computeScores(state, counts).team.total} pts da equipa` }),
    h('div', { class: 'content' }, progressCard(state, counts), seg, body));
}
