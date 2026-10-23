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

/* Percurso real (ordem fixa). Moradas e coordenadas confirmadas em fonte de mapas (Google Places, out. 2026).
 * Horários de funcionamento NÃO são guardados: ficam por confirmar (campo `hours` vazio, editável na app). */
export const ROUTE = [
  {
    name: 'Cervejaria Gazela', short: 'Gazela', zone: 'Batalha', specialty: 'Cachorrinho',
    address: 'Travessa de Cimo de Vila, 4, Porto', lat: 41.1448829, lng: -8.607595,
    ask: 'Um cachorrinho para partilhar.',
    desc: 'Casa conhecida pelo cachorrinho, uma sandes pequena e quente com salsicha.',
  },
  {
    name: 'Casa Guedes Tradicional', short: 'Casa Guedes', zone: 'Poveiros', specialty: 'Sandes de pernil',
    address: 'Praça dos Poveiros, 130, Porto', lat: 41.146016, lng: -8.6034864,
    ask: 'Uma sandes de pernil para partilhar. Queijo da Serra como extra opcional.',
    desc: 'Casa conhecida pela sandes de pernil.',
  },
  {
    name: 'Café Santiago', short: 'Café Santiago', zone: 'Passos Manuel', specialty: 'Francesinha',
    address: 'Rua de Passos Manuel, 226, Porto', lat: 41.1463821, lng: -8.6048251,
    ask: 'Partilhar uma francesinha, se o restaurante permitir.',
    desc: 'Casa conhecida pela francesinha. Prova opcional: é uma refeição pesada.',
    optional: true,
  },
  {
    name: 'Conga — Casa das Bifanas', short: 'Conga', zone: 'Bonjardim', specialty: 'Bifana',
    address: 'Rua do Bonjardim, 318, Porto', lat: 41.1489414, lng: -8.6093776,
    ask: 'Uma bifana para partilhar.',
    desc: 'Casa conhecida pela bifana.',
  },
  {
    name: 'Confeitaria do Bolhão', short: 'Bolhão', zone: 'Bolhão', specialty: 'Pastelaria tradicional',
    address: 'Rua Formosa, 339, Porto', lat: 41.1485339, lng: -8.6075535,
    ask: 'Dois doces pequenos para partilhar, ou um doce e dois cafés.',
    desc: 'Pastelaria e confeitaria tradicional na zona do Bolhão.',
  },
];

export const RALLY_WINDOW = '18:00–21:00';

const STOP_DEFAULTS = { note: '', example: false, short: '', zone: '', specialty: '', ask: '', desc: '', hours: '', optional: false };

export function seedStops() {
  return ROUTE.map((s) => ({ id: uid('s'), ...STOP_DEFAULTS, ...s }));
}

/** Migração v1 → v2: se o roteiro ainda é só o de demonstração (todas as paragens marcadas como exemplo),
 *  substitui-o pelo percurso real MANTENDO os ids das paragens (visitas, desafios, avaliações e fotografias
 *  continuam ligados). Se o utilizador já editou alguma paragem, nada é substituído. Devolve true se alterou. */
export function upgradeState(state) {
  const stops = state.stops;
  if (!stops.length || !stops.every((x) => x.example)) return false;
  const real = ROUTE;
  const hasData = (id) => !!(state.visits[id] || state.challenges[id] || state.ratings[id]);
  const out = [];
  stops.forEach((old, i) => {
    if (i < real.length) out.push({ ...STOP_DEFAULTS, ...real[i], id: old.id });
    else if (hasData(old.id)) out.push(old); // nunca apagar paragens com registos
  });
  for (let i = stops.length; i < real.length; i++) out.push({ id: uid('s'), ...STOP_DEFAULTS, ...real[i] });
  state.stops = out;
  return true;
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
  };
}
