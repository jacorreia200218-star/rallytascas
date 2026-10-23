/* Ranking das paragens, duelo entre jogadores, conquistas e progresso. */
import { h, pageHeader, progressBar, formatScore, starText, plural } from '../ui.js';
import * as store from '../store.js';
import { session } from '../session.js';
import { CATEGORIES, POINTS, rankStops, computeScores, progress, evaluateAchievements } from '../logic.js';

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
    ? 'Empate técnico! 🤝'
    : `${state.players.find((p) => p.id === sc.leader).name} está na frente 🏆`;

  const col = (p) => h('div', { class: `duel-col ${sc.leader === p.id ? 'lead' : ''}` },
    h('div', { class: 'duel-name' }, p.name),
    h('div', { class: 'duel-total' }, String(sc.players[p.id].total)),
    h('div', { class: 'muted small' }, 'pontos'),
    h('div', { class: 'duel-detail' }, `🎁 ${sc.players[p.id].challenges}`),
    h('div', { class: 'duel-detail' }, `⭐ ${sc.players[p.id].ratings}`));

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, 'Duelo'), h('h2', null, banner),
      h('div', { class: 'duel' }, col(a), h('div', { class: 'duel-vs', 'aria-hidden': 'true' }, 'vs'), col(b)),
      h('p', { class: 'muted small' }, `🎁 desafios cumpridos · ⭐ avaliações completas (+${POINTS.rating} cada).`)),
    h('section', { class: 'card' },
      h('h2', null, 'Pontos da equipa'),
      h('div', { class: 'row between' }, h('span', null, `Paragens visitadas (+${POINTS.visit} cada)`), h('strong', null, String(sc.team.visits))),
      h('div', { class: 'row between' }, h('span', null, `Fotografias (+${POINTS.photo} cada, até ${POINTS.photoCap} por paragem)`), h('strong', null, String(sc.team.photos))),
      h('div', { class: 'row between total' }, h('span', null, 'Total do rally'), h('strong', null, String(sc.team.total))))
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
  ];
  if (!tabs.some((t) => t.id === session.rankingTab)) session.rankingTab = 'paragens';

  const seg = h('div', { class: 'segmented', role: 'tablist', 'aria-label': 'Secções do ranking' },
    ...tabs.map((t) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(session.rankingTab === t.id), class: `seg ${session.rankingTab === t.id ? 'on' : ''}`,
      onclick: () => { session.rankingTab = t.id; store.update(() => {}); },
    }, t.label)));

  const body = session.rankingTab === 'duelo' ? duelTab(state, counts) : session.rankingTab === 'conquistas' ? achievementsTab(state, counts) : stopsTab(state);

  return h('div', { class: 'view' },
    pageHeader({ title: 'Ranking', subtitle: `${computeScores(state, counts).team.total} pts da equipa` }),
    h('div', { class: 'content' }, progressCard(state, counts), seg, body));
}
