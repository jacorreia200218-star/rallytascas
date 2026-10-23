/* Exportar e importar (tudo local): partilha para o iPhone, ZIP e cópia de segurança. */
import { buildZip, readZip } from './zip.js';
import { ratingsToCsv, normalizeState, SCHEMA_VERSION } from './logic.js';
import { downloadBlob } from './ui.js';

export const APP_ID = 'rally-gastronomico';
export const SHARE_CHUNK = 12; // fotografias por folha de partilha (evita falta de memória no iOS)

export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function todayStamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const README = `RALLY GASTRONÓMICO — cópia de segurança
=========================================

Esta pasta foi criada pela aplicação Rally Gastronómico, no teu telemóvel.
Nada foi enviado para nenhum servidor.

  dados/rally.json        todas as paragens, desafios e avaliações (para restaurar na app)
  dados/avaliacoes.csv    avaliações para abrir no Excel / Numbers
  fotografias/            as fotografias, por paragem

Para restaurar: na app, Mais > Importar cópia de segurança, e escolhe este ficheiro .zip.
Para ter as fotografias na app Fotografias do iPhone: descompacta no Ficheiros,
abre a pasta de uma paragem, seleciona as imagens e escolhe Partilhar > Guardar imagens.
`;

/** state + ficheiros ({name,path,blob,meta}) -> Blob ZIP. */
export async function buildBackupZip(state, photoFiles) {
  const manifest = {
    app: APP_ID,
    format: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    state,
    photos: photoFiles.map((f) => ({ path: f.path, stopId: f.meta.stopId, createdAt: f.meta.createdAt, w: f.meta.w, h: f.meta.h })),
  };
  const files = [
    { name: 'LEIA-ME.txt', data: README },
    { name: 'dados/rally.json', data: JSON.stringify(manifest, null, 2) },
    { name: 'dados/avaliacoes.csv', data: '﻿' + ratingsToCsv(state) }, // BOM: o Excel abre os acentos bem
    ...photoFiles.map((f) => ({ name: f.path, data: f.blob, date: new Date(f.meta.createdAt) })),
  ];
  return buildZip(files);
}

/** Lê uma cópia de segurança. Devolve { state, photos:[{stopId,createdAt,blob,w,h}] } ou lança erro. */
export async function readBackupZip(blob) {
  const entries = await readZip(blob);
  const byName = new Map(entries.map((e) => [e.name, e.blob]));
  const jsonBlob = byName.get('dados/rally.json');
  if (!jsonBlob) throw new Error('Este ficheiro não é uma cópia de segurança do Rally Gastronómico.');
  let manifest;
  try {
    manifest = JSON.parse(await jsonBlob.text());
  } catch {
    throw new Error('O ficheiro de dados está corrompido.');
  }
  if (manifest?.app !== APP_ID) throw new Error('Este ficheiro não é uma cópia de segurança do Rally Gastronómico.');
  const state = normalizeState(manifest.state);
  const stopIds = new Set(state.stops.map((s) => s.id));
  const photos = [];
  for (const p of Array.isArray(manifest.photos) ? manifest.photos : []) {
    const blob = byName.get(p?.path);
    if (!blob || !stopIds.has(p.stopId)) continue;
    photos.push({
      stopId: p.stopId,
      createdAt: typeof p.createdAt === 'string' && !Number.isNaN(Date.parse(p.createdAt)) ? p.createdAt : new Date().toISOString(),
      blob: new Blob([blob], { type: 'image/jpeg' }),
      w: Number(p.w) || 0,
      h: Number(p.h) || 0,
    });
  }
  return { state, photos };
}

/* ---------- partilha nativa (iOS: "Guardar imagem" -> Fotografias) ---------- */

export function toFile(blob, name, type) {
  return new File([blob], name, { type: type || blob.type || 'application/octet-stream' });
}

export function canShareFiles(files) {
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files });
  } catch {
    return false;
  }
}

/** Abre a folha de partilha. Tem de ser chamada diretamente num toque (sem await antes). */
export async function shareFiles(files, title = 'Rally Gastronómico') {
  try {
    await navigator.share({ files, title });
    return 'ok';
  } catch (err) {
    if (err && err.name === 'AbortError') return 'cancelled';
    throw err;
  }
}

/** Guarda um ficheiro: folha de partilha se existir; senão, transferência normal. Chamar num toque. */
export async function saveFile(file) {
  if (canShareFiles([file])) return shareFiles([file], file.name);
  downloadBlob(file, file.name);
  return 'download';
}
