# Decisões de arquitetura

## 24/11/2026 — Escopo e realinhamento

Sessão havia começado numa direção diferente (painel Kanban de
planejamento, inventário de dois sistemas Apps Script existentes). O
usuário trouxe um prompt novo e explícito pedindo **só** o módulo de
Gestão de Contratos, separado de tudo o mais. Realinhado conforme pedido;
o trabalho anterior fica registrado em memória própria, sem interferir
neste projeto.

## Localização dos dados

- Pasta de referência real: `D:\Claude Backup\Gestão de Contratos\` (não
  `C:\Users\Alexandre\Documents\Licitações\`, citado no prompt original —
  esse caminho não existe nesta máquina; provavelmente de outro
  computador do usuário).
- Checklists validados contra 4 processos administrativos reais (Moving
  Tech/reajuste, Liderança/repactuação, Claro/prorrogação,
  Dataprom/prorrogação+reajuste) antes de qualquer migration — ver
  `docs/CHECKLISTS_INICIAIS.md` para o detalhe e as divergências
  encontradas em relação à descrição inicial do usuário.

## Supabase — organização e projetos

- Conta/organização principal: "Notificações Foztrans". Já tinha 2
  projetos ocupados (`foztrans-fiscalizacao`, sistema não relacionado de
  fiscalização de transporte; e um projeto pausado sem uso). O projeto
  pausado foi reativado e está vazio — virou o projeto **principal** deste
  módulo (`fuuqzyoifgmxgjfxmcxi`).
- Organização nova "FOZTRANS Contratos - Teste" criada pelo usuário para
  servir de ambiente de teste, mas o conector Supabase do claude.ai só
  autoriza uma organização por vez (sem multi-seleção) — aplicar a mesma
  migration nos dois projetos exige alternância manual da autorização a
  cada vez. Migrations desta sessão foram aplicadas só no projeto
  principal; replicar no projeto de teste fica pendente.

## Schema

- Ver `docs/PROPOSTA_SCHEMA.sql` (histórico do que foi proposto) e as 3
  migrations já aplicadas (`schema_inicial`, `checklists_iniciais`,
  `correcoes_advisors`) no projeto principal via MCP do Supabase.
- `CONTRATOS`/`CONFIG`: dono = Google Sheets, sincronização de mão única.
  Nenhuma policy de escrita para `authenticated`/`anon` nessas tabelas —
  só `service_role` (Edge Function) deve escrever.
- Apontamentos de parecer jurídico viram linhas normais em
  `CHECKLIST_EXEC` (sem coluna extra) — o rótulo do apontamento (parágrafo
  § ou item/alínea numerado, varia por parecer) fica no campo `etapa`.
- `antecedencia_alerta_dias` em `TIPOS_EVENTO` é opcionalmente nulo —
  revisão/reequilíbrio não tem gatilho por data fixo.
- `abrir_evento()` corrigido de `SECURITY DEFINER` para `SECURITY INVOKER`
  depois que o advisor de segurança apontou que, do jeito original,
  qualquer usuário autenticado podia abrir evento em qualquer contrato,
  ignorando a RLS. `meu_perfil()` continua `SECURITY DEFINER` de
  propósito — é o padrão necessário para evitar recursão infinita na RLS
  de `perfis_usuario`.

## Front-end

- Raiz do repositório (`index.html`, `app.js`, `config.js`) — HTML/JS/
  Bootstrap 5 estático, sem build, usando `supabase-js` via CDN (ESM).
  **Não está em `web/`** — foi movido para a raiz porque o GitHub Pages
  (modo "Deploy from a branch") só publica a raiz ou uma pasta `/docs`,
  nunca uma pasta arbitrária.
- Telas: login (e-mail/senha, botão "criar conta" via `signUp()`, e botão
  Google que precisa do provedor configurado no painel do Supabase) e
  tela de cadastro de checklists (tipos de evento + etapas, reordenação,
  edição).
- Deploy: GitHub Pages, repositório `github.com/alexandrefoz/gestao-contratos-foztrans`,
  publicado em https://alexandrefoz.github.io/gestao-contratos-foztrans/ —
  **no ar e testado em 200** (curl + confirmação do usuário). Deploy
  automático a cada push confirmado funcionando.
- Login de verdade ainda não testado: aguardando o usuário criar sua
  própria conta (`alexandre.foz@gmail.com`) pelo botão "criar agora" —
  depois disso falta só eu gravar o perfil `administrador` em
  `perfis_usuario` via SQL.
