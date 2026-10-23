/* Catálogo de desafios do casal (tudo guardado localmente, funciona sem rede).
 *
 * Cada desafio: { id, cat, title, text, scoring, secret?, riddle?, timer?, stop? }
 *  - scoring: 'none' (só conta como concluído) | 'guess' (acertar → 1 ponto individual)
 *             | 'gastro' (vencer → 1 ponto individual) | 'compare' (regista o vencedor da comparação)
 *  - secret: { prompts: [{ q, opts }] } respostas dadas em segredo, uma pessoa de cada vez, e reveladas juntas.
 *            opts: 'players' (os nomes dos dois) | 'scale10' (0 a 10) | lista de textos.
 *  - riddle: { q, a } adivinha com resposta escondida até se tocar em “Ver resposta”.
 *  - timer: segundos do cronómetro opcional.
 * Nenhum desafio exige respostas íntimas: quem não quiser responder usa “Outro desafio” ou “Saltar”. */
import { CHALLENGES as LEGACY } from './data.js';

export const CATS = {
  conhecem: { label: 'Conhecem-se mesmo?' },
  adivinha: { label: 'Adivinha quem' },
  enigma: { label: 'Adivinhas e enigmas' },
  escolha: { label: 'Escolha impossível' },
  memorias: { label: 'Memórias do casal' },
  gastro: { label: 'Desafio gastronómico' },
  romantico: { label: 'Romântico, mas sem vergonha' },
  surpresa: { label: 'Desafio surpresa' },
};

const c = (id, cat, title, text, extra = {}) => ({ id, cat, title, text, scoring: 'none', ...extra });

/* ---------- desafios por paragem (o 1.º é o principal; os restantes são alternativas) ---------- */

export const STOP_CHALLENGES = {
  gazela: [
    c('gz1', 'gastro', 'Críticos gastronómicos',
      'Cada pessoa dá uma nota secreta ao cachorrinho, de 0 a 10. Revelem as notas e justifiquem a vossa em apenas 15 segundos.',
      { scoring: 'gastro', timer: 15, secret: { prompts: [{ q: 'Nota secreta ao cachorrinho (0 a 10)', opts: 'scale10' }] } }),
    c('gz2', 'adivinha', 'Adivinha o ingrediente',
      'Um de vós escolhe mentalmente um ingrediente ou característica do cachorrinho. O outro tem três perguntas de resposta sim/não para adivinhar.',
      { scoring: 'guess' }),
    c('gz3', 'gastro', 'Primeira dentada',
      'Cada um descreve a primeira dentada em cinco palavras. Votem juntos na descrição que mais dá vontade de comer.',
      { scoring: 'gastro' }),
    c('gz4', 'surpresa', 'Nome artístico',
      'Inventem um nome de cantor(a) para o cachorrinho e apresentem-no, em 10 segundos, como se fosse a abertura de um concerto.',
      { timer: 10 }),
  ],
  rissois: [
    c('rs1', 'adivinha', 'Adivinha o recheio',
      'Um de vós escolhe um dos rissóis e descreve o sabor sem dizer o ingrediente principal. O outro tem três tentativas para adivinhar.',
      { scoring: 'guess' }),
    c('rs2', 'gastro', 'Prémios Rally',
      'Decidam qual foi a melhor prova do percurso até ao momento e atribuam os prémios: melhor sabor, maior surpresa e melhor relação qualidade-diversão.'),
    c('rs3', 'surpresa', 'A história do rissol',
      'Cada um inventa, em 20 segundos, a história de vida do rissol que está a comer. Vence o final mais dramático (voto conjunto).',
      { timer: 20 }),
    c('rs4', 'romantico', 'Duas coisas boas',
      'Cada um diz duas coisas de que gostou neste rally até agora (uma pode ser sobre o outro, se quiser).'),
  ],
  guedes: [
    c('gd1', 'conhecem', 'Quem é mais provável?',
      'Respondam em segredo, um de cada vez, e revelem ao mesmo tempo. Vejam quantas vezes coincidem.',
      { secret: { prompts: [
        { q: 'Quem é mais provável chegar atrasado a um encontro?', opts: 'players' },
        { q: 'Quem é mais provável gastar dinheiro numa coisa desnecessária?', opts: 'players' },
        { q: 'Quem é mais provável organizar uma viagem de última hora?', opts: 'players' },
        { q: 'Quem é mais provável acabar com a comida do outro?', opts: 'players' },
      ] } }),
    c('gd2', 'memorias', 'A nossa primeira impressão',
      'Cada pessoa conta uma coisa de que se lembra da primeira impressão que teve da outra.'),
    c('gd3', 'enigma', 'Enigma da mesa',
      'Tentem resolver juntos. Quem acertar primeiro ganha o ponto.',
      { scoring: 'guess', riddle: { q: 'Tem cabeça mas não pensa, tem dentes mas não morde. O que é?', a: 'O alho.' } }),
    c('gd4', 'gastro', 'Pernil em três palavras',
      'Cada um descreve a sandes de pernil em exatamente três palavras. Votem na descrição mais saborosa.',
      { scoring: 'gastro' }),
  ],
  republica: [
    c('rp1', 'gastro', 'Gazela vs. República',
      'Comparem o cachorrinho desta paragem com o da Gazela. Cada um escolhe, em segredo, o seu favorito; depois revelam e justificam.',
      { scoring: 'compare', secret: { compare: ['gazela', 'republica'], prompts: [{ q: 'Qual foi o melhor cachorrinho?', opts: ['Gazela', 'República dos Cachorros'] }] } }),
    c('rp2', 'surpresa', 'Publicidade absurda',
      'Cada um tem 15 segundos para vender o cachorrinho como se fosse o produto mais extraordinário do mundo.',
      { timer: 15 }),
    c('rp3', 'adivinha', 'Adivinha a bebida',
      'Cada um adivinha, sem perguntar, a bebida que o outro pediria agora (pode ser sem álcool). Revelem e vejam quem acertou.',
      { scoring: 'guess' }),
    c('rp4', 'memorias', 'O melhor lanche de sempre',
      'Cada um conta o melhor lanche ou petisco que já comeram juntos e porque ficou na memória.'),
  ],
  conga: [
    c('cg1', 'escolha', 'Escolha impossível',
      'Escolham em segredo e revelem ao mesmo tempo. Depois cada um justifica a escolha em 20 segundos.',
      { timer: 20, secret: { prompts: [
        { q: 'Nunca mais comer doces ou nunca mais comer salgados?', opts: ['Sem doces', 'Sem salgados'] },
        { q: 'Escolher sempre o filme ou nunca poder escolher o restaurante?', opts: ['Escolher o filme', 'Nunca escolher o restaurante'] },
        { q: 'Repetir o primeiro encontro ou reviver o melhor dia juntos?', opts: ['Primeiro encontro', 'Melhor dia juntos'] },
      ] } }),
    c('cg2', 'adivinha', 'Adivinha a minha resposta',
      'Um de vós escolhe mentalmente o snack favorito do outro neste rally. O outro tenta adivinhar, explicando o raciocínio.',
      { scoring: 'guess' }),
    c('cg3', 'enigma', 'Enigma do caminho',
      'Tentem resolver juntos. Quem acertar ganha o ponto.',
      { scoring: 'guess', riddle: { q: 'Tenho cidades mas não tenho casas, tenho rios mas não tenho água. O que sou?', a: 'Um mapa.' } }),
    c('cg4', 'gastro', 'Os temperos da bifana',
      'Cada um aponta os dois temperos ou sabores que acha reconhecer na bifana. Ganha quem identificar mais, se concordarem.',
      { scoring: 'gastro' }),
  ],
  pastel: [
    c('pb1', 'gastro', 'MasterChef a dois',
      'Cada pessoa identifica três sabores ou ingredientes que acha que consegue reconhecer. Comparem as respostas e escolham o crítico gastronómico vencedor.',
      { scoring: 'gastro' }),
    c('pb2', 'surpresa', 'Dá-lhe um nome',
      'Inventem um nome completamente absurdo para o pastel e escrevam, em 20 segundos, a descrição que teria no menu de um restaurante de luxo.',
      { timer: 20 }),
    c('pb3', 'romantico', 'Pequenas coisas',
      'Cada um diz uma coisa pequena que o outro faz e que o faz sorrir. Sem repetir.'),
    c('pb4', 'escolha', 'Escolha de despedida',
      'Escolham em segredo e revelem ao mesmo tempo.',
      { secret: { prompts: [
        { q: 'Pastel de bacalhau para sempre ou rissol para sempre?', opts: ['Pastel de bacalhau', 'Rissol'] },
        { q: 'Comer sempre quente mas pequeno, ou frio mas enorme?', opts: ['Quente e pequeno', 'Frio e enorme'] },
      ] } }),
  ],
};

/* ---------- desafios gerais (para “Outro desafio” depois de esgotadas as alternativas da paragem) ---------- */

/* Os 24 desafios da versão anterior, agora com categoria. */
const LEGACY_CAT = {
  c01: 'romantico', c02: 'adivinha', c03: 'gastro', c04: 'surpresa', c05: 'surpresa', c06: 'surpresa', c07: 'gastro', c08: 'gastro',
  c09: 'surpresa', c10: 'gastro', c11: 'gastro', c12: 'romantico', c13: 'adivinha', c14: 'romantico', c15: 'memorias', c16: 'surpresa',
  c17: 'surpresa', c18: 'memorias', c19: 'gastro', c20: 'surpresa', c21: 'surpresa', c22: 'memorias', c23: 'gastro', c24: 'gastro',
};
const LEGACY_SCORING = { c02: 'guess', c11: 'guess', c13: 'guess' };
const legacyPool = LEGACY.map((l) => c(l.id, LEGACY_CAT[l.id] || 'surpresa', l.title, l.text, { scoring: LEGACY_SCORING[l.id] || 'none' }));

const extraPool = [
  c('g01', 'conhecem', 'Três coisas sobre mim', 'Cada um diz três coisas sobre si (duas verdadeiras e uma inventada). O outro adivinha qual é a inventada.', { scoring: 'guess' }),
  c('g02', 'conhecem', 'Comida de conforto', 'Cada um diz qual é a sua comida de conforto, sem o outro ouvir. Revelem e vejam se coincidem com o que o outro pensava.'),
  c('g03', 'conhecem', 'Hábitos', 'Cada um diz um hábito pequeno do outro de que gosta e um de que se ri (com carinho).'),
  c('g04', 'adivinha', 'Adivinha quem', 'Cada um escreve na cabeça o filme que o outro escolheria hoje. Revelem e vejam quem acertou.', { scoring: 'guess' }),
  c('g05', 'enigma', 'Enigma da escada', 'Tentem resolver juntos.', { scoring: 'guess', riddle: { q: 'Sobe e desce sem sair do sítio. O que é?', a: 'A escada.' } }),
  c('g06', 'enigma', 'Enigma do buraco', 'Tentem resolver juntos.', { scoring: 'guess', riddle: { q: 'Quanto mais se tira, maior fica. O que é?', a: 'Um buraco.' } }),
  c('g07', 'escolha', 'Dois dilemas rápidos', 'Escolham em segredo e revelem ao mesmo tempo.', { secret: { prompts: [
    { q: 'Mar ou montanha para as próximas férias?', opts: ['Mar', 'Montanha'] },
    { q: 'Pequeno-almoço por todo o lado ou jantar por todo o lado?', opts: ['Pequeno-almoço', 'Jantar'] },
  ] } }),
  c('g08', 'escolha', 'Superpoder', 'Escolham em segredo e revelem ao mesmo tempo.', { secret: { prompts: [
    { q: 'Teletransporte ou nunca ter de esperar por nada?', opts: ['Teletransporte', 'Sem esperas'] },
  ] } }),
  c('g09', 'memorias', 'Uma viagem', 'Cada um conta a viagem (ou passeio) que mais gostou de fazer com o outro e porquê.'),
  c('g10', 'romantico', 'Obrigado por', 'Cada um agradece ao outro por uma coisa concreta desta semana.'),
  c('g11', 'surpresa', 'Crítica exageradamente séria', 'Cada um faz uma crítica gastronómica solene, de 15 segundos, ao prato que tem à frente.', { timer: 15 }),
];

export const GENERAL = [...extraPool, ...legacyPool];
export const ALL = [...Object.values(STOP_CHALLENGES).flat(), ...GENERAL];
const BY_ID = new Map(ALL.map((x) => [x.id, x]));

export const getChallenge = (id) => BY_ID.get(id) || null;

export function challengesForStop(key) {
  return STOP_CHALLENGES[key] || [];
}

/** Desafio principal proposto à chegada: o da paragem; para paragens sem catálogo, um geral ainda não usado. */
export function mainChallenge(stop, used = new Set(), rnd = Math.random) {
  const own = challengesForStop(stop.key);
  if (own.length) return own[0];
  return pickGeneral(used, null, rnd);
}

function pickGeneral(used, currentId, rnd) {
  let pool = GENERAL.filter((x) => !used.has(x.id) && x.id !== currentId);
  if (!pool.length) pool = GENERAL.filter((x) => x.id !== currentId);
  return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
}

/** “Outro desafio”: primeiro as alternativas desta paragem que ainda não saíram; depois um desafio geral que
 *  ainda não tenha sido usado em nenhuma paragem. Nunca repete o desafio atual. */
export function nextChallenge(stop, { seen = [], used = new Set(), currentId = null } = {}, rnd = Math.random) {
  const seenSet = new Set(seen);
  const own = challengesForStop(stop.key).find((x) => !seenSet.has(x.id) && x.id !== currentId && !used.has(x.id));
  if (own) return own;
  const pool = GENERAL.filter((x) => !seenSet.has(x.id) && !used.has(x.id) && x.id !== currentId);
  if (pool.length) return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
  // tudo usado: recomeça, mas nunca devolve o atual
  const all = [...challengesForStop(stop.key), ...GENERAL].filter((x) => x.id !== currentId);
  return all[Math.min(all.length - 1, Math.floor(rnd() * all.length))];
}

/** Ids de desafios que já saíram em qualquer paragem (para não repetir perguntas durante o percurso). */
export function usedChallengeIds(state) {
  const used = new Set();
  for (const rec of Object.values(state.challenges || {})) {
    if (rec.challengeId) used.add(rec.challengeId);
    for (const id of rec.seen || []) used.add(id);
  }
  return used;
}

/** Opções (textos) de uma pergunta secreta, resolvidas para os jogadores atuais. */
export function promptOptions(prompt, players) {
  if (prompt.opts === 'players') return players.map((p) => p.name);
  if (prompt.opts === 'scale10') return Array.from({ length: 11 }, (_, i) => String(i));
  return prompt.opts;
}
