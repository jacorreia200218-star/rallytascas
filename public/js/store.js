/* Estado em memória + persistência imediata em IndexedDB. */
import * as db from './db.js';
import { createInitialState } from './data.js';
import { normalizeState, uid, POINTS } from './logic.js';

let state = null;
let chain = Promise.resolve();
const listeners = new Set();
let lastError = null;

export function get() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function saveError() {
  return lastError;
}

function persist() {
  const snapshot = JSON.parse(JSON.stringify(state)); // cópia: a escrita é sequencial e assíncrona
  chain = chain
    .then(() => db.saveState(snapshot))
    .then(() => {
      lastError = null;
    })
    .catch((err) => {
      lastError = err;
      console.error('Falha ao guardar', err);
      listeners.forEach((fn) => fn({ type: 'save-error', error: err }));
    });
  return chain;
}

export async function init() {
  const stored = await db.loadState();
  if (stored) {
    state = normalizeState(stored);
    // setupDone é preservado por normalizeState; nada mais a migrar na versão 1
  } else {
    state = createInitialState();
    await db.saveState(JSON.parse(JSON.stringify(state)));
  }
  return state;
}

/** Aplica uma alteração e guarda. `silent` evita redesenhar (ex.: escrita de texto). */
export async function update(mutator, { silent = false } = {}) {
  mutator(state);
  const p = persist();
  if (!silent) listeners.forEach((fn) => fn({ type: 'update' }));
  await p;
}

export async function replaceState(next) {
  state = normalizeState(next);
  await persist();
  listeners.forEach((fn) => fn({ type: 'replace' }));
}

/* ---------- operações de domínio ---------- */

export function ensureVisited(stopId, now = new Date()) {
  if (!state.visits[stopId]?.arrivedAt) state.visits[stopId] = { arrivedAt: now.toISOString() };
}

export async function addStop(data) {
  const stop = { id: uid('s'), name: data.name, address: data.address || '', lat: data.lat ?? null, lng: data.lng ?? null, note: data.note || '', example: false };
  await update((s) => {
    s.stops.push(stop);
  });
  return stop;
}

export async function updateStop(id, patch) {
  await update((s) => {
    const st = s.stops.find((x) => x.id === id);
    if (st) Object.assign(st, patch, { example: false });
  });
}

export async function moveStop(id, dir) {
  await update((s) => {
    const i = s.stops.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.stops.length) return;
    [s.stops[i], s.stops[j]] = [s.stops[j], s.stops[i]];
  });
}

/** Remove a paragem e tudo o que lhe diz respeito (visita, desafio, avaliações). */
export async function removeStop(id) {
  await update((s) => {
    s.stops = s.stops.filter((x) => x.id !== id);
    delete s.visits[id];
    delete s.challenges[id];
    delete s.ratings[id];
  });
}

export async function removeExampleStops() {
  const ids = state.stops.filter((x) => x.example).map((x) => x.id);
  await update((s) => {
    s.stops = s.stops.filter((x) => !x.example);
    for (const id of ids) {
      delete s.visits[id];
      delete s.challenges[id];
      delete s.ratings[id];
    }
  });
  return ids;
}

/** Reinicia o rally: apaga visitas, desafios, avaliações (e fotografias, tratadas fora). */
export async function resetRally({ keepStops = true, keepPlayers = true } = {}) {
  const fresh = createInitialState();
  await update((s) => {
    s.visits = {};
    s.challenges = {};
    s.ratings = {};
    s.createdAt = new Date().toISOString();
    if (!keepStops) s.stops = fresh.stops;
    if (!keepPlayers) {
      s.players = fresh.players;
      s.setupDone = false;
    }
  });
}

export { POINTS };
