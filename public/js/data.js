/* Conteúdo da aplicação: desafios surpresa e paragens de exemplo. */
import { SCHEMA_VERSION, uid } from './logic.js';

/* Todos os desafios são opcionais e nenhum envolve álcool, pressa ou dinheiro.
 * (Alergias/preferências: quem decide é sempre quem está à mesa.) */
export const CHALLENGES = [
  { id: 'c01', title: 'Brinde mudo', text: 'Façam um brinde sem dizerem uma única palavra, só com o olhar e um sorriso.', points: 5 },
  { id: 'c02', title: 'Quanto vai custar?', text: 'Antes de pedirem a conta, cada um escreve num guardanapo o total. Quem ficar mais perto ganha.', points: 10 },
  { id: 'c03', title: 'Escolhe por mim', text: 'Cada um escolhe um petisco para o outro experimentar, sem dizer o que é antes da primeira dentada.', points: 10 },
  { id: 'c04', title: 'Três palavras', text: 'Descrevam esta tasca em exatamente três palavras cada. Não vale repetir as do outro.', points: 5 },
  { id: 'c05', title: 'Pose de crítico', text: 'Fotografia séria de críticos gastronómicos, com o prato como protagonista.', points: 5 },
  { id: 'c06', title: 'Pergunta ao dono', text: 'Perguntem a quem vos atende qual é a história da casa ou o prato de que mais se orgulha, e contem o que descobriram.', points: 15 },
  { id: 'c07', title: 'A sugestão da casa', text: 'Peçam a recomendação do dia (a quem vos atende) e experimentem-na, mesmo que não fosse a vossa primeira escolha.', points: 15 },
  { id: 'c08', title: 'Mestre da metáfora', text: 'Descrevam o sabor do prato com uma metáfora, sem usar a palavra "bom".', points: 10 },
  { id: 'c09', title: 'Desenho de guardanapo', text: 'Desenhem a tasca (ou o prato) em 60 segundos. Fotografem o resultado.', points: 10 },
  { id: 'c10', title: 'Ranking relâmpago', text: 'Ordenem três coisas da mesa (pratos, bebidas ou sobremesas) do melhor para o pior e defendam a vossa lista.', points: 10 },
  { id: 'c11', title: 'Prova às cegas', text: 'Um de vós fecha os olhos e tenta adivinhar o ingrediente principal de uma garfada escolhida pelo outro.', points: 10 },
  { id: 'c12', title: 'Elogio sincero', text: 'Digam um elogio sincero um ao outro. Sem repetir e sem ser sobre comida.', points: 5 },
  { id: 'c13', title: 'Origem do prato', text: 'Tentem adivinhar de onde vem o prato ou o ingrediente principal e depois confirmem perguntando.', points: 10 },
  { id: 'c14', title: 'Sem ecrãs', text: 'Durante dez minutos, telemóveis guardados. Só vale tirar a fotografia do prato antes de comerem.', points: 10 },
  { id: 'c15', title: 'Cartão-postal', text: 'Escrevam duas frases para vós próprios daqui a um ano sobre este momento, e guardem-nas nas notas da paragem.', points: 10 },
  { id: 'c16', title: 'À portuense', text: 'Façam o próximo pedido usando uma expressão bem do Porto, com simpatia e sem exageros.', points: 5 },
  { id: 'c17', title: 'Moeda ao ar', text: 'Tirem à moeda quem escolhe o caminho a pé até à próxima paragem.', points: 5 },
  { id: 'c18', title: 'Recriar a primeira vez', text: 'Recriem, numa fotografia, a pose da vossa primeira refeição juntos.', points: 10 },
  { id: 'c19', title: 'Dueto de sabores', text: 'Partilhem uma dose e cada um aponta o ingrediente que mais se destaca. Pontos se concordarem.', points: 5 },
  { id: 'c20', title: 'Fotografia ao contrário', text: 'Fotografem o prato de um ângulo inesperado (de cima, rente à mesa, refletido). Escolham a melhor.', points: 5 },
  { id: 'c21', title: 'Nota do menu', text: 'Atribuam uma nota de 0 a 20 ao nome mais criativo da ementa e expliquem porquê.', points: 5 },
  { id: 'c22', title: 'Memória do dia', text: 'Cada um conta a melhor coisa que comeu neste rally até agora. Há direito a defesa.', points: 5 },
  { id: 'c23', title: 'Troca de pratos', text: 'Troquem de prato a meio da refeição e façam uma crítica ao prato do outro (em modo simpático).', points: 10 },
  { id: 'c24', title: 'Melhor sítio da mesa', text: 'Descubram, por votação secreta, qual foi o melhor detalhe da tasca: comida, ambiente ou pessoas.', points: 5 },
];

/* Percurso real (ordem fixa, otimizada para andar o mínimo possível: ver README).
 * Moradas e coordenadas confirmadas em fonte de mapas (Google Places, out. 2026).
 * Horários de funcionamento NÃO são guardados: ficam por confirmar (campo `hours` vazio, editável na app). */
export const ROUTE = [
  {
    key: 'gazela', name: 'Cervejaria Gazela', short: 'Gazela', zone: 'Batalha', specialty: 'Cachorrinho',
    address: 'Travessa de Cimo de Vila, 4, Porto', lat: 41.1448829, lng: -8.607595,
    ask: 'Um cachorrinho para partilhar.',
    desc: 'Casa conhecida pelo cachorrinho, uma sandes pequena e quente com salsicha.',
  },
  {
    key: 'rissois', name: 'Oficina dos Rissóis', short: 'Rissóis', zone: 'São Lázaro', specialty: 'Rissóis',
    address: 'Passeio de São Lázaro, 5A, Porto', lat: 41.1458008, lng: -8.6033419,
    ask: 'Dois rissóis de sabores diferentes.',
    desc: 'Casa de rissóis, junto ao Passeio de São Lázaro.',
  },
  {
    key: 'guedes', name: 'Casa Guedes Tradicional', short: 'Casa Guedes', zone: 'Poveiros', specialty: 'Sandes de pernil',
    address: 'Praça dos Poveiros, 130, Porto', lat: 41.146016, lng: -8.6034864,
    ask: 'Uma sandes de pernil para partilhar.',
    desc: 'Casa conhecida pela sandes de pernil.',
  },
  {
    key: 'republica', name: 'República dos Cachorros', short: 'República', zone: 'Santo André', specialty: 'Cachorrinho',
    address: 'Rua de Santo André, 28, Porto', lat: 41.1461777, lng: -8.6045061,
    ask: 'Um cachorrinho para partilhar (e comparar com o da Gazela).',
    desc: 'Casa de cachorrinhos. Morada conforme o mapa (listado como “República dos Cachorros 2”): confirma no local.',
  },
  {
    key: 'conga', name: 'Conga — Casa das Bifanas', short: 'Conga', zone: 'Bonjardim', specialty: 'Bifana',
    address: 'Rua do Bonjardim, 318, Porto', lat: 41.1489414, lng: -8.6093776,
    ask: 'Uma bifana para partilhar.',
    desc: 'Casa conhecida pela bifana.',
  },
  {
    key: 'pastel', name: 'Casa Portuguesa do Pastel de Bacalhau', short: 'Pastel de Bacalhau', zone: 'Rua das Flores', specialty: 'Pastel de bacalhau com queijo da Serra',
    address: 'Rua das Flores, 78–82, Porto', lat: 41.1437088, lng: -8.6136669,
    ask: 'Um pastel de bacalhau com queijo da Serra para partilhar.',
    desc: 'Loja da Rua das Flores dedicada ao pastel de bacalhau.',
  },
];

export const RALLY_WINDOW = '18:00–21:00';

const STOP_DEFAULTS = { note: '', example: false, key: '', short: '', zone: '', specialty: '', ask: '', desc: '', hours: '', optional: false };

export function seedStops() {
  return ROUTE.map((s) => ({ id: uid('s'), ...STOP_DEFAULTS, ...s }));
}

/* Nomes do percurso da versão anterior (5 paragens), para reconhecer roteiros ainda não editados. */
const LEGACY_KEYS = {
  'Cervejaria Gazela': 'gazela', 'Casa Guedes Tradicional': 'guedes', 'Café Santiago': 'santiago',
  'Conga — Casa das Bifanas': 'conga', 'Confeitaria do Bolhão': 'bolhao',
};

/** Migrações do roteiro. Nunca apagam paragens com registos; mantêm os ids (visitas, avaliações,
 *  desafios e fotografias continuam ligados). Devolve true se alterou o estado.
 *  1) v1: roteiro só de demonstração (todas `example`) → percurso real, por posição.
 *  2) v2: roteiro anterior de 5 paragens, sem edições (nomes conhecidos, sem `key`) → novo percurso de 6,
 *     reaproveitando as paragens que coincidem (Gazela, Casa Guedes, Conga). Paragens que deixam de fazer parte
 *     (Café Santiago, Confeitaria do Bolhão) só são mantidas, no fim, se tiverem registos.
 *  Se o utilizador editou o roteiro (nomes diferentes), nada é substituído. */
export function upgradeState(state) {
  const stops = state.stops;
  if (!stops.length) return false;
  const hasData = (id) => !!(state.visits[id] || state.challenges[id] || state.ratings[id]);

  if (stops.every((x) => x.example)) {
    const out = [];
    stops.forEach((old, i) => {
      if (i < ROUTE.length) out.push({ ...STOP_DEFAULTS, ...ROUTE[i], id: old.id });
      else if (hasData(old.id)) out.push(old);
    });
    for (let i = stops.length; i < ROUTE.length; i++) out.push({ id: uid('s'), ...STOP_DEFAULTS, ...ROUTE[i] });
    state.stops = out;
    return true;
  }

  const known = stops.every((x) => !x.example && (x.key || LEGACY_KEYS[x.name]));
  if (known && stops.some((x) => !x.key)) {
    const byKey = new Map();
    for (const x of stops) byKey.set(x.key || LEGACY_KEYS[x.name], x);
    const used = new Set();
    const out = ROUTE.map((r) => {
      const old = byKey.get(r.key);
      if (old) {
        used.add(old.id);
        return { ...STOP_DEFAULTS, ...r, id: old.id, hours: old.hours || '', note: old.note || '' };
      }
      return { id: uid('s'), ...STOP_DEFAULTS, ...r };
    });
    for (const x of stops) {
      if (!used.has(x.id) && hasData(x.id)) out.push({ ...x, key: x.key || LEGACY_KEYS[x.name] });
    }
    state.stops = out;
    return true;
  }
  return false;
}

export function createInitialState(now = new Date()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    setupDone: false,
    players: [
      { id: 'p1', name: 'Jogador 1' },
      { id: 'p2', name: 'Jogador 2' },
    ],
    stops: seedStops(),
    visits: {},
    challenges: {},
    ratings: {},
    settings: { hideInstallHint: false },
    summary: { favorites: {}, best: null, compare: null },
  };
}
