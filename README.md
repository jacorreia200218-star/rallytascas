# Rally Gastronómico 🍽️

PWA privada, em português de Portugal, para fazer um roteiro de tascas a dois (neste caso, pelo Porto).
Corre inteiramente no telemóvel: **sem backend, sem contas, sem estatísticas**. Fotografias e avaliações
ficam guardadas só no iPhone.

## O que faz

- **Roteiro**: mapa esquemático (funciona sem rede) com o percurso e o estado de cada paragem; lista editável
  (adicionar uma a uma ou colar várias de uma vez); botões “Abrir no Mapas” e “Google Maps” por paragem.
- **Desafios surpresa**: 24 desafios opcionais, sem álcool nem pressas. Revelam-se em cada paragem, sem repetir.
- **Fotografias**: câmara ou biblioteca, associadas à paragem, reduzidas a 1920 px no próprio telemóvel.
- **Avaliação individual** (cada um dos dois): comida, qualidade/preço, ambiente e atendimento, 1–5 estrelas.
- **Ranking** das paragens, **duelo** entre os dois jogadores, **conquistas** e **progresso**.
- **Galeria** e **exportação**: folha de partilha do iPhone (“Guardar imagem” → app Fotografias) e ZIP completo.
- **Reiniciar o rally** com confirmação escrita.
- **Cópia de segurança** (ZIP com fotografias, `avaliacoes.csv` e dados) e **restauro**.
- **Diagnóstico** (Mais › Diagnóstico do telemóvel) para confirmar, no próprio iPhone, que tudo funciona.

## Privacidade (resumo; a app tem o texto completo em Mais › Privacidade)

| Pergunta | Resposta |
| --- | --- |
| Onde ficam os dados? | Na base de dados local do Safari deste iPhone (IndexedDB), associada ao endereço da app. |
| Vai para algum servidor? | Não. O alojamento só entrega os ficheiros da app. A página tem uma política de segurança (`connect-src 'self'`) que impede pedidos a outros servidores, e há um teste automático a verificar que o código não tem `fetch`, analytics nem seguimento. |
| As fotografias ficam na app Fotografias? | **Não**, a menos que as exportes (Galeria › Exportar › Guardar em Fotografias). A app diz isto sempre que guarda uma fotografia. |
| Posso perder os dados? | Sim: se limpares os dados dos sites do Safari, apagares a app do ecrã principal, ou mudares o endereço da app. Faz uma cópia de segurança no fim (e a meio). |

## Como publicar (HTTPS) sem usar Node nem servidores

A pasta a publicar é **`public/`** (não há passo de compilação). Escolhe **um** caminho e mantém-no:
os dados da app pertencem ao endereço (`https://…`). **Se o endereço mudar, a app abre vazia.**

### Caminho recomendado: GitHub + Cloudflare Pages

1. **Cria um repositório no GitHub** (pode ser privado) e envia lá o conteúdo desta pasta
   (ver “Enviar para o GitHub” abaixo).
2. No painel da Cloudflare (conta gratuita): **Workers & Pages › Create application › Pages › Connect to Git**.
3. Escolhe **GitHub**, autoriza, seleciona o repositório e escolhe **Begin setup**.
4. Em **Set up builds and deployments**:
   - **Project name**: escolhe um nome e **não o mudes mais** (define o endereço `https://NOME.pages.dev`).
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: deixa **vazio**
   - **Build output directory**: `public`
5. **Save and Deploy**. Quando terminar, o endereço aparece no painel.
6. Daí em diante, cada alteração enviada para o ramo `main` publica automaticamente, **no mesmo endereço**.

> ⚠️ Não uses “Direct Upload” (arrastar a pasta) se quiseres GitHub mais tarde: um projeto criado assim
> [não pode passar para Git](https://developers.cloudflare.com/pages/get-started/direct-upload/), o que obrigaria
> a um novo endereço (e a app começaria vazia). Também não uses o “Cloudflare Drop”: os sites ficam numa conta temporária
> e **expiram** se não forem reclamados.

### Alternativa: GitHub + Vercel

1. Em vercel.com, **Add New… › Project › Import Git Repository** e escolhe o repositório.
2. **Framework Preset**: `Other`. O ficheiro `vercel.json` já indica a pasta `public` e não há comando de build.
3. **Deploy**. O endereço é `https://NOME.vercel.app`. Também aqui: não mudes o nome do projeto.

### Enviar para o GitHub (sem linha de comandos)

- No GitHub: **New repository** (vazio, sem README). Depois **uploading an existing file** e arrasta o
  **conteúdo desta pasta** (incluindo `public/`, `vercel.json`, etc.). **Commit changes**.
- Alternativa com Git, na pasta do projeto:
  `git remote add origin https://github.com/SEU_UTILIZADOR/rally-gastronomico.git && git push -u origin main`

## Instalar no iPhone

1. No **Safari** (tem de ser o Safari), abre o endereço `https://…` da app.
2. Toca em **Partilhar** (quadrado com seta) › **Adicionar ao ecrã principal** › **Adicionar**.
3. Fecha o Safari e abre a app **pelo ícone “Rally”**. A partir daqui, usa sempre o ícone.
   (Os dados do Safari e os da app instalada são separados: não comeces no Safari para continuares no ícone.)
4. Na primeira abertura, **liga-te à internet** para a app guardar todos os ficheiros e funcionar offline.

## Checklist antes do rally (5 minutos, no iPhone)

1. Abre a app pelo ícone, escreve os nomes e cria as paragens reais (Roteiro › Editar roteiro).
2. **Mais › Executar diagnóstico**: todos os itens devem estar ✓ (ou “!” explicado).
3. Numa paragem de teste: tira uma fotografia, avalia, revela um desafio. Fecha a app e abre-a outra vez: tudo deve estar lá.
4. **Galeria › Exportar › Guardar em Fotografias** e confirma que a imagem aparece na app Fotografias.
5. Modo avião, abre a app: deve abrir normalmente.
6. **Mais › Reiniciar o rally** antes de começar a sério (mantém roteiro e nomes).

## Atualizar a app

Altera os ficheiros em `public/`, aumenta `VERSION` em `public/sw.js` (por exemplo de `v1` para `v2`) e envia para o
`main`. Na abertura seguinte, com rede, a app mostra “Nova versão instalada”. Os dados do rally não são tocados.

## Estrutura

```
public/            ← tudo o que é publicado
  index.html, manifest.webmanifest, sw.js, _headers, icons/, css/
  js/              app.js, store.js, db.js, logic.js, data.js, photos.js, imaging.js,
                   transfer.js, zip.js, diagnostico.js, ui.js, session.js, views/
tests/             testes sem dependências (node --test tests/*.test.mjs)
tools/make_icons.py gerador dos ícones (já executado)
vercel.json        só para a Vercel
```

## Notas técnicas

- JavaScript puro (módulos ES), sem bibliotecas nem passo de compilação.
- Service worker: cache de todos os ficheiros no 1.º arranque, versionada por `VERSION`; só atende o próprio endereço.
- Fotografias: `IndexedDB` (miniatura e ficheiro em armazéns separados), JPEG a 1920 px (qualidade 0,85).
- Exportar: Web Share API com ficheiros (iOS 15+) e ZIP sem compressão escrito de raiz.
- Mapa: SVG offline desenhado a partir das coordenadas, sem pedidos a servidores de mapas.
- O iOS só deixa a Web Share guardar fotografias a partir de um toque direto; por isso a exportação prepara os
  ficheiros primeiro e só depois mostra o botão final.
- Limites do iOS: sem sincronização entre telemóveis; o Safari pode limpar dados de sites não instalados após cerca
  de 7 dias sem uso (as apps instaladas no ecrã principal não estão sujeitas a esta regra).
