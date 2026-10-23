/* Roteiro: mapa esquemático (offline), lista de paragens e edição do roteiro. */
import { h, s, pageHeader, progressBar, openSheet, confirmDialog, toast, plural, starText, formatScore } from '../ui.js';
import * as store from '../store.js';
import {
  progress, nextStop, isVisited, projectStops, computeScores, stopSummary, hasCoords,
  parseCoords, formatCoords, parseBulkStops, uid, placeLabels,
} from '../logic.js';

const MAP_W = 360;
const MAP_H = 260;

function isStandalone() {
  return !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
}

/* ---------- mapa ---------- */

export function buildMap(state, nextId, go) {
  const pos = projectStops(state.stops, MAP_W, MAP_H, 40);
  const svg = s('svg', { viewBox: `0 0 ${MAP_W} ${MAP_H}`, class: 'map-svg', role: 'group', 'aria-label': 'Mapa esquemático do roteiro' });

  svg.append(s('rect', { class: 'map-bg', x: 0, y: 0, width: MAP_W, height: MAP_H, rx: 14 }));
  for (let x = 45; x < MAP_W; x += 45) svg.append(s('line', { class: 'map-grid', x1: x, y1: 0, x2: x, y2: MAP_H }));
  for (let y = 43; y < MAP_H; y += 43) svg.append(s('line', { class: 'map-grid', x1: 0, y1: y, x2: MAP_W, y2: y }));

  const withPos = state.stops.filter((st) => pos.has(st.id));
  if (withPos.length > 1) {
    svg.append(s('polyline', { class: 'map-route', points: withPos.map((st) => `${pos.get(st.id).x.toFixed(1)},${pos.get(st.id).y.toFixed(1)}`).join(' ') }));
  }

  const labels = placeLabels(state.stops, pos);

  state.stops.forEach((st, i) => {
    const p = pos.get(st.id);
    if (!p) return;
    const visited = isVisited(state, st.id);
    const cls = visited ? 'visited' : st.id === nextId ? 'next' : 'pending';
    const open = () => go(`#/paragem/${st.id}`);
    const lab = labels.get(st.id);
    svg.append(
      s('g', {
        class: `pin ${cls}`, transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`, tabindex: '0', role: 'link',
        'aria-label': `${i + 1}. ${st.name}${visited ? ' (visitada)' : ''}`,
        onclick: open,
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } },
      },
        cls === 'next' ? s('circle', { class: 'pulse', r: 14 }) : null,
        s('circle', { class: 'pin-dot', r: 14 }),
        s('text', { class: 'pin-num', 'text-anchor': 'middle', dy: '.35em' }, visited ? '✓' : String(i + 1)),
        lab ? s('text', { class: 'pin-label', 'text-anchor': 'middle', y: lab.dy }, lab.text) : null
      )
    );
  });
  return svg;
}

/* ---------- vista principal ---------- */

function stopCard(state, st, i, counts, nextId) {
  const visited = isVisited(state, st.id);
  const sum = stopSummary(state, st.id);
  const ch = state.challenges?.[st.id];
  const n = counts[st.id] || 0;
  return h('a', { class: `stop-card ${visited ? 'visited' : ''} ${st.id === nextId ? 'next' : ''}`, href: `#/paragem/${st.id}` },
    h('span', { class: 'stop-num', 'aria-hidden': 'true' }, visited ? '✓' : String(i + 1)),
    h('span', { class: 'stop-main' },
      h('span', { class: 'stop-name' }, st.name),
      st.address ? h('span', { class: 'stop-addr' }, st.address) : null,
      h('span', { class: 'chips' },
        h('span', { class: `chip ${visited ? 'ok' : st.id === nextId ? 'warn' : ''}` }, visited ? 'Visitada' : st.id === nextId ? 'A seguir' : 'Por visitar'),
        sum.overall !== null ? h('span', { class: 'chip' }, `★ ${formatScore(sum.overall)}`) : null,
        n ? h('span', { class: 'chip' }, `📷 ${n}`) : null,
        ch?.status === 'done' ? h('span', { class: 'chip ok' }, '🎁 cumprido') : ch?.status === 'revealed' ? h('span', { class: 'chip warn' }, '🎁 por cumprir') : null
      )
    ),
    h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')
  );
}

export function renderRoteiro({ state, photos, go }) {
  const counts = photos.counts();
  const prog = progress(state, counts);
  const scores = computeScores(state, counts);
  const next = nextStop(state);
  const examples = state.stops.filter((x) => x.example).length;

  const content = h('div', { class: 'content' });
  content.append(progressBar(prog.pct, 'Progresso do rally'));

  if (!isStandalone() && !state.settings.hideInstallHint) {
    content.append(h('div', { class: 'banner' },
      h('div', { class: 'grow' },
        h('strong', null, 'Instalar no ecrã principal'),
        h('p', null, 'No Safari, toca em Partilhar ⬆︎ › Adicionar ao ecrã principal. Depois usa sempre o ícone “Rally”: os dados da app instalada são separados dos do Safari.')),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar aviso', onclick: () => store.update((st) => { st.settings.hideInstallHint = true; }) }, '✕')
    ));
  }

  if (examples) {
    content.append(h('div', { class: 'banner info' },
      h('div', { class: 'grow' },
        h('strong', null, 'Estas paragens são só de exemplo'),
        h('p', null, 'Troca-as pelo vosso roteiro real. Podes colar várias de uma vez.')),
      h('a', { class: 'btn small primary', href: '#/editar' }, 'Editar')
    ));
  }

  if (!state.stops.length) {
    content.append(h('div', { class: 'card center' },
      h('h2', null, 'Ainda sem paragens'),
      h('p', { class: 'muted' }, 'Adiciona as tascas do vosso roteiro para começar.'),
      h('a', { class: 'btn primary', href: '#/editar' }, 'Adicionar paragens')));
  } else {
    const mapCard = h('section', { class: 'card map-card', 'aria-label': 'Mapa' }, buildMap(state, next?.id, go));
    const noCoords = state.stops.filter((x) => !hasCoords(x));
    mapCard.append(h('p', { class: 'muted small' },
      'Mapa esquemático, funciona sem rede. Toca numa paragem para a abrir; para direções usa “Abrir no Mapas” dentro da paragem.',
      noCoords.length ? ` Sem coordenadas (não aparecem no mapa): ${noCoords.map((x) => x.name).join(', ')}.` : ''));
    content.append(mapCard);

    if (next) {
      content.append(h('section', { class: 'card highlight' },
        h('p', { class: 'eyebrow' }, prog.visited === 0 ? 'Primeira paragem' : 'Próxima paragem'),
        h('h2', null, next.name),
        next.address ? h('p', { class: 'muted' }, next.address) : null,
        h('a', { class: 'btn primary block', href: `#/paragem/${next.id}` }, 'Abrir paragem')
      ));
    } else {
      content.append(h('section', { class: 'card highlight' },
        h('p', { class: 'eyebrow' }, '🏁 Rally completo'),
        h('h2', null, 'Passaram por todas as paragens!'),
        h('a', { class: 'btn primary block', href: '#/ranking' }, 'Ver ranking e conquistas')
      ));
    }

    const list = h('section', { class: 'stack', 'aria-label': 'Paragens' });
    state.stops.forEach((st, i) => list.append(stopCard(state, st, i, counts, next?.id)));
    content.append(h('h2', { class: 'section-title' }, 'Paragens'), list);
  }

  content.append(h('a', { class: 'btn ghost block', href: '#/editar' }, '✎ Editar roteiro'));

  return h('div', { class: 'view' },
    pageHeader({
      title: 'Rally Gastronómico',
      subtitle: `${plural(prog.visited, 'paragem visitada', 'paragens visitadas')} de ${prog.total} · ${scores.team.total} pts`,
    }),
    content
  );
}

/* ---------- edição do roteiro ---------- */

export function openStopForm({ stop = null, onSaved } = {}) {
  const name = h('input', { id: 'f-name', type: 'text', maxlength: '60', required: true, autocomplete: 'off', value: stop?.name || '', placeholder: 'Ex.: Tasca do Zé' });
  const address = h('input', { id: 'f-address', type: 'text', maxlength: '120', autocomplete: 'off', value: stop?.address || '', placeholder: 'Rua, número, zona (opcional)' });
  const coords = h('input', { id: 'f-coords', type: 'text', inputmode: 'text', autocomplete: 'off', value: stop ? formatCoords(stop) : '', placeholder: '41.14960, -8.60740 (opcional)' });
  const note = h('textarea', { id: 'f-note', rows: '2', maxlength: '300', placeholder: 'Prato recomendado, reserva, horário…' }, stop?.note || '');
  const err = h('p', { class: 'error-text', role: 'alert' });
  const locBtn = h('button', { class: 'btn small ghost', type: 'button', onclick: () => {
    if (!navigator.geolocation) { err.textContent = 'Este dispositivo não permite obter a localização.'; return; }
    locBtn.disabled = true;
    locBtn.textContent = 'A obter localização…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords.value = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        locBtn.disabled = false; locBtn.textContent = '📍 Usar a minha localização'; err.textContent = '';
      },
      () => { locBtn.disabled = false; locBtn.textContent = '📍 Usar a minha localização'; err.textContent = 'Não foi possível obter a localização (verifica as permissões do Safari).'; },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  } }, '📍 Usar a minha localização');

  const form = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault();
    const n = name.value.trim();
    if (!n) { err.textContent = 'Dá um nome à paragem.'; return; }
    let lat = null, lng = null;
    if (coords.value.trim()) {
      const c = parseCoords(coords.value);
      if (!c) { err.textContent = 'Coordenadas inválidas. Usa o formato 41.1496, -8.6074.'; return; }
      lat = c.lat; lng = c.lng;
    }
    const data = { name: n, address: address.value.trim(), lat, lng, note: note.value.trim() };
    if (stop) await store.updateStop(stop.id, data);
    else await store.addStop(data);
    sheet.close();
    toast(stop ? 'Paragem atualizada.' : 'Paragem adicionada.');
    if (onSaved) onSaved();
  } },
    h('label', { class: 'field' }, h('span', null, 'Nome'), name),
    h('label', { class: 'field' }, h('span', null, 'Morada'), address),
    h('div', { class: 'field' },
      h('label', { for: 'f-coords' }, 'Coordenadas (para aparecer no mapa)'),
      coords,
      h('div', { class: 'row' }, locBtn),
      h('p', { class: 'muted small' }, 'Dica: no Mapas, mantém o dedo no local e copia as coordenadas. A localização é lida só neste telemóvel e nunca enviada.')),
    h('label', { class: 'field' }, h('span', null, 'Notas'), note),
    err,
    h('div', { class: 'row end' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => sheet.close() }, 'Cancelar'),
      h('button', { class: 'btn primary', type: 'submit' }, 'Guardar'))
  );
  const sheet = openSheet({ title: stop ? 'Editar paragem' : 'Nova paragem', content: form });
  return sheet;
}

function openBulkAdd() {
  const ta = h('textarea', { rows: '7', placeholder: 'Tasca do Zé | Rua das Flores 10\nCasa Maria | Bolhão | 41.1496, -8.6074\nO Petisqueiro' });
  const err = h('p', { class: 'error-text', role: 'alert' });
  const form = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault();
    const items = parseBulkStops(ta.value);
    if (!items.length) { err.textContent = 'Escreve pelo menos uma paragem.'; return; }
    await store.update((st) => {
      for (const it of items) st.stops.push({ id: uid('s'), note: '', example: false, ...it });
    });
    sheet.close();
    toast(`${plural(items.length, 'paragem adicionada', 'paragens adicionadas')}.`);
  } },
    h('p', null, 'Uma paragem por linha: ', h('code', null, 'Nome | Morada | Coordenadas'), '. Só o nome é obrigatório.'),
    ta, err,
    h('div', { class: 'row end' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => sheet.close() }, 'Cancelar'),
      h('button', { class: 'btn primary', type: 'submit' }, 'Adicionar'))
  );
  const sheet = openSheet({ title: 'Adicionar várias paragens', content: form });
}

async function deleteStop(st, photos) {
  const n = photos.forStop(st.id).length;
  const ok = await confirmDialog({
    title: 'Eliminar paragem?',
    message: `“${st.name}” será eliminada, incluindo a visita, o desafio, as avaliações${n ? ` e ${plural(n, 'fotografia', 'fotografias')}` : ''}. Esta ação não se pode desfazer.`,
    confirmText: 'Eliminar', danger: true,
  });
  if (!ok) return;
  await photos.removeForStop(st.id);
  await store.removeStop(st.id);
  toast('Paragem eliminada.');
}

export function renderEditar({ state, photos }) {
  const list = h('div', { class: 'stack' });
  state.stops.forEach((st, i) => {
    list.append(h('div', { class: 'edit-row' },
      h('span', { class: 'stop-num', 'aria-hidden': 'true' }, String(i + 1)),
      h('div', { class: 'grow' },
        h('div', { class: 'stop-name' }, st.name, st.example ? h('span', { class: 'chip' }, 'exemplo') : null),
        h('div', { class: 'stop-addr' }, [st.address, hasCoords(st) ? '📍' : 'sem coordenadas'].filter(Boolean).join(' · '))),
      h('div', { class: 'row tight' },
        h('button', { class: 'icon-btn', type: 'button', disabled: i === 0, 'aria-label': `Subir ${st.name}`, onclick: () => store.moveStop(st.id, -1) }, '↑'),
        h('button', { class: 'icon-btn', type: 'button', disabled: i === state.stops.length - 1, 'aria-label': `Descer ${st.name}`, onclick: () => store.moveStop(st.id, 1) }, '↓'),
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': `Editar ${st.name}`, onclick: () => openStopForm({ stop: st }) }, '✎'),
        h('button', { class: 'icon-btn danger-text', type: 'button', 'aria-label': `Eliminar ${st.name}`, onclick: () => deleteStop(st, photos) }, '🗑')
      )
    ));
  });

  const examples = state.stops.filter((x) => x.example).length;
  const content = h('div', { class: 'content' },
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => openStopForm() }, '＋ Nova paragem'),
      h('button', { class: 'btn', type: 'button', onclick: openBulkAdd }, 'Adicionar várias')),
    examples ? h('div', { class: 'banner info' },
      h('div', { class: 'grow' }, h('strong', null, `${plural(examples, 'paragem de exemplo', 'paragens de exemplo')}`)),
      h('button', { class: 'btn small', type: 'button', onclick: async () => {
        const ok = await confirmDialog({ title: 'Remover exemplos?', message: 'As paragens de exemplo (e o que tenham registado) serão removidas.', confirmText: 'Remover', danger: true });
        if (ok) { await store.removeExampleStops(); toast('Exemplos removidos.'); }
      } }, 'Remover exemplos')) : null,
    state.stops.length ? list : h('p', { class: 'muted' }, 'Sem paragens. Adiciona a primeira.'),
    h('p', { class: 'muted small' }, 'A ordem aqui é a ordem do percurso no mapa.')
  );
  return h('div', { class: 'view' }, pageHeader({ title: 'Editar roteiro', back: '#/' }), content);
}
