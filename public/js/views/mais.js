/* Mais: jogadores, privacidade, armazenamento, cópia de segurança e reinício. */
import { h, clear, pageHeader, openSheet, confirmDialog, toast, plural, formatBytes } from '../ui.js';
import * as store from '../store.js';
import { backupControl } from './galeria.js';
import { readBackupZip } from '../transfer.js';
import { progress } from '../logic.js';
import { runDiagnostics } from '../diagnostico.js';

export const APP_VERSION = '1.1.0';

/* ---------- jogadores ---------- */

function playersCard(state) {
  const inputs = state.players.map((p, i) => h('input', { type: 'text', maxlength: '30', value: p.name, autocomplete: 'off', 'aria-label': `Nome do jogador ${i + 1}` }));
  return h('section', { class: 'card' },
    h('h2', null, 'Jogadores'),
    h('form', { class: 'stack', onsubmit: async (e) => {
      e.preventDefault();
      await store.update((s) => { inputs.forEach((inp, i) => { s.players[i].name = inp.value.trim().slice(0, 30) || `Jogador ${i + 1}`; }); });
      toast('Nomes guardados.');
    } },
      ...inputs.map((inp, i) => h('label', { class: 'field' }, h('span', null, `Jogador ${i + 1}`), inp)),
      h('button', { class: 'btn', type: 'submit' }, 'Guardar nomes'))
  );
}

/* ---------- privacidade ---------- */

function privacyCard() {
  const item = (title, text) => h('li', null, h('strong', null, title), ' ', text);
  return h('section', { class: 'card', id: 'privacidade' },
    h('h2', null, '🔒 Privacidade e onde ficam os dados'),
    h('ul', { class: 'plain' },
      item('Onde ficam.', 'Fotografias, avaliações, desafios e roteiro ficam guardados dentro do Safari deste iPhone (na base de dados local da app, associada ao endereço desta app). Não ficam na app Fotografias nem no iCloud.'),
      item('O que nunca acontece.', 'Nada é enviado para servidores: não há backend, contas, estatísticas, anúncios nem seguimento. O alojamento só entrega os ficheiros da app. As ligações “Abrir no Mapas” só abrem quando tocas nelas.'),
      item('Fotografias.', 'Quando tiras uma fotografia, a app guarda uma cópia reduzida só dentro dela. Para a ter na app Fotografias tens de exportar (Galeria › Exportar › Guardar em Fotografias).'),
      item('Localização.', 'Só é usada se tocares em “Usar a minha localização” ao editar uma paragem, e fica apenas no telemóvel.')
    ),
    h('h3', null, 'Como não perder nada'),
    h('ul', { class: 'plain' },
      item('Instala a app e usa só o ícone.', 'Os dados do Safari e os da app instalada no ecrã principal são separados.'),
      item('Mantém sempre o mesmo endereço.', 'Os dados pertencem ao endereço onde a app foi aberta; noutro endereço a app começa vazia.'),
      item('Cuidado com a limpeza.', 'Apagar os dados dos sites do Safari ou a app do ecrã principal apaga também tudo isto. O Safari pode ainda limpar dados de sites não instalados que fiquem cerca de 7 dias sem uso; as apps instaladas no ecrã principal não estão sujeitas a esta regra.'),
      item('Faz uma cópia no fim.', 'Usa a cópia de segurança abaixo (ZIP com tudo) e guarda-a no Ficheiros ou envia-a para ti.'),
      item('Cada telemóvel é independente.', 'Se a tua companheira abrir a app no telemóvel dela, terá dados próprios; não há sincronização.')
    )
  );
}

/* ---------- armazenamento ---------- */

function storageCard(photos) {
  const usage = h('p', { class: 'muted' }, 'A calcular…');
  (async () => {
    const parts = [`Fotografias na app: ${formatBytes(photos.totalBytes())} (${plural(photos.all().length, 'ficheiro', 'ficheiros')}).`];
    try {
      if (navigator.storage?.estimate) {
        const { usage: u, quota } = await navigator.storage.estimate();
        if (Number.isFinite(u)) parts.push(`Espaço usado pelo site: ${formatBytes(u)}${Number.isFinite(quota) ? ` de ${formatBytes(quota)} disponíveis` : ''}.`);
      }
      if (navigator.storage?.persisted) parts.push((await navigator.storage.persisted()) ? 'Armazenamento marcado como persistente.' : 'Armazenamento não marcado como persistente (normal no iOS; instalar no ecrã principal ajuda).');
    } catch { /* ignorar */ }
    usage.textContent = parts.join(' ');
  })();
  return h('section', { class: 'card' }, h('h2', null, 'Armazenamento'), usage);
}

/* ---------- diagnóstico ---------- */

function diagnosticCard() {
  const list = h('ul', { class: 'plain diag' });
  const btn = h('button', { class: 'btn', type: 'button', onclick: async () => {
    btn.disabled = true;
    btn.textContent = 'A testar…';
    try {
      const results = await runDiagnostics();
      clear(list);
      for (const r of results) {
        list.append(h('li', { class: `diag-item ${r.status}` },
          h('span', { class: 'diag-mark', 'aria-hidden': 'true' }, r.status === 'ok' ? '✓' : r.status === 'warn' ? '!' : '✕'),
          h('div', null, h('strong', null, r.label), h('div', { class: 'muted small' }, r.detail),
            h('span', { class: 'sr-only' }, r.status === 'ok' ? 'Resultado: OK' : r.status === 'warn' ? 'Resultado: atenção' : 'Resultado: falhou'))));
      }
    } catch (err) {
      console.error(err);
      toast('Não foi possível executar o diagnóstico.');
    }
    btn.disabled = false;
    btn.textContent = 'Executar diagnóstico outra vez';
  } }, 'Executar diagnóstico');
  return h('section', { class: 'card' },
    h('h2', null, 'Diagnóstico do telemóvel'),
    h('p', null, 'Antes do rally, confirma em 10 segundos que a app guarda fotografias, funciona sem rede e consegue exportar. Corre só neste telemóvel e não mexe nos teus dados.'),
    btn, list);
}

/* ---------- cópia de segurança ---------- */

function backupCard({ state, photos }) {
  const fileInput = h('input', { id: 'import-zip', class: 'visually-hidden', type: 'file', accept: '.zip,application/zip', onchange: async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try {
      data = await readBackupZip(file);
    } catch (err) {
      toast(err.message || 'Ficheiro inválido.', { ms: 5000 });
      return;
    }
    const ok = await confirmDialog({
      title: 'Substituir os dados desta app?',
      message: `A cópia tem ${plural(data.state.stops.length, 'paragem', 'paragens')} e ${plural(data.photos.length, 'fotografia', 'fotografias')}. Tudo o que está agora nesta app será substituído.`,
      confirmText: 'Substituir tudo', danger: true,
    });
    if (!ok) return;
    try {
      await photos.removeAll();
      for (const p of data.photos) await photos.restore(p);
      await store.replaceState(data.state);
      toast('Cópia restaurada.');
    } catch (err) {
      console.error(err);
      toast('A restauração falhou a meio. Tenta de novo.', { ms: 5000 });
    }
  } });
  return h('section', { class: 'card' },
    h('h2', null, 'Cópia de segurança'),
    h('p', null, 'Um único ficheiro ZIP com fotografias, avaliações (também em CSV) e os dados para restaurar.'),
    backupControl({ state, photos, label: 'Preparar cópia de segurança' }),
    h('hr'),
    h('p', null, 'Restaurar a partir de uma cópia feita por esta app:'),
    h('label', { class: 'btn', for: 'import-zip' }, 'Importar cópia de segurança'),
    fileInput
  );
}

/* ---------- reiniciar ---------- */

function openReset({ state, photos, go }) {
  const prog = progress(state, photos.counts());
  const keepStops = h('input', { type: 'checkbox', checked: true, id: 'keep-stops' });
  const keepPlayers = h('input', { type: 'checkbox', checked: true, id: 'keep-players' });
  const confirmInput = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'REINICIAR', 'aria-label': 'Escreve REINICIAR para confirmar' });
  const go1 = h('button', { class: 'btn danger', type: 'button', disabled: true, onclick: async () => {
    if (confirmInput.value.trim().toUpperCase() !== 'REINICIAR') return;
    go1.disabled = true;
    try {
      await photos.removeAll();
      await store.resetRally({ keepStops: keepStops.checked, keepPlayers: keepPlayers.checked });
      sheet.close();
      toast('Rally reiniciado.');
      go('#/');
    } catch (err) {
      console.error(err);
      go1.disabled = false;
      toast('Não foi possível reiniciar.');
    }
  } }, 'Apagar e reiniciar');
  confirmInput.addEventListener('input', () => { go1.disabled = confirmInput.value.trim().toUpperCase() !== 'REINICIAR'; });

  const sheet = openSheet({
    title: 'Reiniciar o rally?',
    content: h('div', { class: 'stack' },
      h('p', null, h('strong', null, 'Vai apagar: '), `${plural(prog.visited, 'visita', 'visitas')}, ${plural(prog.challengesRevealed, 'desafio', 'desafios')}, todas as avaliações e ${plural(photos.all().length, 'fotografia', 'fotografias')} guardadas nesta app. Não se pode desfazer.`),
      h('div', { class: 'note' }, 'Antes de apagar, guarda uma cópia (as fotografias só existem aqui, a menos que as tenhas exportado):'),
      backupControl({ state, photos, label: 'Preparar cópia de segurança' }),
      h('label', { class: 'check' }, keepStops, ' Manter as paragens do roteiro'),
      h('label', { class: 'check' }, keepPlayers, ' Manter os nomes dos jogadores'),
      h('label', { class: 'field' }, h('span', null, 'Para confirmar, escreve REINICIAR'), confirmInput),
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => sheet.close() }, 'Cancelar'), go1)
    ),
  });
}

function resetCard(ctx) {
  return h('section', { class: 'card danger-zone' },
    h('h2', null, 'Reiniciar rally'),
    h('p', null, 'Começa um rally novo: apaga visitas, desafios, avaliações e fotografias. Pede confirmação.'),
    h('button', { class: 'btn danger-outline', type: 'button', onclick: () => openReset(ctx) }, 'Reiniciar o rally…')
  );
}

export function renderMais(ctx) {
  const { state, photos } = ctx;
  return h('div', { class: 'view' },
    pageHeader({ title: 'Mais', subtitle: 'Definições, privacidade e cópia de segurança' }),
    h('div', { class: 'content' },
      playersCard(state),
      privacyCard(),
      storageCard(photos),
      diagnosticCard(),
      backupCard(ctx),
      resetCard(ctx),
      h('p', { class: 'muted small center' }, `Rally Gastronómico ${APP_VERSION} · funciona sem rede · sem seguimento`)
    )
  );
}
