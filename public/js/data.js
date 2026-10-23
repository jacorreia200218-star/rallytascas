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

/* Paragens de exemplo (marcadas como tal). A app pede para as substituírem pelo roteiro real. */
export function seedStops() {
  return [
    { name: 'Paragem de exemplo 1', address: 'Ribeira', lat: 41.1407, lng: -8.613 },
    { name: 'Paragem de exemplo 2', address: 'Clérigos', lat: 41.1458, lng: -8.6145 },
    { name: 'Paragem de exemplo 3', address: 'Aliados', lat: 41.1485, lng: -8.611 },
    { name: 'Paragem de exemplo 4', address: 'Bolhão', lat: 41.1496, lng: -8.6074 },
    { name: 'Paragem de exemplo 5', address: 'Cedofeita', lat: 41.1536, lng: -8.6226 },
  ].map((s) => ({ id: uid('s'), note: '', example: true, ...s }));
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
