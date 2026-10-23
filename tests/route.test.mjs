import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE, seedStops, upgradeState, createInitialState } from '../public/js/data.js';
import { normalizeState, projectStops, spreadPositions, distanceM, formatDistance, hasCoords, mapsLinks, computeScores, SCHEMA_VERSION } from '../public/js/logic.js';

const ORDER = ['Cervejaria Gazela', 'Oficina dos Rissóis', 'Casa Guedes Tradicional', 'República dos Cachorros', 'Conga — Casa das Bifanas', 'Casa Portuguesa do Pastel de Bacalhau'];

test('percurso real: 6 paragens pela ordem otimizada, sem exemplos nem horários inventados', () => {
  const st = createInitialState().stops;
  assert.deepEqual(st.map((s) => s.name), ORDER);
  assert.deepEqual(st.map((s) => s.key), ['gazela', 'rissois', 'guedes', 'republica', 'conga', 'pastel']);
  assert.ok(st.every((s) => !s.example && hasCoords(s) && s.zone && s.specialty && s.ask && s.address));
  assert.ok(st.every((s) => s.hours === ''));
  assert.equal(new Set(st.map((s) => s.id)).size, 6);
  assert.equal(SCHEMA_VERSION, 3);
});

function total(order) { return order.slice(1).reduce((n, s, i) => n + distanceM(order[i], s), 0); }
function perms(a) { return a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])); }

test('a ordem é a mais curta (linha reta) com a Gazela em 1.º e o Pastel de Bacalhau no fim, e bate a ordem original', () => {
  const byKey = Object.fromEntries(ROUTE.map((r) => [r.key, r]));
  const mine = total(ROUTE);
  const best = Math.min(...perms(ROUTE.filter((r) => r.key !== 'gazela' && r.key !== 'pastel')).map((mid) => total([byKey.gazela, ...mid, byKey.pastel])));
  assert.ok(Math.abs(mine - best) < 1, `${mine} vs ${best}`);
  const original = total(['gazela', 'republica', 'guedes', 'conga', 'pastel', 'rissois'].map((k) => byKey[k]));
  assert.ok(mine < original * 0.7, `${mine} vs ${original}`);
  assert.equal(formatDistance(mine), '1,7 km');
});

test('normalizeState preserva os campos novos', () => {
  const s = normalizeState({ ...createInitialState(), stops: seedStops() });
  assert.equal(s.stops[0].zone, 'Batalha');
  assert.equal(s.stops[3].key, 'republica');
  assert.deepEqual(s.summary, { favorites: {}, best: null, compare: null });
});

function demoState() {
  const ex = ['Ribeira', 'Clérigos', 'Aliados', 'Bolhão', 'Cedofeita'].map((a, i) => ({ id: `old${i}`, name: `Paragem de exemplo ${i + 1}`, address: a, lat: 41.14, lng: -8.61, note: '', example: true }));
  return normalizeState({
    schemaVersion: 1, setupDone: true, players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }], stops: ex,
    visits: { old0: { arrivedAt: '2026-10-23T18:05:00.000Z' } },
    ratings: { old0: { p1: { food: 5, value: 4, ambience: 4, service: 5, at: '2026-10-23T18:30:00.000Z' } } },
    challenges: {}, settings: {},
  });
}

test('migração v1: exemplos → percurso real mantendo ids, visitas e avaliações', () => {
  const s = demoState();
  assert.equal(upgradeState(s), true);
  assert.deepEqual(s.stops.map((x) => x.name), ORDER);
  assert.deepEqual(s.stops.map((x) => x.id), ['old0', 'old1', 'old2', 'old3', 'old4', s.stops[5].id]);
  assert.ok(s.visits.old0 && s.ratings.old0.p1.food === 5);
  assert.equal(upgradeState(s), false, 'idempotente');
});

function v2State() {
  const mk = (id, name) => ({ id, name, address: '', lat: 41.14, lng: -8.61, note: '', example: false });
  return normalizeState({
    schemaVersion: 2, setupDone: true, players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }],
    stops: [mk('g', 'Cervejaria Gazela'), mk('d', 'Casa Guedes Tradicional'), mk('s', 'Café Santiago'), mk('c', 'Conga — Casa das Bifanas'), mk('b', 'Confeitaria do Bolhão')].map((x) => ({ ...x, hours: x.id === 'g' ? '12:00–22:30' : '' })),
    visits: { g: { arrivedAt: '2026-10-23T18:05:00.000Z' }, s: { arrivedAt: '2026-10-23T19:05:00.000Z' }, c: { arrivedAt: '2026-10-23T19:35:00.000Z' } },
    ratings: { g: { p1: { food: 5, at: '2026-10-23T18:30:00.000Z' } } },
    challenges: { c: { challengeId: 'c05', title: 'Pose de crítico', text: 'x', points: 5, status: 'done', by: ['p1'] } },
    settings: {},
  });
}

test('migração v2: 5 → 6 paragens, reaproveita Gazela/Guedes/Conga e nunca perde registos', () => {
  const s = v2State();
  assert.equal(upgradeState(s), true);
  assert.deepEqual(s.stops.slice(0, 6).map((x) => x.name), ORDER);
  const id = (n) => s.stops.find((x) => x.name === n)?.id;
  assert.equal(id('Cervejaria Gazela'), 'g');
  assert.equal(id('Casa Guedes Tradicional'), 'd');
  assert.equal(id('Conga — Casa das Bifanas'), 'c');
  assert.equal(s.stops[0].hours, '12:00–22:30', 'mantém o que o utilizador escreveu');
  assert.equal(s.stops.length, 7, 'Café Santiago tem visita → mantém-se no fim; Bolhão (sem registos) sai');
  assert.equal(s.stops[6].id, 's');
  assert.ok(!s.stops.some((x) => x.id === 'b'));
  assert.ok(s.visits.g && s.visits.s && s.visits.c);
  assert.equal(s.challenges.c.status, 'done');
  assert.equal(computeScores(s).players.p1.challenges, 5, 'pontos antigos mantêm-se');
  assert.equal(upgradeState(s), false, 'idempotente');
});

test('migração não toca em roteiros editados', () => {
  const s = v2State();
  s.stops[1].name = 'A minha tasca';
  assert.equal(upgradeState(s), false);
  assert.equal(s.stops.length, 5);
});

test('distância em linha reta e ligações de mapas', () => {
  const d = distanceM(ROUTE[0], ROUTE[1]);
  assert.ok(d > 350 && d < 400, `Gazela→Rissóis ≈ ${d}`);
  assert.equal(distanceM(ROUTE[0], { lat: null, lng: null }), null);
  assert.equal(formatDistance(1234), '1,2 km');
  assert.match(mapsLinks(ROUTE[4]).apple, /ll=41\.1489414,-8\.6093776/);
});

test('mapa: marcadores nunca ficam sobrepostos (Rissóis e Casa Guedes estão a ~30 m)', () => {
  const stops = createInitialState().stops;
  const pos = spreadPositions(projectStops(stops, 360, 236, 44), 30, 360, 236);
  const pts = [...pos.values()];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    assert.ok(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) >= 29, `${i}-${j}`);
  }
  assert.ok(pts.every((p) => p.x >= 0 && p.x <= 360 && p.y >= 0 && p.y <= 236));
});
