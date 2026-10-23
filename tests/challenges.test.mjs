import test from 'node:test';
import assert from 'node:assert/strict';
import { CATS, STOP_CHALLENGES, GENERAL, ALL, getChallenge, mainChallenge, nextChallenge, usedChallengeIds, promptOptions } from '../public/js/challenges.js';
import { ROUTE, createInitialState } from '../public/js/data.js';
import { normalizeState, computeScores, progress } from '../public/js/logic.js';

test('catálogo: ids únicos, 8 categorias, cada paragem com principal + ≥2 alternativas', () => {
  assert.equal(new Set(ALL.map((c) => c.id)).size, ALL.length);
  assert.equal(Object.keys(CATS).length, 8);
  const used = new Set(ALL.map((c) => c.cat));
  for (const k of Object.keys(CATS)) assert.ok(used.has(k), `categoria sem desafios: ${k}`);
  for (const r of ROUTE) assert.ok((STOP_CHALLENGES[r.key] || []).length >= 3, r.key);
  for (const c of ALL) assert.ok(CATS[c.cat] && c.title && c.text && ['none', 'guess', 'gastro', 'compare'].includes(c.scoring), c.id);
  assert.ok(GENERAL.length >= 20);
});

test('desafios principais são os pedidos', () => {
  const t = (k) => STOP_CHALLENGES[k][0].title;
  assert.equal(t('gazela'), 'Críticos gastronómicos');
  assert.equal(t('republica'), 'Gazela vs. República');
  assert.equal(t('guedes'), 'Quem é mais provável?');
  assert.equal(t('conga'), 'Escolha impossível');
  assert.equal(t('pastel'), 'MasterChef a dois');
  assert.equal(t('rissois'), 'Adivinha o recheio');
  assert.equal(getChallenge('rp1').scoring, 'compare');
  assert.equal(getChallenge('gd1').secret.prompts.length, 4);
  assert.equal(getChallenge('cg1').secret.prompts.length, 3);
});

test('perguntas secretas bem formadas', () => {
  const players = [{ name: 'Ana' }, { name: 'Rui' }];
  for (const c of ALL.filter((x) => x.secret)) for (const p of c.secret.prompts) {
    const o = promptOptions(p, players);
    assert.ok(o.length >= 2, c.id);
  }
  assert.deepEqual(promptOptions({ opts: 'players' }, players), ['Ana', 'Rui']);
  assert.equal(promptOptions({ opts: 'scale10' }, players).length, 11);
});

test('“Outro desafio” nunca repete o atual, usa primeiro as alternativas da paragem e depois gerais sem repetir', () => {
  const stop = { key: 'gazela' };
  const seen = [];
  let cur = mainChallenge(stop, new Set(), () => 0);
  assert.equal(cur.id, 'gz1');
  const order = [cur.id];
  for (let i = 0; i < 12; i++) {
    seen.push(cur.id);
    const n = nextChallenge(stop, { seen, used: new Set(), currentId: cur.id }, () => 0.3);
    assert.notEqual(n.id, cur.id);
    assert.ok(!seen.includes(n.id), 'sem repetições enquanto houver alternativas');
    order.push(n.id); cur = n;
  }
  assert.deepEqual(order.slice(0, 4), ['gz1', 'gz2', 'gz3', 'gz4']);
  assert.ok(GENERAL.some((g) => g.id === order[4]));
});

test('perguntas já usadas noutras paragens não voltam a sair', () => {
  const state = createInitialState();
  state.challenges.x = { challengeId: 'g01', seen: ['g02', 'c01'] };
  const used = usedChallengeIds(state);
  for (let i = 0; i < 30; i++) {
    const n = nextChallenge({ key: 'gazela' }, { seen: ['gz1', 'gz2', 'gz3', 'gz4'], used, currentId: 'gz4' }, () => i / 30);
    assert.ok(!used.has(n.id));
  }
});

function withDone(rec) {
  const s = createInitialState();
  s.players = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Rui' }];
  s.challenges[s.stops[0].id] = { v: 2, challengeId: 'gz2', title: 'x', text: 'y', points: 0, status: 'done', cat: 'adivinha', scoring: 'guess', seen: ['gz2'], winners: ['p1'], sec: { i: 0, picks: [] }, ...rec };
  return normalizeState(s);
}

test('pontuação: concluir = 1 ponto do rally; acertar/vencer = 1 ponto individual; conversa não dá pontos', () => {
  const s = withDone({});
  const sc = computeScores(s);
  assert.equal(sc.team.challenges, 1);
  assert.equal(sc.players.p1.challenges, 1);
  assert.equal(sc.players.p2.challenges, 0);
  const none = computeScores(withDone({ winners: [], scoring: 'none' }));
  assert.equal(none.team.challenges, 1);
  assert.equal(none.players.p1.challenges + none.players.p2.challenges, 0);
  assert.equal(progress(s).challengesDone, 1);
});

test('normalizeState valida registos de desafio e resumo', () => {
  const s = createInitialState();
  s.players = [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Rui' }];
  const id = s.stops[3].id;
  s.challenges[id] = { v: 2, challengeId: 'rp1', title: 't', text: 'x', status: 'started', scoring: 'compare', seen: ['rp1', 7], winners: ['p1', 'zzz'], shown: 1, sec: { i: 99, picks: [{ p1: 0, p2: 1, zzz: 3 }, { p1: 'a', p2: 55 }] } };
  s.summary = { favorites: { p1: id, p2: 'nao-existe', zzz: id }, best: 'nada', compare: { winner: 'republica', picks: { p1: 'gazela', p2: 'x' } } };
  const n = normalizeState(s);
  const r = n.challenges[id];
  assert.deepEqual(r.winners, ['p1']);
  assert.equal(r.sec.i, 12);
  assert.deepEqual(r.sec.picks, [{ p1: 0, p2: 1 }, {}]);
  assert.deepEqual(r.seen, ['rp1', '7']);
  assert.deepEqual(n.summary, { favorites: { p1: id }, best: null, compare: { winner: 'republica', picks: { p1: 'gazela' } } });
  s.challenges[id].status = 'lixo';
  assert.equal(normalizeState(s).challenges[id], undefined);
});
