/* Fotografias do rally: guardadas SÓ na base de dados local desta app (IndexedDB).
 * Isto NÃO é a biblioteca "Fotografias" do iPhone; para lá chegarem é preciso exportar. */
import * as db from './db.js';
import { processImage, makeThumb } from './imaging.js';
import { uid, photoFileName, slugify } from './logic.js';

let metas = [];
const thumbUrls = new Map();

export async function init() {
  metas = await db.listPhotos();
}

export const all = () => metas;
export const forStop = (stopId) => metas.filter((m) => m.stopId === stopId);
export function counts() {
  const c = {};
  for (const m of metas) c[m.stopId] = (c[m.stopId] || 0) + 1;
  return c;
}
export const totalBytes = () => metas.reduce((n, m) => n + (m.size || 0), 0);

export async function add(stopId, file) {
  const p = await processImage(file);
  const meta = { id: uid('f'), stopId, createdAt: new Date().toISOString(), w: p.w, h: p.h, size: p.blob.size, thumb: p.thumb };
  await db.addPhoto(meta, p.blob);
  metas.push(meta);
  return meta;
}

/** URL da miniatura (em cache durante a sessão). */
export function thumbUrl(meta) {
  let u = thumbUrls.get(meta.id);
  if (!u) {
    u = URL.createObjectURL(meta.thumb);
    thumbUrls.set(meta.id, u);
  }
  return u;
}

/** Fotografia completa: devolve { url, revoke }. */
export async function openFull(id) {
  const blob = await db.getPhotoBlob(id);
  if (!blob) throw new Error('Fotografia não encontrada.');
  const url = URL.createObjectURL(blob);
  return { url, blob, revoke: () => URL.revokeObjectURL(url) };
}

function forget(ids) {
  for (const id of ids) {
    const u = thumbUrls.get(id);
    if (u) URL.revokeObjectURL(u);
    thumbUrls.delete(id);
  }
  const set = new Set(ids);
  metas = metas.filter((m) => !set.has(m.id));
}

export async function remove(id) {
  await db.deletePhoto(id);
  forget([id]);
}

export async function removeForStop(stopId) {
  const ids = await db.deletePhotosOfStop(stopId);
  forget(ids);
}

export async function removeAll() {
  await db.deleteAllPhotos();
  forget(metas.map((m) => m.id));
}

/** Lê os ficheiros completos por ordem do roteiro. -> [{ meta, name, path, blob }] */
export async function collectFiles(stops) {
  const order = new Map(stops.map((s, i) => [s.id, i]));
  const sorted = [...metas].filter((m) => order.has(m.stopId)).sort((a, b) => order.get(a.stopId) - order.get(b.stopId) || (a.createdAt < b.createdAt ? -1 : 1));
  const perStop = {};
  const out = [];
  for (const meta of sorted) {
    const stop = stops[order.get(meta.stopId)];
    const n = (perStop[meta.stopId] = (perStop[meta.stopId] || 0) + 1);
    const blob = await db.getPhotoBlob(meta.id);
    if (!blob) continue;
    const name = photoFileName(order.get(meta.stopId), stop, n, meta.createdAt);
    const folder = `${String(order.get(meta.stopId) + 1).padStart(2, '0')}-${slugify(stop.name)}`;
    out.push({ meta, name, path: `fotografias/${folder}/${name}`, blob });
  }
  return out;
}

/** Restaura uma fotografia (cópia de segurança). */
export async function restore({ stopId, createdAt, blob, w, h }) {
  const thumb = await makeThumb(blob);
  const meta = { id: uid('f'), stopId, createdAt, w: w || 0, h: h || 0, size: blob.size, thumb };
  await db.addPhoto(meta, blob);
  metas.push(meta);
  return meta;
}

export async function reload() {
  forget(metas.map((m) => m.id));
  metas = await db.listPhotos();
}
