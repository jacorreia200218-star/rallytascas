import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE, seedStops, upgradeState, createInitialState } from '../public/js/data.js';
import { normalizeState, distanceM, formatDistance, hasCoords, mapsLinks, SCHEMA_VERSION } from '../public/js/logic.js';

const ORDER = ['Cervejaria Gazela', 'Casa Guedes Tradicional', 'Café Santiago', 'Conga — Casa das Bifanas', 'Confeitaria do Bolhão'];

test('percurso real: 5 paragens pela ordem pedida, sem exemplos', () => {
  const st = createInitialState().stops;
  assert.deepEqual(st.map((s) => s.name), ORDER);
  assert.ok(st.every((s) => !s.example && hasCoords(s) && s.zone && s.specialty && s.ask && s.address));
  assert.equal(new Set(st.map((s) => s.id)).size, 5);
  assert.equal(st[2].optional, true);
  assert.ok(st.every((s) => s.hours === ''), 'horários nunca inventados');
});

test('normalizeState preserva os campos novos', () => {
  const s = normalizeState({ ...createInitialState(), stops: seedStops() });
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.stops[0].zone, 'Batalha');
  assert.equal(s.stops[1].short, 'Casa Guedes');
});

function oldState() {
  const ex = ['Ribeira', 'Clérigos', 'Aliados', 'Bolhão', 'Cedofeita'].map((a, i) => ({ id: `old${i}`, name: `Paragem de exemplo ${i + 1}`, address: a, lat: 41.14, lng: -8.61, note: '', example: true }));
  return normalizeState({
    schemaVersion: 1, setupDone: true, players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }], stops: ex,
    visits: { old0: { arrivedAt: '2026-10-23T18:05:00.000Z' } },
    ratings: { old0: { p1: { food: 5, value: 4, ambience: 4, service: 5, at: '2026-10-23T18:30:00.000Z' } } },
    challenges: {}, settings: {},
  });
}

test('migração v1→v2: troca exemplos pelo percurso real mantendo ids, visitas e avaliações', () => {
  const s = oldState();
  assert.equal(upgradeState(s), true);
  assert.deepEqual(s.stops.map((x) => x.name), ORDER);
  assert.deepEqual(s.stops.map((x) => x.id), ['old0', 'old1', 'old2', 'old3', 'old4']);
  assert.ok(s.visits.old0 && s.ratings.old0.p1.food === 5);
  assert.equal(upgradeState(s), false, 'idempotente');
});

test('migração não toca em roteiros já editados', () => {
  const s = oldState();
  s.stops[1].example = false;
  s.stops[1].name = 'A minha tasca';
  assert.equal(upgradeState(s), false);
  assert.equal(s.stops[1].name, 'A minha tasca');
});

test('migração nunca apaga paragens extra com registos', () => {
  const s = oldState();
  s.stops.push({ ...s.stops[0], id: 'old5', name: 'Extra' }, { ...s.stops[0], id: 'old6', name: 'Extra 2' });
  s.visits.old5 = { arrivedAt: '2026-10-23T19:00:00.000Z' };
  upgradeState(s);
  assert.deepEqual(s.stops.map((x) => x.id), ['old0', 'old1', 'old2', 'old3', 'old4', 'old5']);
});

test('distância em linha reta e ligações de mapas', () => {
  const d = distanceM(ROUTE[0], ROUTE[1]);
  assert.ok(d > 300 && d < 400, `Gazela→Guedes ≈ ${d}`);
  assert.equal(distanceM(ROUTE[0], { lat: null, lng: null }), null);
  assert.equal(formatDistance(d), '370 m');
  assert.equal(formatDistance(1234), '1,2 km');
  const l = mapsLinks(ROUTE[3]);
  assert.match(l.apple, /ll=41\.1489414,-8\.6093776/);
});
