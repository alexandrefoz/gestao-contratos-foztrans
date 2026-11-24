-- ============================================================================
-- PROPOSTA DE SCHEMA — Módulo de Gestão de Contratos FOZTRANS
-- Status: RASCUNHO PARA APROVAÇÃO — NÃO APLICADO em nenhum projeto Supabase.
-- Gerado em 24/11/2026. Ajustar nomes/tipos depois de ler a planilha de
-- contratos atual (ainda não recebida) e confirmar os dois casos reais
-- (Moving Tech 42.026/2026, Liderança 62.368/2024) em análise paralela.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensões
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_cron;    -- rotinas agendadas (ativar no projeto)

-- ---------------------------------------------------------------------------
-- 1. CONTRATOS — dono = Google Sheets (sincronização de mão única Sheets→Supabase)
--    Front-end web NUNCA escreve aqui. RLS: somente leitura para usuários da tela.
-- ---------------------------------------------------------------------------
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  numero_ano text not null unique,                 -- ex.: "004/2022"
  processo_origem text,                            -- processo administrativo da licitação/contratação original
  regime_legal text not null
    check (regime_legal in ('lei_14133_2021','lei_8666_1993')),
  contratada text not null,
  cnpj text,
  objeto text not null,
  natureza text
    check (natureza in ('servico_continuo','dedicacao_exclusiva_mao_obra','fornecimento','obra')),
  valor_global numeric(14,2),
  valor_mensal numeric(14,2),
  vigencia_inicio date,
  vigencia_fim date,
  vigencia_maxima_admitida date,                   -- [VALIDAR] limite do art. 107/111 aplicável ao regime
  data_base_reajuste date,                         -- data do orçamento estimado / data-base do índice de preços
  indice_reajuste text,                            -- IPCA / INPC / IGP-M / outro, texto livre por ora
  data_base_cct date,                              -- só para dedicação exclusiva de mão de obra
  garantia_modalidade text,
  garantia_valor numeric(14,2),
  garantia_vencimento date,
  fiscal_tecnico_nome text,
  fiscal_tecnico_email text,
  fiscal_administrativo_nome text,
  fiscal_administrativo_email text,
  gestor_nome text,
  gestor_email text,
  status text not null default 'ativo'
    check (status in ('ativo','encerrado','rescindido')),
  link_pasta_drive text,
  ativo boolean not null default true,             -- linha apagada na planilha vira false, nunca é removida
  origem_planilha_ref text,                         -- chave natural usada no upsert (nº/ano), para auditoria da sync
  sincronizado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.contratos is 'Dono: Google Sheets. Sincronização de mão única Sheets→Supabase via Edge Function/RPC com upsert por numero_ano. RLS: somente leitura para a tela.';

create index idx_contratos_vigencia_fim on public.contratos (vigencia_fim) where ativo;
create index idx_contratos_data_base_reajuste on public.contratos (data_base_reajuste) where ativo;
create index idx_contratos_data_base_cct on public.contratos (data_base_cct) where ativo;

-- ---------------------------------------------------------------------------
-- 2. TIPOS_EVENTO — dono = Supabase (tela de configuração)
-- ---------------------------------------------------------------------------
create table public.tipos_evento (
  id uuid primary key default gen_random_uuid(),
  tipo text not null unique,                       -- chave estável: 'prorrogacao','reajuste','repactuacao', etc.
  rotulo text not null,                            -- rótulo amigável exibido na tela
  instrumento text not null
    check (instrumento in ('apostilamento','termo_aditivo')),
  regra_gatilho text,                              -- descrição textual (ex.: '12 meses da data-base')
  antecedencia_alerta_dias integer,                 -- nulo quando o evento não tem gatilho por data (ex.: revisão/reequilíbrio)
  exige_parecer_juridico boolean not null default true,  -- configurável por tipo; ver [VALIDAR] nos checklists
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. CHECKLIST_MODELO — dono = Supabase (tela de configuração). Dá o checklist
--    em dados, não em código: incluir/remover/reordenar etapa não exige migration.
-- ---------------------------------------------------------------------------
create table public.checklist_modelo (
  id uuid primary key default gen_random_uuid(),
  tipo_evento_id uuid not null references public.tipos_evento(id) on delete cascade,
  ordem integer not null,
  etapa text not null,
  descricao text,
  responsavel_padrao text,                         -- ex.: 'Contabilidade','DAF','Procuradoria','Gestor'
  prazo_relativo_dias integer,                      -- dias a partir da abertura do evento
  fundamento text,                                  -- citação normativa ou prática interna
  exige_anexo boolean not null default false,
  bloqueante boolean not null default false,        -- impede concluir o evento enquanto pendente
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tipo_evento_id, ordem)
);

-- ---------------------------------------------------------------------------
-- 3a. PROCESSOS_ADM — um processo (nº OXY) pode conter vários eventos
-- ---------------------------------------------------------------------------
create table public.processos_adm (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,                     -- nº do processo no OXY
  link text,                                        -- link da consulta online no OXY
  data_abertura date,
  status text not null default 'aberto'
    check (status in ('aberto','concluido','arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. EVENTOS
-- ---------------------------------------------------------------------------
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  processo_adm_id uuid references public.processos_adm(id),
  contrato_id uuid not null references public.contratos(id),
  tipo_evento_id uuid not null references public.tipos_evento(id),
  data_abertura date not null default current_date,
  data_limite date,
  status text not null default 'aberto'
    check (status in ('aberto','em_andamento','concluido','cancelado')),
  valor_anterior numeric(14,2),
  valor_novo numeric(14,2),
  indice_periodo text,                              -- índice/período usado no cálculo
  ato_resultante text,                               -- nº do apostilamento/aditivo final
  observacoes text,
  responsavel_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_eventos_contrato on public.eventos (contrato_id);
create index idx_eventos_status on public.eventos (status) where status in ('aberto','em_andamento');

-- ---------------------------------------------------------------------------
-- 5. CHECKLIST_EXEC — cópia executável do CHECKLIST_MODELO para um evento
-- ---------------------------------------------------------------------------
create table public.checklist_exec (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  checklist_modelo_id uuid references public.checklist_modelo(id),  -- null se item ad-hoc
  ordem integer not null,
  etapa text not null,
  descricao text,
  status text not null default 'pendente'
    check (status in ('pendente','em_andamento','concluida','nao_se_aplica')),
  responsavel text,
  data_conclusao date,
  texto_justificativa text,                         -- entra no relatório/dossiê final
  observacao text,
  bloqueante boolean not null default false,
  exige_anexo boolean not null default false,
  prazo_previsto date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evento_id, ordem)
);
create index idx_checklist_exec_evento on public.checklist_exec (evento_id);

-- ---------------------------------------------------------------------------
-- 5a. ANEXOS — um item do checklist pode ter vários anexos, ordenáveis
-- ---------------------------------------------------------------------------
create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  checklist_exec_id uuid not null references public.checklist_exec(id) on delete cascade,
  ordem integer not null default 1,
  nome_arquivo text not null,
  caminho_storage text,                             -- path no bucket Supabase Storage (null após arquivar)
  tamanho_bytes bigint,
  num_paginas integer,
  hash_arquivo text,                                -- sha256, para detectar duplicidade
  enviado_por text,
  enviado_em timestamptz not null default now(),
  arquivado_em timestamptz,                         -- quando migrado ao Drive e removido do Storage
  link_drive_arquivo text
);
create index idx_anexos_checklist_exec on public.anexos (checklist_exec_id);
create unique index idx_anexos_hash_vivo on public.anexos (checklist_exec_id, hash_arquivo) where arquivado_em is null;

-- ---------------------------------------------------------------------------
-- 6. HISTORICO — alimentado só por trigger, nunca pelo front-end
-- ---------------------------------------------------------------------------
create table public.historico (
  id bigint generated always as identity primary key,
  ocorrido_em timestamptz not null default now(),
  usuario_email text,
  tabela text not null,
  registro_id uuid,
  campo text not null,
  valor_anterior text,
  valor_novo text
);
create index idx_historico_registro on public.historico (tabela, registro_id);

-- ---------------------------------------------------------------------------
-- 7. CONFIG — antecedências de alerta, destinatários, feriados
-- ---------------------------------------------------------------------------
create table public.config (
  chave text primary key,
  valor jsonb not null,
  descricao text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8. INDICES — cache local da série do Banco Central (SGS), alimentado por
--    Edge Function agendada. Histórico não depende da disponibilidade da API.
-- ---------------------------------------------------------------------------
create table public.indices (
  id bigint generated always as identity primary key,
  serie text not null check (serie in ('IPCA','INPC','IGPM')),
  competencia date not null,                        -- dia 1 do mês de referência
  valor numeric(10,4) not null,                     -- variação % do mês
  fonte text not null default 'BCB-SGS',
  created_at timestamptz not null default now(),
  unique (serie, competencia)
);

-- ---------------------------------------------------------------------------
-- 9. SYNC_LOTES — rastreabilidade de cada sincronização Sheets→Supabase
-- ---------------------------------------------------------------------------
create table public.sync_lotes (
  id uuid primary key default gen_random_uuid(),
  executado_em timestamptz not null default now(),
  usuario text,
  inseridos integer not null default 0,
  alterados integer not null default 0,
  rejeitados integer not null default 0,
  detalhes jsonb                                    -- lista de erros por linha, se houver
);

-- ---------------------------------------------------------------------------
-- 10. PERFIS_USUARIO — autenticação/autorização (Supabase Auth, e-mail institucional)
-- ---------------------------------------------------------------------------
create table public.perfis_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  perfil text not null default 'leitura'
    check (perfil in ('leitura','fiscal_gestor','administrador')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- FUNÇÕES / RPC
-- ============================================================================

-- Abre um evento e copia o CHECKLIST_MODELO ativo do tipo para CHECKLIST_EXEC.
create or replace function public.abrir_evento(
  p_contrato_id uuid,
  p_tipo_evento_id uuid,
  p_processo_adm_id uuid default null,
  p_data_limite date default null,
  p_responsavel_email text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evento_id uuid;
begin
  insert into eventos (contrato_id, tipo_evento_id, processo_adm_id, data_limite, responsavel_email)
  values (p_contrato_id, p_tipo_evento_id, p_processo_adm_id, p_data_limite, p_responsavel_email)
  returning id into v_evento_id;

  insert into checklist_exec (evento_id, checklist_modelo_id, ordem, etapa, descricao,
                               bloqueante, exige_anexo, prazo_previsto)
  select v_evento_id, cm.id, cm.ordem, cm.etapa, cm.descricao, cm.bloqueante, cm.exige_anexo,
         case when cm.prazo_relativo_dias is not null
              then (current_date + (cm.prazo_relativo_dias || ' days')::interval)::date
              else null end
  from checklist_modelo cm
  where cm.tipo_evento_id = p_tipo_evento_id and cm.ativo
  order by cm.ordem;

  return v_evento_id;
end;
$$;

-- Bloqueia concluir um evento enquanto houver etapa bloqueante pendente.
create or replace function public.checar_bloqueantes() returns trigger
language plpgsql
as $$
begin
  if new.status = 'concluido' and old.status is distinct from 'concluido' then
    if exists (
      select 1 from checklist_exec
      where evento_id = new.id
        and bloqueante
        and status not in ('concluida','nao_se_aplica')
    ) then
      raise exception 'Existem etapas bloqueantes pendentes neste evento — não é possível concluir.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_checar_bloqueantes
  before update on public.eventos
  for each row execute function public.checar_bloqueantes();

-- Histórico genérico por diferença de campo (INSERT/UPDATE/DELETE).
create or replace function public.registrar_historico() returns trigger
language plpgsql
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_key text;
  v_usuario text;
  v_id uuid;
begin
  v_usuario := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'sistema');

  if TG_OP = 'UPDATE' then
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_id := NEW.id;
    for v_key in select jsonb_object_keys(v_new) loop
      if v_old -> v_key is distinct from v_new -> v_key then
        insert into historico (usuario_email, tabela, registro_id, campo, valor_anterior, valor_novo)
        values (v_usuario, TG_TABLE_NAME, v_id, v_key, v_old ->> v_key, v_new ->> v_key);
      end if;
    end loop;
    return NEW;
  elsif TG_OP = 'INSERT' then
    insert into historico (usuario_email, tabela, registro_id, campo, valor_anterior, valor_novo)
    values (v_usuario, TG_TABLE_NAME, NEW.id, '__insert__', null, to_jsonb(NEW)::text);
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into historico (usuario_email, tabela, registro_id, campo, valor_anterior, valor_novo)
    values (v_usuario, TG_TABLE_NAME, OLD.id, '__delete__', to_jsonb(OLD)::text, null);
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_historico_contratos
  after insert or update or delete on public.contratos
  for each row execute function public.registrar_historico();
create trigger trg_historico_eventos
  after insert or update or delete on public.eventos
  for each row execute function public.registrar_historico();
create trigger trg_historico_checklist_exec
  after insert or update or delete on public.checklist_exec
  for each row execute function public.registrar_historico();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.contratos enable row level security;
alter table public.tipos_evento enable row level security;
alter table public.checklist_modelo enable row level security;
alter table public.processos_adm enable row level security;
alter table public.eventos enable row level security;
alter table public.checklist_exec enable row level security;
alter table public.anexos enable row level security;
alter table public.historico enable row level security;
alter table public.config enable row level security;
alter table public.indices enable row level security;
alter table public.sync_lotes enable row level security;
alter table public.perfis_usuario enable row level security;

create or replace function public.meu_perfil() returns text
language sql stable
security definer
set search_path = public
as $$
  select perfil from perfis_usuario where user_id = auth.uid();
$$;

-- Leitura: qualquer usuário autenticado e cadastrado em perfis_usuario.
create policy "leitura_contratos" on public.contratos for select
  using (public.meu_perfil() is not null);
create policy "leitura_tipos_evento" on public.tipos_evento for select
  using (public.meu_perfil() is not null);
create policy "leitura_checklist_modelo" on public.checklist_modelo for select
  using (public.meu_perfil() is not null);
create policy "leitura_processos_adm" on public.processos_adm for select
  using (public.meu_perfil() is not null);
create policy "leitura_eventos" on public.eventos for select
  using (public.meu_perfil() is not null);
create policy "leitura_checklist_exec" on public.checklist_exec for select
  using (public.meu_perfil() is not null);
create policy "leitura_anexos" on public.anexos for select
  using (public.meu_perfil() is not null);
create policy "leitura_historico" on public.historico for select
  using (public.meu_perfil() is not null);
create policy "leitura_config" on public.config for select
  using (public.meu_perfil() is not null);
create policy "leitura_indices" on public.indices for select
  using (public.meu_perfil() is not null);

-- Escrita em CONTRATOS: só a Edge Function de sincronização (service_role),
-- nunca a tela. Nenhuma policy de insert/update/delete para authenticated.

-- Configuração (tipos_evento, checklist_modelo): só administrador.
create policy "admin_escreve_tipos_evento" on public.tipos_evento for all
  using (public.meu_perfil() = 'administrador')
  with check (public.meu_perfil() = 'administrador');
create policy "admin_escreve_checklist_modelo" on public.checklist_modelo for all
  using (public.meu_perfil() = 'administrador')
  with check (public.meu_perfil() = 'administrador');
create policy "admin_escreve_config" on public.config for all
  using (public.meu_perfil() = 'administrador')
  with check (public.meu_perfil() = 'administrador');

-- Eventos/checklist_exec/anexos: fiscal_gestor só nos eventos do seu contrato
-- (fiscal técnico, fiscal administrativo ou gestor); administrador em tudo.
create policy "fiscal_gestor_escreve_eventos" on public.eventos for all
  using (
    public.meu_perfil() = 'administrador'
    or (
      public.meu_perfil() = 'fiscal_gestor'
      and exists (
        select 1 from contratos c
        where c.id = eventos.contrato_id
          and auth.jwt() ->> 'email' in (c.fiscal_tecnico_email, c.fiscal_administrativo_email, c.gestor_email)
      )
    )
  )
  with check (
    public.meu_perfil() = 'administrador'
    or (
      public.meu_perfil() = 'fiscal_gestor'
      and exists (
        select 1 from contratos c
        where c.id = eventos.contrato_id
          and auth.jwt() ->> 'email' in (c.fiscal_tecnico_email, c.fiscal_administrativo_email, c.gestor_email)
      )
    )
  );

create policy "fiscal_gestor_escreve_checklist_exec" on public.checklist_exec for all
  using (
    public.meu_perfil() = 'administrador'
    or exists (
      select 1 from eventos e join contratos c on c.id = e.contrato_id
      where e.id = checklist_exec.evento_id
        and public.meu_perfil() = 'fiscal_gestor'
        and auth.jwt() ->> 'email' in (c.fiscal_tecnico_email, c.fiscal_administrativo_email, c.gestor_email)
    )
  )
  with check (
    public.meu_perfil() = 'administrador'
    or exists (
      select 1 from eventos e join contratos c on c.id = e.contrato_id
      where e.id = checklist_exec.evento_id
        and public.meu_perfil() = 'fiscal_gestor'
        and auth.jwt() ->> 'email' in (c.fiscal_tecnico_email, c.fiscal_administrativo_email, c.gestor_email)
    )
  );

create policy "fiscal_gestor_escreve_anexos" on public.anexos for all
  using (
    public.meu_perfil() = 'administrador'
    or exists (
      select 1 from checklist_exec ce join eventos e on e.id = ce.evento_id join contratos c on c.id = e.contrato_id
      where ce.id = anexos.checklist_exec_id
        and public.meu_perfil() = 'fiscal_gestor'
        and auth.jwt() ->> 'email' in (c.fiscal_tecnico_email, c.fiscal_administrativo_email, c.gestor_email)
    )
  )
  with check (
    public.meu_perfil() = 'administrador'
    or exists (
      select 1 from checklist_exec ce join eventos e on e.id = ce.evento_id join contratos c on c.id = e.contrato_id
      where ce.id = anexos.checklist_exec_id
        and public.meu_perfil() = 'fiscal_gestor'
        and auth.jwt() ->> 'email' in (c.fiscal_tecnico_email, c.fiscal_administrativo_email, c.gestor_email)
    )
  );

-- Perfis: cada usuário vê o próprio; administrador vê/edita todos.
create policy "ve_proprio_perfil" on public.perfis_usuario for select
  using (user_id = auth.uid() or public.meu_perfil() = 'administrador');
create policy "admin_gerencia_perfis" on public.perfis_usuario for all
  using (public.meu_perfil() = 'administrador')
  with check (public.meu_perfil() = 'administrador');

-- processos_adm, historico, indices, sync_lotes: sem policy de escrita para
-- authenticated — só service_role (Edge Functions) ou trigger grava.

-- ============================================================================
-- SEED MÍNIMO — tipos de evento (checklists de cada um ficam em arquivo à parte,
-- pendente de validação com os dois casos reais em análise)
-- ============================================================================
insert into public.tipos_evento (tipo, rotulo, instrumento, regra_gatilho, antecedencia_alerta_dias, exige_parecer_juridico) values
  ('prorrogacao', 'Prorrogação', 'termo_aditivo', 'Vigência do contrato a expirar', 180, true),
  ('reajuste', 'Reajuste', 'apostilamento', 'Interregno mínimo de 12 meses desde a última data-base', 60, false),
  ('repactuacao', 'Repactuação', 'apostilamento', 'Nova CCT ou data-base de mão de obra', 60, true),
  ('revisao_reequilibrio', 'Revisão/Reequilíbrio', 'termo_aditivo', 'Fato imprevisível/extraordinário', null, true),
  ('apostilamento_generico', 'Apostilamento genérico', 'apostilamento', null, 30, false),
  ('aditivo_generico', 'Aditivo genérico', 'termo_aditivo', null, 30, true)
;
