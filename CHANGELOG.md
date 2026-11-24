# Changelog

## 24/11/2026 (continuação) — Correções pós-atualização + etapa (f): reajuste

- ⚠️ **Achado real**: `sincronizar_contratos()` procurava os nomes de fiscal/gestor pela chave literal `'FISCAIS  Titular/Sup.'` (dois espaços) e `'GESTORES  Titular/Sup.'`, mas o cabeçalho da planilha tem uma quebra de linha ali, não espaço — a chave nunca batia e os campos ficavam sempre `null` no Supabase, mesmo com a planilha preenchida. Corrigido com `buscar_campo_normalizado()` (nova função auxiliar, tolerante a espaço/quebra de linha). **Efeito só aparece após rodar a sincronização de novo.**
- Corrigido bug no painel/app.js: `renderPainelVencimentos()` e `renderContratos()` não checavam o campo `ativo` (soft-delete da sincronização), só `status` — por isso um contrato excluído da planilha (ex.: CELEPAR 7/2025 removida pelo usuário) continuava aparecendo como corrente. Ambas agora exigem `ativo = true`.
- Contrato 5/2021 (CELEPAR – GIT_SaaS, substituído pelo Contrato 7/2025) e 4 Atas de Registro de Preço sem renovação (15/2025 KF Comércio, 13/2025 Smart Soft, 10/2025 Integra, 4/2025 Kalesi — todas ausentes da listagem oficial de vigentes e já além do prazo legal de 1 ano sem prorrogação, Lei 14.133/2021 art. 84 §4º) marcados `status = 'encerrado'` via migration. Planilha não foi tocada — é decisão de quem edita a fonte.
- **Etapa (f) iniciada**: tabela `indices` alimentada por nova Edge Function `buscar-indices` (busca IPCA/INPC/IGP-M direto do SGS do Banco Central, sem precisar de chave/autenticação externa) + `apps-script/AtualizarIndices.gs` (reaproveita o segredo já configurado). Função `calcular_memoria_reajuste(serie, data_base, data_referencia)` calcula o fator acumulado mês a mês (número-índice) para revisão humana — nunca aplica sozinha. Falta: instalar o gatilho mensal no Apps Script, e a tela no front-end para disparar o cálculo a partir de um evento de reajuste.
- Pendente (combinado, não iniciado): ferramenta para "varrer" um PDF de listagem oficial como o de hoje e gerar automaticamente o diff/objeto completo — viável, mas o PDF não distingue Contrato de Ata de Registro de Preço (o Número se repete entre os dois), então precisa sempre de confirmação humana no pareamento; não dá para ser 100% automático.

## 24/11/2026 (continuação) — Etapa (e) concluída: envio de alertas por e-mail

- Decisão: envio via **Apps Script + Gmail institucional** (não Resend), reaproveitando a mesma planilha/conta já usada na sincronização — usuário escolheu essa opção quando perguntado.
- Nova coluna `alertas_log.email_enviado_em` separa "alerta registrado" (`enviado_em`, que na verdade é hora de registro) de "e-mail efetivamente enviado" — evita reenviar o mesmo alerta todo dia.
- View `alertas_pendentes_envio` (só leitura, sem grant a anon/authenticated — só `service_role` acessa) junta `alertas_log` pendente com `numero_ano`/`contratada` de `contratos`.
- Edge Function `alertas-email`: GET retorna pendências, POST marca IDs como enviados. Mesmo segredo compartilhado da sincronização (`SYNC_SHARED_SECRET`, já configurado nos secrets do projeto — não precisou criar outro). Testada com segredo inválido → `401` confirmado.
- `apps-script/EnviarAlertas.gs`: busca pendências, agrupa por destinatário (um e-mail por pessoa cobrindo todas as pendências dela), envia via `GmailApp`, confirma de volta ao Supabase. Gatilho diário sugerido às 7h (depois do registro do Supabase, que roda ~3h10 local). **Ainda não instalado pelo usuário.**
- `get_advisors` rodado após a migration — nenhum achado novo (view nova não aparece exposta).
- **Pendência de dados, não de código**: os campos `contratos.fiscal_tecnico_email`/`gestor_email` ainda estão vazios na planilha real (colunas "E-mail Fiscal"/"E-mail Gestor" existem mas não foram preenchidas) — até preencher, a view de pendências fica vazia e nenhum e-mail sai, mesmo com tudo funcionando.

## 24/11/2026 (continuação) — Etapa (e): alertas + correção de segurança

- ⚠️ **Achado de segurança real, corrigido no mesmo dia**: `sincronizar_contratos()` e `registrar_alertas_do_dia()` continuavam executáveis por **qualquer usuário anônimo** via REST, mesmo depois do `revoke ... from anon, authenticated` aplicado na migration original — `REVOKE` por papel nomeado não basta quando a função ainda tem `EXECUTE` concedido a `PUBLIC` (concessão padrão do Postgres ao criar função). Corrigido com `REVOKE ... FROM PUBLIC`. **Confirmado fechado**: chamada anônima de teste agora retorna `401 permission denied`. Nenhuma evidência de uso indevido no intervalo.
- Mesma correção aplicada em `abrir_evento()` por precaução (já era `SECURITY INVOKER`, mas o grant a `PUBLIC` ficava solto).
- View `alertas` estava `SECURITY DEFINER` por padrão (roda com o privilégio de quem criou, ignorando a RLS das tabelas por baixo para quem consulta) — corrigido com `security_invoker = true`.
- `search_path` fixado nas funções auxiliares de sincronização/alertas (`marcos_alerta`, `email_esta_na_lista`, `normalizar_ato`, `parse_valor_brl`, `parse_regime_legal`, `parse_data_br_estrito`, `proximo_aniversario`).
- Base de alertas construída: tabela `alertas_log` (dedup por tipo+contrato+evento+dias), view `alertas` com os 6 tipos do prompt original (fim de vigência, aniversário de reajuste, data-base de CCT, garantia a vencer, etapa atrasada, evento sem responsável), reaproveitando os marcos de dias (90/60/30/15/7/3/1) já usados na planilha. `pg_cron` diário (06:10 UTC) grava os alertas novos via `registrar_alertas_do_dia()`.
- **Pendente**: decidir o mecanismo de envio de e-mail (Resend via Edge Function × Apps Script/Gmail institucional) — o prompt original pede para comparar as duas e deixar o usuário escolher, ainda não perguntado.
- Cards do painel (etapa d) viraram clicáveis: filtram a tabela de próximos vencimentos, navegam para Eventos, ou rolam até Providências.

## 24/11/2026

- Diagnóstico inicial da pasta de referência (`D:\Claude Backup\Gestão de Contratos\`) e dos 4 casos reais usados para validar os checklists.
- Schema inicial criado e aplicado no projeto Supabase principal (`fuuqzyoifgmxgjfxmcxi`): `contratos`, `tipos_evento`, `checklist_modelo`, `processos_adm`, `eventos`, `checklist_exec`, `anexos`, `historico`, `config`, `indices`, `sync_lotes`, `perfis_usuario`; função `abrir_evento()`, trigger de bloqueio de etapa bloqueante, trigger de histórico genérico; RLS em todas as tabelas.
- Checklists iniciais de 6 tipos de evento (reajuste, repactuação, prorrogação, revisão/reequilíbrio, apostilamento genérico, aditivo genérico) carregados como dado em `checklist_modelo`, cada etapa anotada com o que foi confirmado contra processo real.
- Correções de segurança/performance aplicadas após `get_advisors`: `abrir_evento()` de `SECURITY DEFINER` para `SECURITY INVOKER` (achado real — permitia abrir evento em contrato alheio); índices em chaves estrangeiras; políticas RLS reorganizadas para não duplicar SELECT nem reavaliar `auth.*()` por linha.
- Front-end estático inicial (`web/`): login (e-mail/senha + Google, pendente configurar provedor) e tela de cadastro de checklists (tipos de evento + etapas, com reordenação). Testado localmente, sem erros de carregamento.
- Repositório Git inicializado.

## 24/11/2026 (continuação) — Deploy

- Repositório publicado em `github.com/alexandrefoz/gestao-contratos-foztrans`.
- GitHub Pages ativado (Deploy from a branch, `master`, raiz) — por isso
  os arquivos do site foram movidos de `web/` para a raiz do repositório
  (GitHub Pages não aceita pasta arbitrária, só raiz ou `/docs`).
- Site no ar: https://alexandrefoz.github.io/gestao-contratos-foztrans/

## 24/11/2026 (continuação) — Etapa (b): anexos + dossiê PDF

- Usuário criou a própria conta (`alexandre.foz@gmail.com`) via "criar agora"; perfil `administrador` gravado em `perfis_usuario`. Login completo testado no site publicado.
- Tela de Eventos: lista eventos abertos, checklist_exec editável (status/responsável/data/justificativa, autosave).
- Upload de anexo por item via Supabase Storage (bucket privado `anexos-eventos`), com hash SHA-256, download e exclusão.
- Geração de dossiê em PDF no navegador (`pdf-lib`): capa "MINUTA — SUJEITA À REVISÃO", índice, relatório por etapa, anexos PDF mesclados, numeração de página. Bloqueia geração se faltar justificativa/anexo obrigatório. Bookmarks por item **não implementados** (limitação conhecida do pdf-lib).
- Dados fictícios de teste (`[TESTE] 999/2026`) criados só para validar o fluxo, sem depender da sincronização (etapa c, ainda não feita nesse momento).

## 24/11/2026 (continuação) — Etapa (c): sincronização Sheets → Supabase

- Planilha real identificada: "Gestores e Fiscais de contrato v2" (`Página1`, `Alertas_Log`, `Config` — evidência de um dashboard Apps Script já existente, código ainda não compartilhado). Usuário adicionou 4 colunas necessárias (`CNPJ`, `Regime Legal`, `E-mail Fiscal`, `E-mail Gestor`) manualmente, já que o conector de edição do Google Sheets não estava disponível nesta sessão.
- Ajuste de RLS: cada papel (fiscal/gestor) aceita lista de e-mails separada por vírgula (titular + suplente) via `email_esta_na_lista()`.
- `regime_legal` virou nullable — coluna nova, maioria das linhas ainda vazia; não bloquear a sincronização por isso.
- RPC `sincronizar_contratos()`: valida cada linha (campos obrigatórios, valor BRL, data dd/mm/aaaa com detecção de célula com mais de uma data — achado real na planilha —, chave duplicada no lote), upsert por chave natural `ATO Nº/ANO`, soft-delete (marca inativo, nunca apaga) do que sumiu da planilha, nunca mexe em `[TESTE]*` nem em contrato não sincronizado. Execução restrita a `service_role`.
- Edge Function `sync-contratos`: único lugar com a `service_role` key; autentica a chamada do Apps Script por segredo compartilhado (header, não JWT). Testada de ponta a ponta via `curl` direto contra a função publicada.
- `apps-script/SyncContratos.gs`: código pronto para o usuário instalar na planilha real — lê por nome de cabeçalho, menu, relatório de erro por linha em aba própria, gatilho diário opcional. **Ainda não instalado pelo usuário.**
- Achado técnico: `create_edge_function_secret` (ferramenta MCP) parou de responder no meio da sessão — segredo cadastrado manualmente pelo usuário via painel do Supabase.

### ✅ Primeira sincronização real (24/11/2026)
`SyncContratos.gs` instalado e rodado pelo usuário na planilha real.
Corrigido um bug na guarda de `configurarSegredo()` (comparava com o
próprio texto-placeholder; usuário substituiu as duas ocorrências ao
colar o valor real, travando sempre — trocado para checagem por
substring). Resultado: **43 contratos reais sincronizados**, 1 rejeitado
(a mesma célula com duas datas em "Contrato 3/2026" já identificada na
análise anterior — inconsistência real da planilha, não bug), dado
fictício `[TESTE]` preservado.

### Pendente para a próxima etapa
- Replicar as migrations no projeto de teste (`FOZTRANS Contratos - Teste`) quando o conector for reautorizado para aquela organização.
- Ver o código do dashboard Apps Script já existente (Alertas_Log/Config sugerem que existe) — ainda não compartilhado.
- Instalar o gatilho diário (`instalarTriggerDiario()`), se o usuário quiser sincronização automática.
- Etapa (d): painel/dashboard. Etapa (e): alertas. Etapa (f): cálculo de reajuste.
