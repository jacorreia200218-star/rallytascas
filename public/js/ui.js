/* Pequenos utilitários de interface (sem bibliotecas). Todo o texto é inserido com
 * textContent/createTextNode, nunca como HTML, por isso dados importados não executam código. */

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyAttrs(el, attrs) {
  if (!attrs) return;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}

export function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  applyAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/* ---------- formatação (pt-PT) ---------- */

export function formatTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '–';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',')} GB`;
}

export function formatScore(n) {
  return n === null || n === undefined ? '–' : n.toFixed(1).replace('.', ',');
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/* ---------- avisos ---------- */

export function toast(message, { ms = 3400 } = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  clear(host); // só um aviso de cada vez, para não tapar o ecrã
  const el = h('div', { class: 'toast' }, message);
  host.append(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

/* ---------- folhas modais ---------- */

const sheetStack = [];

function focusables(root) {
  return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
    (n) => !n.disabled && n.offsetParent !== null
  );
}

document.addEventListener('keydown', (e) => {
  const top = sheetStack[sheetStack.length - 1];
  if (!top) return;
  if (e.key === 'Escape' && top.dismissible) {
    e.preventDefault();
    top.close();
  } else if (e.key === 'Tab') {
    const f = focusables(top.el);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/** Abre uma folha por cima da página. `content` é um Node. Devolve { close, el }. */
export function openSheet({ title, content, dismissible = true, onClose, className = '' }) {
  const host = document.getElementById('sheets');
  const previouslyFocused = document.activeElement;
  let closed = false;

  const titleId = `sheet-title-${sheetStack.length}-${Math.random().toString(36).slice(2, 6)}`;
  const closeBtn = dismissible ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fechar', onclick: () => api.close() }, '✕') : null;
  const sheet = h('div', { class: `sheet ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('div', { class: 'sheet-head' }, h('h2', { id: titleId }, title), closeBtn),
    h('div', { class: 'sheet-body' }, content)
  );
  const backdrop = h('div', { class: 'backdrop', onclick: (e) => { if (e.target === backdrop && dismissible) api.close(); } }, sheet);
  host.append(backdrop);
  document.body.classList.add('no-scroll');

  const api = {
    el: sheet,
    dismissible,
    close() {
      if (closed) return;
      closed = true;
      const i = sheetStack.indexOf(api);
      if (i >= 0) sheetStack.splice(i, 1);
      backdrop.remove();
      if (!sheetStack.length) document.body.classList.remove('no-scroll');
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      if (onClose) onClose();
    },
  };
  sheetStack.push(api);
  requestAnimationFrame(() => {
    const f = focusables(sheet).find((n) => !n.classList.contains('icon-btn')) || focusables(sheet)[0];
    if (f) f.focus();
  });
  return api;
}

/** Fecha as folhas que o utilizador pode dispensar (a configuração inicial fica). */
export function closeDismissibleSheets() {
  [...sheetStack].reverse().filter((sh) => sh.dismissible).forEach((sh) => sh.close());
}

/** Caixa de confirmação. Resolve true/false. */
export function confirmDialog({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, extra = null }) {
  return new Promise((resolve) => {
    let answered = false;
    const done = (v) => {
      if (answered) return;
      answered = true;
      sheet.close();
      resolve(v);
    };
    const sheet = openSheet({
      title,
      className: 'sheet-small',
      onClose: () => { if (!answered) { answered = true; resolve(false); } },
      content: h('div', { class: 'stack' },
        h('p', null, message),
        extra,
        h('div', { class: 'row end' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => done(false) }, cancelText),
          h('button', { class: `btn ${danger ? 'danger' : 'primary'}`, type: 'button', onclick: () => done(true) }, confirmText)
        )
      ),
    });
  });
}

/* ---------- componentes ---------- */

export function pageHeader({ title, subtitle, back = null, actions = null }) {
  return h('header', { class: 'page-header' },
    h('div', { class: 'page-header-row' },
      back ? h('a', { class: 'back', href: back, 'aria-label': 'Voltar' }, '‹') : null,
      h('div', { class: 'grow' },
        h('h1', null, title),
        subtitle ? h('p', { class: 'subtitle' }, subtitle) : null
      ),
      actions
    )
  );
}

export function progressBar(pct, label) {
  const fill = h('div', { class: 'progress-fill' });
  fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)), 'aria-label': label || 'Progresso' }, fill);
}

/** Estrelas 1..5. Tocar outra vez na mesma estrela limpa. */
export function starInput({ value, label, onChange }) {
  const group = h('div', { class: 'stars', role: 'radiogroup', 'aria-label': label });
  for (let i = 1; i <= 5; i++) {
    group.append(h('button', {
      type: 'button',
      class: `star ${value !== null && value !== undefined && i <= value ? 'on' : ''}`,
      role: 'radio',
      'aria-checked': String(value === i),
      'aria-label': `${i} ${i === 1 ? 'estrela' : 'estrelas'}`,
      onclick: () => onChange(value === i ? null : i),
    }, '★'));
  }
  return group;
}

export function starText(avg) {
  if (avg === null || avg === undefined) return '';
  const full = Math.round(avg);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

/** Descarrega um Blob (ou partilha, se o chamador preferir). Tem de ser chamado num toque. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
