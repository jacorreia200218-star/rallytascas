/* Armazenamento local no iPhone (IndexedDB). Nada sai deste dispositivo.
 *  - kv:         estado do rally (JSON pequeno)
 *  - photos:     metadados + miniatura de cada fotografia
 *  - photoBlobs: ficheiro completo da fotografia (separado para a galeria ser leve)
 */
const DB_NAME = 'rally-gastronomico';
const DB_VERSION = 1;

let dbPromise = null;

const reqP = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const txDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Operação cancelada.'));
  });

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const idb = globalThis.indexedDB;
    if (!idb) {
      reject(new Error('O armazenamento local (IndexedDB) não está disponível. Em modo privado do Safari não funciona.'));
      return;
    }
    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('photos')) {
        const s = db.createObjectStore('photos', { keyPath: 'id' });
        s.createIndex('stopId', 'stopId');
      }
      if (!db.objectStoreNames.contains('photoBlobs')) db.createObjectStore('photoBlobs', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('A base de dados está bloqueada por outro separador. Fecha-o e tenta de novo.'));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

/** Só para testes. */
export function _resetConnection() {
  dbPromise = null;
}

/* ---------- estado ---------- */

export async function loadState() {
  const db = await openDb();
  const value = await reqP(db.transaction('kv').objectStore('kv').get('state'));
  return value ?? null;
}

export async function saveState(state) {
  const db = await openDb();
  const tx = db.transaction('kv', 'readwrite');
  tx.objectStore('kv').put(state, 'state');
  await txDone(tx);
}

/* ---------- fotografias ---------- */

export async function addPhoto(meta, blob) {
  const db = await openDb();
  const tx = db.transaction(['photos', 'photoBlobs'], 'readwrite');
  tx.objectStore('photos').put(meta);
  tx.objectStore('photoBlobs').put({ id: meta.id, blob });
  await txDone(tx);
}

export async function listPhotos() {
  const db = await openDb();
  const all = await reqP(db.transaction('photos').objectStore('photos').getAll());
  return all.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

export async function getPhotoBlob(id) {
  const db = await openDb();
  const rec = await reqP(db.transaction('photoBlobs').objectStore('photoBlobs').get(id));
  return rec ? rec.blob : null;
}

export async function deletePhoto(id) {
  const db = await openDb();
  const tx = db.transaction(['photos', 'photoBlobs'], 'readwrite');
  tx.objectStore('photos').delete(id);
  tx.objectStore('photoBlobs').delete(id);
  await txDone(tx);
}

export async function deleteAllPhotos() {
  const db = await openDb();
  const tx = db.transaction(['photos', 'photoBlobs'], 'readwrite');
  tx.objectStore('photos').clear();
  tx.objectStore('photoBlobs').clear();
  await txDone(tx);
}

export async function deletePhotosOfStop(stopId) {
  const db = await openDb();
  const ids = await reqP(db.transaction('photos').objectStore('photos').index('stopId').getAllKeys(stopId));
  if (!ids.length) return [];
  const tx = db.transaction(['photos', 'photoBlobs'], 'readwrite');
  for (const id of ids) {
    tx.objectStore('photos').delete(id);
    tx.objectStore('photoBlobs').delete(id);
  }
  await txDone(tx);
  return ids;
}

/** Apaga tudo (estado + fotografias). */
export async function clearAll() {
  const db = await openDb();
  const tx = db.transaction(['kv', 'photos', 'photoBlobs'], 'readwrite');
  tx.objectStore('kv').clear();
  tx.objectStore('photos').clear();
  tx.objectStore('photoBlobs').clear();
  await txDone(tx);
}
