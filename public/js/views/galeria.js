/* Galeria de fotografias, visualizador e exportação. */
import { h, clear, pageHeader, openSheet, confirmDialog, toast, plural, formatBytes, formatDateTime } from '../ui.js';
import * as store from '../store.js';
import {
  buildBackupZip, chunk, SHARE_CHUNK, canShareFiles, shareFiles, toFile, saveFile, todayStamp,
} from '../transfer.js';

/* Aviso honesto, repetido onde a pessoa possa pensar que a foto já está em "Fotografias". */
export const WHERE_NOTE =
  'As fotografias ficam guardadas só nesta app, neste telemóvel. Ainda não estão na app Fotografias: para lá as levares, usa “Exportar › Guardar em Fotografias”.';

/* ---------- visualizador ---------- */

export function openViewer({ list, index, state, photos }) {
  let i = index;
  let current = null;
  const body = h('div', { class: 'viewer' });
  const sheet = openSheet({ title: 'Fotografia', content: body, className: 'sheet-viewer', onClose: () => current && current.revoke() });

  async function show() {
    const meta = list[i];
    clear(body).append(h('p', { class: 'muted center' }, 'A abrir…'));
    if (current) { current.revoke(); current = null; }
    let full;
    try {
      full = await photos.openFull(meta.id);
    } catch (err) {
      clear(body).append(h('p', { class: 'error-text' }, err.message));
      return;
    }
    current = full;
    const stopIdx = state.stops.findIndex((s) => s.id === meta.stopId);
    const stop = state.stops[stopIdx];
    const fileName = `rally_${todayStamp(new Date(meta.createdAt))}_${String(i + 1).padStart(2, '0')}.jpg`;
    const file = toFile(full.blob, fileName, 'image/jpeg'); // pronto antes do toque (o iOS exige um toque direto)
    const shareOk = canShareFiles([file]);

    clear(body).append(
      h('img', { class: 'viewer-img', src: full.url, alt: `Fotografia em ${stop ? stop.name : 'paragem removida'}` }),
      h('p', { class: 'muted center' }, `${stop ? stop.name : 'Paragem removida'} · ${formatDateTime(meta.createdAt)} · ${formatBytes(meta.size)}`),
      h('div', { class: 'row wrap center' },
        h('button', { class: 'btn small', type: 'button', disabled: i === 0, onclick: () => { i -= 1; show(); } }, '‹ Anterior'),
        h('span', { class: 'muted' }, `${i + 1} / ${list.length}`),
        h('button', { class: 'btn small', type: 'button', disabled: i === list.length - 1, onclick: () => { i += 1; show(); } }, 'Seguinte ›')
      ),
      shareOk
        ? h('button', { class: 'btn primary block', type: 'button', onclick: async () => {
            try { await shareFiles([file], 'Rally Gastronómico'); } catch (e) { toast('Não foi possível abrir a partilha.'); }
          } }, '⬇︎ Guardar em Fotografias')
        : h('a', { class: 'btn primary block', href: full.url, download: fileName }, '⬇︎ Transferir fotografia'),
      h('p', { class: 'muted small' }, shareOk
        ? 'Abre a folha de partilha do iPhone: escolhe “Guardar imagem” para a copiar para a app Fotografias.'
        : 'Este navegador não abre a folha de partilha; a fotografia será transferida como ficheiro.'),
      h('button', { class: 'btn danger-outline block', type: 'button', onclick: async () => {
        const ok = await confirmDialog({ title: 'Eliminar fotografia?', message: 'A fotografia será apagada desta app. Se não a exportaste, deixa de existir.', confirmText: 'Eliminar', danger: true });
        if (!ok) return;
        const id = meta.id;
        list.splice(i, 1);
        await photos.remove(id);
        toast('Fotografia eliminada.');
        if (!list.length) { sheet.close(); store.update(() => {}); return; }
        i = Math.min(i, list.length - 1);
        store.update(() => {}); // redesenha o ecrã por trás
        show();
      } }, 'Eliminar fotografia')
    );
  }
  show();
  return sheet;
}

/* ---------- miniaturas ---------- */

export function thumbGrid({ list, state, photos }) {
  const grid = h('div', { class: 'thumbs' });
  list.forEach((meta, idx) => {
    const stop = state.stops.find((s) => s.id === meta.stopId);
    grid.append(h('button', {
      class: 'thumb', type: 'button', 'aria-label': `Abrir fotografia ${idx + 1} de ${stop ? stop.name : 'paragem'}`,
      onclick: () => openViewer({ list: [...list], index: idx, state, photos }),
    }, h('img', { src: photos.thumbUrl(meta), alt: '', loading: 'lazy' })));
  });
  return grid;
}

/* ---------- cópia de segurança / ZIP em dois passos (o iOS exige um toque direto para guardar) ---------- */

export function backupControl({ state, photos, label = 'Preparar ZIP (fotografias + avaliações)' }) {
  const host = h('div', { class: 'stack' });
  const prepare = h('button', { class: 'btn block', type: 'button', onclick: async () => {
    prepare.disabled = true;
    prepare.textContent = 'A preparar…';
    try {
      const files = await photos.collectFiles(state.stops);
      const zip = await buildBackupZip(JSON.parse(JSON.stringify(state)), files);
      const file = toFile(zip, `rally-gastronomico_${todayStamp()}.zip`, 'application/zip');
      clear(host).append(
        h('button', { class: 'btn primary block', type: 'button', onclick: async () => {
          try {
            const r = await saveFile(file);
            if (r === 'ok') toast('Ficheiro guardado.');
          } catch { toast('Não foi possível guardar o ficheiro.'); }
        } }, `⬇︎ Guardar ZIP (${formatBytes(file.size)})`),
        h('p', { class: 'muted small' }, `${plural(files.length, 'fotografia', 'fotografias')} + avaliações + dados para restaurar.`)
      );
    } catch (err) {
      console.error(err);
      prepare.disabled = false;
      prepare.textContent = label;
      toast('Falhou a preparação do ZIP.');
    }
  } }, label);
  host.append(prepare);
  return host;
}

/* ---------- exportar fotografias ---------- */

export function openExportSheet({ state, photos }) {
  const body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'A preparar fotografias…'));
  openSheet({ title: 'Exportar', content: body });

  (async () => {
    const files = await photos.collectFiles(state.stops);
    if (!files.length) {
      clear(body).append(h('p', null, 'Ainda não há fotografias para exportar.'));
      return;
    }
    const fileObjs = files.map((f) => toFile(f.blob, f.name, 'image/jpeg'));
    const groups = chunk(fileObjs, SHARE_CHUNK);
    const canShare = canShareFiles(groups[0]);

    clear(body);
    body.append(
      h('section', { class: 'stack' },
        h('h3', null, '1 · Guardar na app Fotografias'),
        h('p', null, canShare
          ? 'Cada botão abre a folha de partilha do iPhone. Escolhe “Guardar imagem” (ou “Guardar N imagens”). Só depois as fotografias aparecem na app Fotografias.'
          : 'Este navegador não consegue abrir a folha de partilha com ficheiros. Usa o ZIP abaixo ou abre cada fotografia na Galeria.'),
        canShare
          ? groups.map((g, gi) => {
              const from = gi * SHARE_CHUNK + 1;
              const btn = h('button', { class: 'btn primary block', type: 'button', onclick: async () => {
                try {
                  const r = await shareFiles(g, 'Rally Gastronómico');
                  if (r === 'ok') { btn.textContent = `✓ Fotografias ${from}–${from + g.length - 1} partilhadas`; btn.classList.add('done'); }
                } catch { toast('Não foi possível abrir a partilha.'); }
              } }, `Partilhar fotografias ${from}–${from + g.length - 1}`);
              return btn;
            })
          : null,
        h('p', { class: 'muted small' }, 'Quando as guardares na app Fotografias, a data associada será a do momento em que as guardares. Os ficheiros têm o nome da paragem e a ordem do percurso.')
      ),
      h('section', { class: 'stack' },
        h('h3', null, '2 · Ficheiro ZIP completo'),
        h('p', null, 'Fotografias por pasta, avaliações em CSV e os dados para restaurar a app. Serve também de cópia de segurança.'),
        backupControl({ state, photos })
      )
    );
  })().catch((err) => {
    console.error(err);
    clear(body).append(h('p', { class: 'error-text' }, 'Não foi possível preparar a exportação.'));
  });
}

/* ---------- vista ---------- */

export function renderGaleria({ state, photos }) {
  const all = photos.all();
  const total = photos.totalBytes();
  const content = h('div', { class: 'content' });

  content.append(h('div', { class: 'banner info' }, h('div', { class: 'grow' }, h('strong', null, '📍 Onde ficam as fotografias'), h('p', null, WHERE_NOTE))));

  if (!all.length) {
    content.append(h('div', { class: 'card center' },
      h('h2', null, 'Sem fotografias ainda'),
      h('p', { class: 'muted' }, 'Abre uma paragem e toca em “Tirar fotografia”.'),
      h('a', { class: 'btn primary', href: '#/' }, 'Ir para o roteiro')));
  } else {
    state.stops.forEach((st, i) => {
      const list = photos.forStop(st.id);
      if (!list.length) return;
      content.append(h('section', { class: 'stack' },
        h('h2', { class: 'section-title' }, `${i + 1}. ${st.name}`, h('span', { class: 'muted' }, ` · ${list.length}`)),
        thumbGrid({ list, state, photos })));
    });
    const orphans = all.filter((m) => !state.stops.some((s) => s.id === m.stopId));
    if (orphans.length) content.append(h('section', { class: 'stack' }, h('h2', { class: 'section-title' }, 'Sem paragem'), thumbGrid({ list: orphans, state, photos })));
    content.append(h('button', { class: 'btn primary block', type: 'button', onclick: () => openExportSheet({ state, photos }) }, '⬇︎ Exportar fotografias'));
  }

  return h('div', { class: 'view' },
    pageHeader({ title: 'Galeria', subtitle: `${plural(all.length, 'fotografia', 'fotografias')} · ${formatBytes(total)}` }),
    content
  );
}
