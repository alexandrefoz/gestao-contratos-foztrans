# Checklists iniciais — rascunho para aprovação

Status: RASCUNHO. Nenhum destes itens foi gravado no banco. Marcado
`[VALIDAR]` onde depende de norma local ou rotina interna não confirmada
em documento real. Marcado `[CONFIRMADO]` onde já bati contra um processo
real. Marcado `[DIVERGE]` onde o processo real contradisse a minha
suposição inicial (baseada só na sua descrição no prompt).

---

## REAJUSTE (apostilamento, de ofício)

Caso de validação: **Processo 42.026/2026 — 4º Apostilamento, Contrato
004/2022, Moving Tech** (análise de `processo-42026_2026-documentos.pdf`,
83 páginas — o arquivo termina antes da formalização final, só cobre até
a devolução da Contabilidade).

| Ordem | Etapa | Responsável padrão | Fundamento | Bloqueante | Status |
|---|---|---|---|---|---|
| 1 | Memorando de abertura do gestor — interregno mínimo de 12 meses, índice da cláusula contratual | Gestor | Decreto 32.398/2024 art. 290 e art. 303, X; cláusula de reajuste do contrato | não | **[CONFIRMADO]** — Memorando Interno nº 1549/2026, 19/05/2026, por Alexandre de Oliveira Siqueira (DVTC) |
| 2 | Despacho determinando instrução via Processo Digital (OXY) | DAF | — | não | **[CONFIRMADO]** — despacho de FOZTRANS/DAF, mesmo dia |
| 3 | Autorização de abertura do processo | Superintendência **+ DAF** | — | sim | **[DIVERGE]** — autorização foi **bi-assinada** (Diretor Administrativo e Financeiro + Diretor Superintendente), não só Superintendência como eu assumi |
| 4 | Encaminhamento à Contabilidade pedindo memória de cálculo | Gestor | — | não | **[CONFIRMADO]** — 20/05/2026 |
| 5 | Retorno da Contabilidade: índice acumulado e valores atualizados | Contabilidade | — | sim | **[CONFIRMADO]** — 21/07/2026, 62 dias depois (bate com a sua memória de ~2 meses) |
| 6 | Minuta do apostilamento + extrato elaborados pelo gestor | Gestor | — | não | `[VALIDAR]` — não aparece no arquivo disponível (ele termina na devolução da Contabilidade) |
| 7 | Certidões de regularidade (Municipal, Estadual, FGTS, Trabalhista, Federal) | Gestor | — | sim | `[VALIDAR]` — idem |
| 8 | Encaminhamento para formalização | — | — | não | `[VALIDAR]` — **a sigla do setor não é "DVLC"** neste processo; nenhuma movimentação para uma divisão de licitações aparece no arquivo. Os setores reais vistos são **DVTC** (gestor) e **DVCT** (Contabilidade). Preciso do restante do processo (ou de outro caso) para confirmar quem formaliza/publica. |
| 9 | Apostilamento assinado e publicado no DOM | — | — | sim | `[VALIDAR]` — idem |
| 10 | Atualização do cadastro (novo valor, novo apostilamento, nova data-base) | Gestor | — | não | `[VALIDAR]` |

**Achados adicionais, fora do checklist original:**
- Base legal citada é **mista**: Decreto 32.398/2024 (arts. 290/303,X) **e** art. 65 §8º da Lei 8.666/1993 — confirma que este contrato específico (004/2022) ainda é regido pela lei antiga, exatamente o cenário que o campo `regime_legal` do schema precisa cobrir.
- O memorando cita "Cláusula Sétima" do contrato como base do reajuste pelo IPCA; o despacho à Contabilidade cita "Cláusulas 3.4.1 e 3.4.1.1". **Pode ser inconsistência interna do processo** — não assumir que são a mesma cláusula sem conferir o contrato.
- ⚠️ O processo nomeia **Maxwell Lucena de Moraes** como Diretor Superintendente (19/05/2026). Minha memória de sessão anterior tinha **Gerson Rodrigues Vieira** como Diretor Superintendente atual. Pode ser troca de gestão entre as datas, ou um dos dois registros está desatualizado — **sinalizar para confirmação, não usar nenhum dos dois em documento oficial sem checar.**

---

## REPACTUAÇÃO (apostilamento, mão de obra com CCT)

Caso de validação: **Processo 62.368/2024 — 1º Apostilamento, Contrato
002/2024, Liderança Limpeza e Conservação.** Análise completa (PDFs
originais + CSV de upload do GiiG com carimbo de data/hora de cada anexo).

| Ordem | Etapa | Responsável padrão | Fundamento | Bloqueante | Status |
|---|---|---|---|---|---|
| 1 | E-mail da contratada: ofício de repactuação + planilha nova + nova CCT | Contratada | — | não | **[CONFIRMADO]** — 11/09/2024, Ana Paula Linhares (Liderança) |
| 2 | Memorando pedindo abertura do processo no GiiG | Gestor (DVOP) → DAF/Secretaria Geral | — | não | **[CONFIRMADO]** — Memo 1483/2024, 12/09. **[DIVERGE]**: é um memorando de protocolo, não "recebimento do pedido" — e é separado do passo 3 |
| 3 | Memorando encaminhando a planilha para conferência | Gestor (DVOP) → Contabilidade ("Suporte Técnico Especializado") | — | não | **[CONFIRMADO]** — Memo 1493/2024, 13/09. **[DIVERGE]**: eu tinha fundido isto com o passo 2 — são dois memorandos distintos, de dias diferentes |
| 4 | Certidão de habilitação | Fiscal de Preceitos | — | não | **[CONFIRMADO]** — Certidão 1/24, 19/09, Gilmar Ribeiro dos Santos. **[DIVERGE]**: vem ANTES do parecer, não depois junto com a certidão de fazenda |
| 5 | Autorização do Superintendente (já determina envio à Procuradoria) | Superintendência + DAF | — | sim | **[CONFIRMADO]** — Autorização 4/24, 19-20/09, Gabriel Oro Serafini (Superintendente) + Camila de Souza (DAF). **[DIVERGE]**: autorização e despacho à PJ são o mesmo ato, não etapas separadas |
| 6 | Minuta do termo de apostilamento (1ª versão) | Gestor | — | não | **[CONFIRMADO]** — ~01/10 |
| 7 | Parecer jurídico | Procuradoria | Lei 14.133/21 art.53 | sim | **[CONFIRMADO]** — Parecer nº 35/2024-FSB (Fabiano Simon Brunetto), 22/10, consulente DVOT |
| 8 | Saneamento dos apontamentos do parecer (sub-etapas automáticas por item) | Gestor/Contabilidade/DAF | Decreto 32.398/24 art.7º §5º | sim | **[CONFIRMADO]**, com ajuste de desenho — ver nota abaixo |
| 9 | Declaração do ordenador de despesa | Ordenador | — | não | **[CONFIRMADO]** — Declaração 68/2024, 01/11 |
| 10 | DVLC: apostila assinada, publicada no DOM, extrato, planilha de valores, memorando ao gestor | — | — | sim | **[CONFIRMADO]**, com uma etapa a mais: **republicação por erro no valor total mensal** não estava no meu checklist |

**Nota sobre o passo 8 — como os itens do parecer viram sub-etapas:**
Os apontamentos do parecer são **parágrafos** (§), não uma lista numerada
de "itens" — mas os anexos de resposta já são nomeados pelo nº do
parágrafo ("Item 17", "Item 22", "Item 23", "Item 24"), confirmando que dá
pra automatizar. Os 4 apontamentos reais deste parecer:
- §16-17: confirmar interregno mínimo de 1 ano da CCT (art. 292, II, Decreto 32.398/24)
- §18-19: contesta retroatividade pedida pela contratada a 01/01/2024
- §22: faltava a resposta ao Memo 1493/2024 (conferência da Contabilidade)
- §23: faltava certidão de regularidade da fazenda municipal
- §24: faltava verificação de dotação orçamentária + declaração do ordenador

→ **Desenho**: o `CHECKLIST_EXEC` deve permitir criar sub-etapas vinculadas
a um apontamento específico do parecer (referenciado por nº de parágrafo),
geradas sob demanda ao cadastrar o parecer — não um número fixo de
sub-etapas por tipo de evento, porque o nº de apontamentos varia por
parecer. Vou refletir isso no schema antes de aplicar.

**Retroatividade confirmada**: fixada em **01/07/2024** (início da execução
do contrato), não na data-base da CCT (01/06/2024) — o parecer já havia
descartado a retroatividade a janeiro/2024 pedida pela contratada. Valor:
R$ 37.466,36 → R$ 40.103,94/mês.

⚠️ **Nomes de autoridades variam por data** — achado que se repete no caso
Moving Tech: aqui (set-nov/2024) o Diretor Superintendente é **Gabriel Oro
Serafini** e a DAF é **Camila de Souza**; no caso Moving Tech (mai/2026) são
**Maxwell Lucena de Moraes** e **Felipe Rimolo Cosendey**. A minha memória
de sessão tinha Gerson Rodrigues Vieira como superintendente "atual" e
Felipe Rimolo Cosendey como DAF "atual" — Felipe bate com o caso mais
recente, Gerson não aparece em nenhum dos dois casos. Vou marcar essa
memória como sensível à data, não usar nome de autoridade em nenhuma minuta
sem confirmar a data de referência.

---

## PRORROGAÇÃO (termo aditivo)

Caso de validação: **Processo 3.640/2025 — Claro S.A., Contrato
005/2022.** Só 3 arquivos disponíveis (consultas de regularidade, contrato
assinado, parecer jurídico nº 04/2025) — bom para confirmar a parte
jurídico-formal, mas não cobre a tramitação inteira (falta o texto da
resposta da contratada, o despacho à Procuradoria, o termo aditivo em si,
a publicação). **Dataprom (Processo 44.313/2026) ainda em análise** — vai
completar o que falta aqui, principalmente a formalização (Fase C).

| Ordem | Etapa | Responsável padrão | Fundamento | Bloqueante | Status |
|---|---|---|---|---|---|
| 1 | Aviso de vencimento (~120 dias antes) | Sistema/DAF | — | não | `[VALIDAR]` — não coberto pelos 3 arquivos |
| 2 | Ofício à contratada pedindo manifestação de interesse + negociação de redução | Gestor | Cláusula 5ª do contrato, alínea (g) | não | `[VALIDAR]` — só referenciado como "anexo 5", texto não visto |
| 3 | Resposta da contratada (manifestação de interesse) | Contratada | — | não | `[VALIDAR]` — idem |
| 4 | Autorização da Superintendência | Superintendência | — | sim | **[CONFIRMADO]** — "Memorando Interno nº 21/2025". **[DIVERGE]**: vem **separada** do atestado de regularidade da execução (que é item próprio da área técnica), não no mesmo memorando |
| 5 | Atestado de regularidade da execução | Fiscal/área técnica | — | não | **[CONFIRMADO]** — "anexo 2, item 8" |
| 6 | Consultas de regularidade (certidões, TCU/CNJ, CEIS/CNEP, TCE-PR) | DAF | — | sim | **[CONFIRMADO]** — pacote completo em 07/01/2025 (SICAF, CND Federal/PGFN, FGTS, CNDT, estaduais/municipais, Cadin-PR, TCE-PR "Impedidos de Licitar"). **[DIVERGE]**: nenhuma menção a "SICAF" como sigla isolada do checklist original — o pacote tem nome próprio "Consulta Consolidada" |
| 7 | Previsão orçamentária | Ordenador de despesa | — | sim | **[CONFIRMADO]**, mas **[DIVERGE]**: não é "memorando ao financeiro" — é **Declaração do Ordenador de Despesas** direta |
| 8 | Pesquisa de preços / relatório de vantajosidade | Gestor | — | não | **[CONFIRMADO]** — "anexo 7" (pesquisa) + "anexo 2, item 6" (vantajosidade) |
| 9 | Relatórios de análise técnica da execução | Fiscal | — | não | **[CONFIRMADO]** — mesmo "anexo 2, item 8" do passo 5 (parecem ser o mesmo documento, não dois) |
| 10-17 | Relatório de instrução (Fase B, 8 seções) | Gestor | — | variável | **[CONFIRMADO]** como estrutura — o parecer cita explicitamente um "anexo 2" com itens numerados (autorização=1, interesse da Administração=5, vantajosidade=6, habilitação/execução=8), mas a numeração completa do anexo 2 não aparece nestes 3 arquivos. Formato bate com a ideia de "relatório único com seções numeradas" |
| 18 | Garantia renovada | Gestor | Cláusula do contrato "quando for o caso" | não | `[VALIDAR]` — contrato prevê condicionalmente, nenhum dos 3 arquivos trata disso |
| 19 | Ressalva de reajuste/repactuação pendente | Gestor/Contratada | — | não | `[VALIDAR]` — **sem evidência** nestes arquivos de que a Claro pediu reajuste nesta prorrogação (diferente do que eu tinha registrado) — mas o texto da manifestação dela (anexo 5) não foi lido, então não dá para negar com certeza |
| 20 | Despacho à Procuradoria → parecer jurídico | Procuradoria | Lei 8.666/93 art.57 | sim | **[CONFIRMADO]** — Parecer nº 04/2025-FSB, 22/01/2025, processo recebido 21/01/2025 (1 dia de diferença — tramitação rápida). Conclusão: viável, **ressalva única** = atualizar certidões que perderem validade |
| 21-24 | Termo aditivo, assinatura, publicação DOM, atualização cadastro | DVLC/setor de formalização | — | sim | `[VALIDAR]` — nenhum dos 3 arquivos chega a essa fase |

**Achados adicionais:**
- Contrato 005/2022, Cláusula 5ª, lista **7 condições explícitas** para prorrogar — objeto inalterado, preços/condições mais vantajosos, justificativa escrita + autorização prévia, manifestação de interesse da contratada, manifestação do fiscal, previsão orçamentária, comprovação de negociação de redução de valores. Isso é quase idêntico aos "6 requisitos do TCU" citados no próprio parecer — **útil como fundamento direto no `CHECKLIST_MODELO`, por cláusula contratual, não só por lei**.
- Regime legal confirmado: **Lei 8.666/1993** (art. 57, caput e II, §2º) — mesmo regime do caso Moving Tech. Reforça que `regime_legal` é campo obrigatório, não acessório.
- Setor consulente do parecer: **"Divisão Administrativa"**. ~~Nenhuma menção a "DVLC" em nenhum dos 3 casos~~ **[ATUALIZADO após o caso Dataprom, ver abaixo]: DVLC é real** — só não apareceu nestes 3 arquivos porque eles não cobrem a fase de formalização.
- Pessoas (set/2025 nesta época): Gestora Pricila Bevervanço Mantovani, Fiscal Douglas Lucas Chaves Dresch, Advogado Fabiano Simon Brunetto (mesmo parecerista dos outros dois casos — é o advogado de referência para apostilamentos/aditivos neste período).

---

### Complemento — Processo 44.313/2026 (Dataprom, Contrato 004/2025): fecha as lacunas do caso Claro

189 páginas lidas por completo. Este processo combina **prorrogação +
reajuste no mesmo processo administrativo**, exatamente o cenário mais
complexo que o prompt original descreveu — e confirma a maior parte do
que faltava no caso Claro:

| Etapa (continuação da numeração acima) | Status |
|---|---|
| 1-3 (consulta de interesse, ofício, resposta) | **[CONFIRMADO]** — Memorando 1533/2026 (18/05) → Ofício 790/26 à Dataprom (20/05) → e-mail + Ofício 092/2026 de resposta da Dataprom (26/05), citando art. 107 da Lei 14.133/2021 |
| 4 (autorização Superintendência) | **[CONFIRMADO]** — Autorização nº 7/2026, bi-assinada (Superintendente + DAF, confirma o mesmo padrão do caso Moving Tech) |
| Despacho à DAF pedindo dotação | **[CONFIRMADO, com achado importante]** — a ST-DAF (Lucimara Zenatti) **recusou-se a reservar a dotação** até receber o valor separado por item/natureza de despesa — bloqueou o processo até ser resolvido. Isso vira um `[VALIDAR]` virando regra de negócio: **o pedido de dotação deve already vir com valor desagregado por natureza de despesa**, não só o total, ou o processo trava |
| 21-24 (termo aditivo, apostilamento, publicação, cadastro) | **[CONFIRMADO POR COMPLETO]**: Procuradoria → diligência → complementação → **Parecer nº 14/2026 (aprovação condicionada)** → ajuste da minuta → **DVLC** (confirmado: Caroline Texdorf Balzzan Bortoli) pede certidão técnica sobre a condicionante → gestor emite → aditivo + apostilamento assinados no mesmo dia (10/07) → publicados no DOM, Portal da Transparência e PNCP → lançamento no OXY Compras (Fábio Nicoli dos Santos, DVLC) + relatório de saldo |

**Achados que corrigem/detalham o prompt original:**
- **Lista exata da Procuradoria (verbatim, movimentação #22)**: *"Anexar aos autos os instrumentos da Contratação – Termo de Referência, ETP, Contrato etc.; Anexar eventuais aditivos ou apostilamentos relativos à contratação; Anexar a Minuta do Termo Aditivo em PDF; Anexar a declaração de exclusividade, de acordo com o modelo anexo."* **Não existe item separado de "declaração de inexigibilidade"** — há um arquivo-modelo chamado assim, mas o conteúdo dele é "Declaração de Averiguação e Veracidade de Atestado de Exclusividade". A frase "ou declaração de que não existem" veio da resposta do gestor, não do pedido da PJ. **O ETP nunca chegou a ser anexado ao dossiê**, apesar de pedido — sinalizar isso como risco recorrente no checklist (`exige_anexo = true` não é suficiente; o item precisa bloquear mesmo).
- **Escopo da prorrogação confirmado**: só o item de serviço (item 8) foi renovado; os itens de fornecimento (1-7) já tinham vencido em 11/07/2026 — exatamente o cenário "só alguns itens" que o prompt previu.
- **Coerência orçamentária: atribuição errada no prompt original.** Não foi a DAF que exigiu a desagregação por natureza de despesa — foi o **próprio parecer jurídico** (item 2.4) que apontou (a) dimensionar a dotação pelo consumo anual renovado (150h), não só o saldo remanescente, e (b) uma incompatibilidade de código orçamentário por reestruturação entre exercícios (código 2025 `32.01.15.453.0710.2192` × código 2026 ativo `32.002.15.122.0230.2119`).
- **Dois instrumentos confirmados**: Termo Aditivo (prazo) + Termo de Apostilamento (preço), assinados no mesmo dia, pelas mesmas 3 pessoas.
- **Bug do sistema OXY**: ao lançar os dois instrumentos juntos, o OXY força os dois como uma única entrada "1º Aditivo" (numeração/quantidade duplicada) — logado como contorno manual na movimentação #44. **O schema precisa guardar os dois atos separadamente** (`ato_resultante` por evento, não um campo único por processo), já que o sistema de origem confunde os dois.
- **Documentos "assinatura cancelada" confirmados duas vezes** (cálculo de reajuste e declaração de vantajosidade) — sempre substituídos no mesmo dia pela versão assinada.
- **Estrutura do parecer é diferente do caso Liderança**: aqui é por seções numeradas com subitens (1. Relatório; 2. Análise Jurídica, com 2.1-2.4 e alíneas a/b; 3. Conclusão), não por parágrafo (§). **Confirma que o desenho de sub-etapas do parecer precisa aceitar rótulo livre** ("2.4.a", "§22" etc.), não um padrão único de numeração.
- Pessoas confirmadas nesta janela de tempo: Gestor Alexandre de Oliveira Siqueira (mesmo da Moving Tech — é o gestor da DVTC/Transporte Coletivo em geral); Fiscal Gilmar Ribeiro dos Santos (mesmo fiscal do caso Liderança — atua em mais de um contrato); Diretor de Trânsito e Sistema Viário: **Luiz Borella** (o template usa "Diretora", erro de gênero no modelo — mais um "achado de qualidade documental" a observar, não a copiar).

## REVISÃO/REEQUILÍBRIO, APOSTILAMENTO GENÉRICO, ADITIVO GENÉRICO

Sem caso real disponível ainda. Checklist mínimo editável, todo `[VALIDAR]`.
