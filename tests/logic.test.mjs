import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, POINTS, slugify, clampStar, parseCoords, stopSummary, rankStops, computeScores, progress,
  evaluateAchievements, pickChallenge, projectStops, mapsLinks, photoFileName, ratingsToCsv, normalizeState,
  nextStop, isRatingComplete, parseBulkStops, placeLabels,
} from '../public/js/logic.js';
import { CHALLENGES, createInitialState } from '../public/js/data.js';

function baseState() {
  const s = createInitialState();
  s.players = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Rui' }];
  s.stops = [
    { id: 'a', name: 'Tasca A', address: '', lat: 41.14, lng: -8.61, note: '' },
    { id: 'b', name: 'Tasca B', address: '', lat: 41.15, lng: -8.62, note: '' },
    { id: 'c', name: 'Tasca C', address: '', lat: null, lng: null, note: '' },
  ];
  return s;
}
const full = (f, v, a, sv) => ({ food: f, value: v, ambience: a, service: sv });

test('slugify remove acentos e símbolos', () => {
  assert.equal(slugify('Tasca do Zé & Filhos'), 'tasca-do-ze-filhos');
  assert.equal(slugify('   '), 'paragem');
  assert.equal(slugify('Pão-de-Ló'), 'pao-de-lo');
});

test('clampStar só aceita 1..5', () => {
  assert.equal(clampStar(3), 3);
  assert.equal(clampStar('4'), 4);
  assert.equal(clampStar(0), null);
  assert.equal(clampStar(6), null);
  assert.equal(clampStar(null), null);
  assert.equal(clampStar('x'), null);
});

test('parseCoords: formatos comuns e inválidos', () => {
  assert.deepEqual(parseCoords('41.1496, -8.6074'), { lat: 41.1496, lng: -8.6074 });
  assert.deepEqual(parseCoords('41,1496 -8,6074'), { lat: 41.1496, lng: -8.6074 });
  assert.deepEqual(parseCoords('41.149600,-8.607400'), { lat: 41.1496, lng: -8.6074 });
  assert.equal(parseCoords(''), null);
  assert.equal(parseCoords('abc'), null);
  assert.equal(parseCoords('95, 10'), null);
  assert.equal(parseCoords('41.1, 200'), null);
  assert.equal(parseCoords('1, 2, 3'), null);
});

test('média e resumo por paragem', () => {
  const s = baseState();
  s.ratings.a = { p1: full(5, 4, 3, 4), p2: full(3, 4, 5, 4) };
  const sum = stopSummary(s, 'a');
  assert.equal(sum.overall, 4);
  assert.equal(sum.byCategory.food, 4);
  assert.equal(sum.byPlayer.p1, 4);
  assert.equal(sum.count, 8);
  assert.equal(stopSummary(s, 'b').overall, null);
});

test('avaliação parcial conta só os critérios preenchidos', () => {
  const s = baseState();
  s.ratings.a = { p1: { food: 5 } };
  const sum = stopSummary(s, 'a');
  assert.equal(sum.overall, 5);
  assert.equal(isRatingComplete(s.ratings.a.p1), false);
});

test('ranking ordena, desempata e partilha posições', () => {
  const s = baseState();
  s.ratings.a = { p1: full(4, 4, 4, 4), p2: full(4, 4, 4, 4) };
  s.ratings.b = { p1: full(5, 5, 5, 5), p2: full(5, 5, 5, 5) };
  s.ratings.c = { p1: full(4, 4, 4, 4), p2: full(4, 4, 4, 4) };
  const r = rankStops(s);
  assert.deepEqual(r.map((x) => x.stop.id), ['b', 'a', 'c']);
  assert.deepEqual(r.map((x) => x.position), [1, 2, 2]);
});

test('pontuações: visitas, fotografias (com limite), desafios e avaliações', () => {
  const s = baseState();
  s.visits.a = { arrivedAt: '2026-10-24T18:00:00Z' };
  s.visits.b = { arrivedAt: '2026-10-24T19:00:00Z' };
  s.ratings.a = { p1: full(5, 5, 5, 5), p2: { food: 4 } }; // p2 incompleta: sem pontos
  s.challenges.a = { status: 'done', points: 10, by: ['p1', 'p2'] };
  s.challenges.b = { status: 'done', points: 15, by: ['p2'] };
  const sc = computeScores(s, { a: 5, b: 1 }); // a limitada a 3 fotografias
  assert.equal(sc.players.p1.total, 5 + 10);
  assert.equal(sc.players.p2.total, 10 + 15);
  assert.equal(sc.team.visits, 2 * POINTS.visit);
  assert.equal(sc.team.photos, (3 + 1) * POINTS.photo);
  assert.equal(sc.team.total, 20 + 8 + 15 + 25);
  assert.equal(sc.leader, 'p2');
});

test('líder: empate', () => {
  const s = baseState();
  assert.equal(computeScores(s).leader, 'tie');
});

test('progresso e próxima paragem', () => {
  const s = baseState();
  s.visits.a = { arrivedAt: '2026-10-24T18:00:00Z' };
  assert.equal(nextStop(s).id, 'b');
  const p = progress(s, { a: 2 });
  assert.equal(p.visited, 1);
  assert.equal(p.total, 3);
  assert.equal(p.pct, 33);
  assert.equal(p.photos, 2);
  assert.equal(p.stopsWithPhotos, 1);
  s.visits.b = { arrivedAt: 'x' };
  s.visits.c = { arrivedAt: 'x' };
  assert.equal(nextStop(s), null);
});

test('conquistas desbloqueiam com as condições certas', () => {
  const s = baseState();
  let ach = Object.fromEntries(evaluateAchievements(s).map((a) => [a.id, a]));
  assert.equal(ach.first.unlocked, false);

  s.visits.a = { arrivedAt: '2026-10-24T18:00:00Z' };
  s.ratings.a = { p1: full(5, 4, 4, 4), p2: full(5, 4, 4, 5) };
  s.challenges.a = { status: 'done', points: 10, by: ['p1'] };
  ach = Object.fromEntries(evaluateAchievements(s, { a: 1 }).map((a) => [a.id, a]));
  assert.equal(ach.first.unlocked, true);
  assert.equal(ach.accepted.unlocked, true);
  assert.equal(ach.five.unlocked, true);
  assert.equal(ach.sync.unlocked, true);
  assert.equal(ach.half.unlocked, false); // 1 de 3 (precisa de 2)
  assert.equal(ach.fearless.unlocked, false);
  assert.equal(ach.fearless.value, 1);

  s.visits.b = { arrivedAt: 'x' };
  s.visits.c = { arrivedAt: 'x' };
  ach = Object.fromEntries(evaluateAchievements(s, { a: 1, b: 1, c: 3 }).map((a) => [a.id, a]));
  assert.equal(ach.all.unlocked, true);
  assert.equal(ach.album.unlocked, true);
  assert.equal(ach.reporter.unlocked, true);
});

test('"em sintonia" exige as duas avaliações completas', () => {
  const s = baseState();
  s.ratings.a = { p1: { food: 4 }, p2: { food: 4 } };
  const ach = Object.fromEntries(evaluateAchievements(s).map((a) => [a.id, a]));
  assert.equal(ach.sync.unlocked, false);
});

test('pickChallenge evita repetidos e recomeça quando esgota', () => {
  const pool = CHALLENGES;
  const used = new Set(pool.slice(1).map((c) => c.id));
  assert.equal(pickChallenge(pool, used, () => 0.99).id, pool[0].id);
  const all = new Set(pool.map((c) => c.id));
  assert.ok(pickChallenge(pool, all, () => 0.5));
  assert.equal(pickChallenge([], new Set()), null);
  assert.equal(pickChallenge(pool, new Set(), () => 0.9999999).id, pool[pool.length - 1].id);
});

test('desafios: ids únicos, pontos válidos, textos presentes', () => {
  const ids = CHALLENGES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of CHALLENGES) {
    assert.ok(c.title.length > 2 && c.text.length > 10, c.id);
    assert.ok([5, 10, 15, 20].includes(c.points), c.id);
  }
});

test('projectStops mantém as paragens dentro do mapa', () => {
  const s = baseState();
  const m = projectStops(s.stops, 360, 260, 34);
  assert.equal(m.size, 2); // a paragem C não tem coordenadas
  for (const { x, y } of m.values()) {
    assert.ok(x >= 33 && x <= 327 && y >= 33 && y <= 227, `${x},${y}`);
  }
  // A está a sul e a leste de B
  assert.ok(m.get('a').y > m.get('b').y);
  assert.ok(m.get('a').x > m.get('b').x);
});

test('projectStops com 1 paragem fica ao centro; sem coordenadas devolve vazio', () => {
  const one = [{ id: 'z', lat: 41.1, lng: -8.6 }];
  const m = projectStops(one, 360, 260);
  assert.deepEqual(m.get('z'), { x: 180, y: 130 });
  assert.equal(projectStops([{ id: 'q', lat: null, lng: null }], 360, 260).size, 0);
});

test('mapsLinks usa coordenadas ou pesquisa por nome/morada', () => {
  const withC = mapsLinks({ name: 'Tasca A', address: 'Rua X', lat: 41.14, lng: -8.61 });
  assert.match(withC.apple, /^https:\/\/maps\.apple\.com\/\?ll=41\.14,-8\.61&q=Tasca%20A$/);
  assert.match(withC.google, /query=41\.14%2C-8\.61$/);
  const noC = mapsLinks({ name: 'Tasca B', address: 'Rua Y, 1', lat: null, lng: null });
  assert.match(noC.apple, /q=Tasca%20B%2C%20Rua%20Y%2C%201$/);
});

test('nomes de ficheiros de fotografias', () => {
  assert.equal(photoFileName(1, { name: 'Casa do Bacalhau' }, 3, '2026-10-24T19:00:00.000Z'), '2026-10-24_02-casa-do-bacalhau_03.jpg');
});

test('CSV das avaliações escapa ; e aspas e usa vírgula decimal', () => {
  const s = baseState();
  s.stops[0].name = 'Tasca "A"; boa';
  s.ratings.a = { p1: { ...full(5, 4, 4, 4), comment: 'Muito bom;\nvoltar', at: '2026-10-24T18:00:00Z' } };
  const csv = ratingsToCsv(s);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], ['Paragem', 'Jogador', ...CATEGORIES.map((c) => c.label), 'Média', 'Comentário', 'Data'].join(';'));
  assert.ok(csv.includes('"Tasca ""A""; boa";Ana;5;4;4;4;4,25;"Muito bom;\nvoltar";2026-10-24T18:00:00Z'));
});

test('normalizeState limpa dados maliciosos ou corrompidos', () => {
  const dirty = {
    players: [{ id: 'p1', name: '  <b>Ana</b>  '.repeat(10) }, { id: 'p1', name: '' }],
    stops: [
      { id: 'x', name: 'Boa', lat: 41.1, lng: -8.6, address: 'Rua' },
      { id: 'x', name: 'Duplicada', lat: 999, lng: 0 },
      null,
    ],
    visits: { x: { arrivedAt: 'não é data' }, fantasma: { arrivedAt: '2026-10-24T18:00:00Z' } },
    challenges: { x: { status: 'done', points: 9999, by: ['p1', 'hacker'], title: 't' } },
    ratings: { x: { p1: { food: 9, value: '5', comment: 'ok' }, hacker: { food: 5 } }, fantasma: { p1: { food: 5 } } },
    settings: { hideInstallHint: 1 },
  };
  const s = normalizeState(dirty);
  assert.equal(s.players.length, 2);
  assert.notEqual(s.players[0].id, s.players[1].id);
  assert.ok(s.players[0].name.length <= 30);
  assert.equal(s.players[1].name, 'Jogador 2');
  assert.equal(s.stops.length, 3);
  assert.equal(new Set(s.stops.map((x) => x.id)).size, 3);
  assert.equal(s.stops[1].lat, null);
  assert.deepEqual(s.visits, {});
  assert.equal(s.challenges.x.points, 100);
  assert.deepEqual(s.challenges.x.by, ['p1']);
  assert.equal(s.ratings.x.p1.food, undefined);
  assert.equal(s.ratings.x.p1.value, 5);
  assert.equal(s.ratings.x.hacker, undefined);
  assert.equal(s.ratings.fantasma, undefined);
  assert.equal(s.settings.hideInstallHint, true);
  assert.throws(() => normalizeState(null));
  assert.throws(() => normalizeState([]));
});

test('normalizeState é idempotente', () => {
  const s = baseState();
  s.visits.a = { arrivedAt: '2026-10-24T18:00:00Z' };
  s.ratings.a = { p1: full(5, 4, 3, 2) };
  const once = normalizeState(s);
  const twice = normalizeState(once);
  assert.deepEqual(twice, once);
});

test('parseBulkStops: nome obrigatório, morada e coordenadas opcionais', () => {
  const r = parseBulkStops('Tasca do Zé | Rua das Flores 10\n\n  Casa Maria ; Bolhão ; 41.1496, -8.6074\n| só morada\nO Petisqueiro\r\nErrada | x | coordenadas más');
  assert.equal(r.length, 4);
  assert.deepEqual(r[0], { name: 'Tasca do Zé', address: 'Rua das Flores 10', lat: null, lng: null });
  assert.deepEqual(r[1], { name: 'Casa Maria', address: 'Bolhão', lat: 41.1496, lng: -8.6074 });
  assert.deepEqual(r[2], { name: 'O Petisqueiro', address: '', lat: null, lng: null });
  assert.equal(r[3].lat, null);
  assert.equal(parseBulkStops('').length, 0);
  assert.equal(parseBulkStops('x\n'.repeat(100)).length, 60);
});

test('placeLabels: nomes nunca se sobrepõem entre si nem a pinos, e cabem no mapa', () => {
  const stops = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, name: `Tasca número ${i + 1} do Porto`, lat: 41.14 + i * 0.0005, lng: -8.61 + (i % 3) * 0.0006 }));
  const pos = projectStops(stops, 360, 260, 40);
  const labels = placeLabels(stops, pos);
  const rects = [];
  for (const [id, l] of labels) {
    const p = pos.get(id);
    const w = l.text.length * 5.6 + 8;
    const r = { x1: p.x - w / 2, x2: p.x + w / 2, y1: p.y + l.dy - 10, y2: p.y + l.dy + 3 };
    assert.ok(r.x1 >= 2 && r.x2 <= 358 && r.y1 >= 2 && r.y2 <= 258, 'dentro do mapa');
    for (const q of rects) assert.ok(r.x2 < q.x1 || r.x1 > q.x2 || r.y2 < q.y1 || r.y1 > q.y2, 'sem sobreposição');
    rects.push(r);
  }
  // pinos bem espaçados: todos os nomes cabem
  const far = [{ id: 'a', name: 'Tasca A', lat: 41.14, lng: -8.62 }, { id: 'b', name: 'Tasca B', lat: 41.15, lng: -8.60 }];
  assert.equal(placeLabels(far, projectStops(far, 360, 260, 40)).size, 2);
  assert.equal(placeLabels([{ id: 'x', name: 'Um nome muito comprido para a caixa', lat: 41, lng: -8 }], projectStops([{ id: 'x', lat: 41, lng: -8 }], 360, 260)).get('x').text.endsWith('…'), true);
});
