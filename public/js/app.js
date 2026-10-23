/* Arranque da aplicação: dados locais, rotas, separadores, service worker. */
import * as store from './store.js';
import * as photos from './photos.js';
import { h, clear, icon, toast, openSheet, closeDismissibleSheets } from './ui.js';
import { renderRoteiro, renderEditar } from './views/roteiro.js';
import { renderParagem } from './views/paragem.js';
import { renderGaleria } from './views/galeria.js';
import { renderRanking } from './views/ranking.js';
import { renderMais } from './views/mais.js';

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');

const TABS = [
  { id: 'roteiro', href: '#/', label: 'Roteiro', icon: 'map' },
  { id: 'galeria', href: '#/galeria', label: 'Galeria', icon: 'image' },
  { id: 'ranking', href: '#/ranking', label: 'Ranking', icon: 'trophy' },
  { id: 'mais', href: '#/mais', label: 'Mais', icon: 'more' },
];

function resolveRoute() {
  const path = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('?')[0]);
  let m;
  if (path === '') return { key: 'roteiro', tab: 'roteiro', title: 'Roteiro', view: renderRoteiro };
  if ((m = path.match(/^paragem\/([^/]+)$/))) return { key: `paragem/${m[1]}`, tab: 'roteiro', title: 'Paragem', view: renderParagem, params: { id: m[1] } };
  if (path === 'editar') return { key: 'editar', tab: 'roteiro', title: 'Editar roteiro', view: renderEditar };
  if (path === 'galeria') return { key: 'galeria', tab: 'galeria', title: 'Galeria', view: renderGaleria };
  if (path === 'ranking') return { key: 'ranking', tab: 'ranking', title: 'Ranking', view: renderRanking };
  if (path === 'mais') return { key: 'mais', tab: 'mais', title: 'Mais', view: renderMais };
  return null;
}

let currentKey = null;

function buildTabbar(activeTab) {
  clear(tabbar);
  for (const t of TABS) {
    tabbar.append(
      h('a', { href: t.href, class: `tab ${t.id === activeTab ? 'active' : ''}`, 'aria-current': t.id === activeTab ? 'page' : null },
        h('span', { class: 'tab-icon', 'aria-hidden': 'true' }, icon(t.icon, 22)),
        h('span', { class: 'tab-label' }, t.label)
      )
    );
  }
}

const ctx = {
  photos,
  go(hash) { location.hash = hash; },
  rerender() { render({ keepScroll: true }); },
};

function render({ keepScroll = false } = {}) {
  const r = resolveRoute();
  if (!r) { location.replace('#/'); return; }
  const scrollY = window.scrollY;
  const routeChanged = r.key !== currentKey;
  currentKey = r.key;
  if (routeChanged) closeDismissibleSheets(); // ex.: gesto de voltar com uma folha aberta

  let node;
  try {
    node = r.view({ ...ctx, state: store.get() }, r.params || {});
  } catch (err) {
    console.error(err);
    node = h('div', { class: 'content' }, h('div', { class: 'card error' },
      h('h2', null, 'Algo correu mal'),
      h('p', null, 'Não foi possível mostrar este ecrã. Os teus dados continuam guardados.'),
      h('a', { class: 'btn primary', href: '#/' }, 'Voltar ao roteiro')));
  }
  clear(app).append(node);
  document.title = r.title === 'Roteiro' ? 'Rally Gastronómico' : `${r.title} · Rally`;
  buildTabbar(r.tab);
  window.scrollTo(0, routeChanged || !keepScroll ? 0 : scrollY);
}

/* ---------- configuração inicial ---------- */

function showSetup() {
  const state = store.get();
  const n1 = h('input', { id: 'setup-p1', type: 'text', maxlength: '30', autocomplete: 'off', placeholder: 'Ex.: João', value: state.players[0].name.startsWith('Jogador') ? '' : state.players[0].name });
  const n2 = h('input', { id: 'setup-p2', type: 'text', maxlength: '30', autocomplete: 'off', placeholder: 'Ex.: Maria', value: state.players[1].name.startsWith('Jogador') ? '' : state.players[1].name });
  const form = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault();
    await store.update((s) => {
      s.players[0].name = n1.value.trim().slice(0, 30) || 'Jogador 1';
      s.players[1].name = n2.value.trim().slice(0, 30) || 'Jogador 2';
      s.setupDone = true;
    });
    sheet.close();
    requestPersistentStorage();
  } },
    h('p', null, 'Um rally de tascas a dois: desafios surpresa, fotografias, avaliações e um ranking final.'),
    h('label', { class: 'field' }, h('span', null, 'Nome de quem joga (1)'), n1),
    h('label', { class: 'field' }, h('span', null, 'Nome de quem joga (2)'), n2),
    h('div', { class: 'note' },
      h('strong', null, 'Privado por desenho. '),
      'Fotografias e avaliações ficam guardadas só neste telemóvel, dentro desta app. Não há contas, servidores nem estatísticas. Mais detalhes em Mais › Privacidade.'),
    h('button', { class: 'btn primary block', type: 'submit' }, 'Começar o rally')
  );
  const sheet = openSheet({ title: 'Bem-vindos ao Rally', content: form, dismissible: false });
}

/* ---------- armazenamento persistente e service worker ---------- */

async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch { /* sem consequências */ }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!secure) return;
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) toast('Nova versão instalada. Fecha e volta a abrir a app para a usar.', { ms: 6000 });
    hadController = true;
  });
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker não registado', err));
}

/* ---------- arranque ---------- */

function showFatal(err) {
  clear(app).append(h('div', { class: 'content' }, h('div', { class: 'card error' },
    h('h2', null, 'Não consegui abrir o armazenamento local'),
    h('p', null, String(err && err.message ? err.message : err)),
    h('p', { class: 'muted' }, 'Se estás num separador privado do Safari, abre a app num separador normal ou instala-a no ecrã principal.')
  )));
}

async function boot() {
  try {
    await store.init();
    await photos.init();
  } catch (err) {
    console.error(err);
    showFatal(err);
    return;
  }

  store.subscribe((ev) => {
    if (ev.type === 'save-error') toast('Não foi possível guardar as alterações neste telemóvel.', { ms: 6000 });
    else ctx.rerender();
  });
  window.addEventListener('hashchange', () => render());
  render();
  if (!store.get().setupDone) showSetup();
  else requestPersistentStorage();
  registerServiceWorker();
}

boot();
