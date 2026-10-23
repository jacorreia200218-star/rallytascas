/* Diagnóstico do dispositivo: verifica, no próprio telemóvel, o que a app precisa para funcionar.
 * Usa uma base de dados temporária própria (não toca nos dados do rally) e nada sai do dispositivo. */
import { canShareFiles } from './transfer.js';

const idbRequest = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const idbTx = (tx) => new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Operação cancelada')); });

async function testBlobStorage() {
  const idb = globalThis.indexedDB;
  if (!idb) throw new Error('IndexedDB indisponível (modo privado do Safari?)');
  const name = 'rally-diagnostico';
  const open = idb.open(name, 1);
  open.onupgradeneeded = () => open.result.createObjectStore('t');
  const db = await idbRequest(open);
  try {
    const bytes = new Uint8Array(64 * 1024).map((_, i) => i % 251);
    const tx = db.transaction('t', 'readwrite');
    tx.objectStore('t').put(new Blob([bytes], { type: 'image/jpeg' }), 'b');
    await idbTx(tx);
    const blob = await idbRequest(db.transaction('t').objectStore('t').get('b'));
    if (!blob || blob.size !== bytes.length) throw new Error('O ficheiro guardado voltou com tamanho diferente');
    const back = new Uint8Array(await blob.arrayBuffer());
    if (back[1000] !== bytes[1000] || back[back.length - 1] !== bytes[bytes.length - 1]) throw new Error('O conteúdo do ficheiro voltou alterado');
  } finally {
    db.close();
    idb.deleteDatabase(name);
  }
}

/** Devolve [{ status: 'ok'|'warn'|'fail', label, detail }]. */
export async function runDiagnostics() {
  const out = [];
  const add = (status, label, detail) => out.push({ status, label, detail });

  const standalone = !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  add(standalone ? 'ok' : 'warn', 'Instalada no ecrã principal',
    standalone ? 'Estás a usar a app instalada.' : 'Estás num separador do Safari. Instala (Partilhar › Adicionar ao ecrã principal) e usa só o ícone.');

  add(window.isSecureContext ? 'ok' : 'fail', 'Ligação segura (HTTPS)',
    window.isSecureContext ? 'Necessária para o modo offline e para a instalação.' : 'Sem HTTPS o modo offline não funciona. Abre o endereço https:// da app.');

  try {
    await testBlobStorage();
    add('ok', 'Guardar fotografias neste telemóvel', 'Escrita e leitura de ficheiros na base de dados local: OK.');
  } catch (err) {
    add('fail', 'Guardar fotografias neste telemóvel', `Falhou: ${err.message}`);
  }

  try {
    if (navigator.storage && navigator.storage.persisted) {
      const p = await navigator.storage.persisted();
      add(p ? 'ok' : 'warn', 'Armazenamento persistente', p ? 'Marcado como persistente.' : 'Não marcado (comum no iOS). Instalar no ecrã principal e fazer cópias de segurança compensa.');
    } else {
      add('warn', 'Armazenamento persistente', 'Este navegador não indica o estado.');
    }
  } catch {
    add('warn', 'Armazenamento persistente', 'Não foi possível verificar.');
  }

  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    const keys = 'caches' in window ? await caches.keys() : [];
    const cached = keys.length ? (await (await caches.open(keys[0])).keys()).length : 0;
    if (reg && navigator.serviceWorker.controller && cached > 0) add('ok', 'Funciona sem rede', `${cached} ficheiros da app guardados para uso offline.`);
    else if (reg) add('warn', 'Funciona sem rede', 'Ainda está a preparar o modo offline. Fecha e volta a abrir a app uma vez, com rede.');
    else add('fail', 'Funciona sem rede', 'O modo offline não está ativo neste navegador.');
  } catch {
    add('fail', 'Funciona sem rede', 'Não foi possível verificar.');
  }

  let canShare = false;
  try { canShare = canShareFiles([new File([new Uint8Array(4)], 'teste.jpg', { type: 'image/jpeg' })]); } catch { canShare = false; }
  add(canShare ? 'ok' : 'warn', 'Guardar na app Fotografias (partilha)',
    canShare ? 'A folha de partilha aceita fotografias: podes usar “Guardar imagem”.' : 'Sem partilha de ficheiros: usa o ZIP e descompacta no Ficheiros.');

  add('geolocation' in navigator ? 'ok' : 'warn', 'Localização (opcional)',
    'geolocation' in navigator ? 'Disponível; só é pedida quando tocas em “Usar a minha localização”.' : 'Indisponível; escreve as coordenadas à mão.');

  return out;
}
