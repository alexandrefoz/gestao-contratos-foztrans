# Changelog

## 24/11/2026

- Diagnóstico inicial da pasta de referência (`D:\Claude Backup\Gestão de Contratos\`) e dos 4 casos reais usados para validar os checklists.
- Schema inicial criado e aplicado no projeto Supabase principal (`fuuqzyoifgmxgjfxmcxi`): `contratos`, `tipos_evento`, `checklist_modelo`, `processos_adm`, `eventos`, `checklist_exec`, `anexos`, `historico`, `config`, `indices`, `sync_lotes`, `perfis_usuario`; função `abrir_evento()`, trigger de bloqueio de etapa bloqueante, trigger de histórico genérico; RLS em todas as tabelas.
- Checklists iniciais de 6 tipos de evento (reajuste, repactuação, prorrogação, revisão/reequilíbrio, apostilamento genérico, aditivo genérico) carregados como dado em `checklist_modelo`, cada etapa anotada com o que foi confirmado contra processo real.
- Correções de segurança/performance aplicadas após `get_advisors`: `abrir_evento()` de `SECURITY DEFINER` para `SECURITY INVOKER` (achado real — permitia abrir evento em contrato alheio); índices em chaves estrangeiras; políticas RLS reorganizadas para não duplicar SELECT nem reavaliar `auth.*()` por linha.
- Front-end estático inicial (`web/`): login (e-mail/senha + Google, pendente configurar provedor) e tela de cadastro de checklists (tipos de evento + etapas, com reordenação). Testado localmente, sem erros de carregamento.
- Repositório Git inicializado.

### Pendente para a próxima etapa
- Replicar as 3 migrations no projeto de teste (`FOZTRANS Contratos - Teste`) quando o conector for reautorizado para aquela organização.
- Criar o primeiro usuário administrador (Supabase Auth + linha em `perfis_usuario`) — aguardando autorização explícita, já que é criação de conta.
- Decidir serviço de deploy automático (GitHub Pages/Netlify/Vercel) e configurar.
- Etapa (b) da ordem combinada: anexos por item + geração do dossiê PDF.
