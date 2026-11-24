# Changelog

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

### Pendente para a próxima etapa
- Usuário instalar `SyncContratos.gs` na planilha real e rodar a primeira sincronização de verdade.
- Replicar as migrations no projeto de teste (`FOZTRANS Contratos - Teste`) quando o conector for reautorizado para aquela organização.
- Ver o código do dashboard Apps Script já existente (Alertas_Log/Config sugerem que existe) — ainda não compartilhado.
- Etapa (d): painel/dashboard. Etapa (e): alertas. Etapa (f): cálculo de reajuste.
