-- THE Q MMA — Visitor Class Request + Mandatory Waiver + Cleared to Train
-- (Phase 1: request → admin approval → waiver signature → automatic
-- clearance → Visitor Pass with QR). No QR-scanner check-in, no coach
-- accounts, no configurable settings, no audit log, no realtime yet — those
-- are Phase 2.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase. Depende só de auth-schema.sql (profiles,
-- is_admin) — toca_updated_at e eh_admin são recriadas aqui também, pelo
-- mesmo motivo do comentário em pedidos-schema.sql (arquivo tem que rodar
-- sozinho). Pode rodar mais de uma vez sem estragar nada.
--
-- PRINCÍPIO DE SEGURANÇA DESTE ARQUIVO: "cleared_to_train" nunca é
-- escrevível por código cliente, nem por admin. É setado num único lugar —
-- o gatilho evaluate_visitor_clearance(), depois de revalidar tudo de novo
-- no servidor. Todo o resto (submeter, aprovar, recusar, assinar) passa por
-- função security definer com uma lista fechada de transições permitidas,
-- nunca por UPDATE direto de status via RLS.

-- 0. Funções de apoio ---------------------------------------------------------

create or replace function public.toca_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.eh_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- 1. Tipos ------------------------------------------------------------------

do $$ begin
  create type visitor_request_status as enum
    ('draft', 'submitted', 'under_review', 'approved_pending_waiver',
     'cleared_to_train', 'rejected', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visitor_experience_level as enum
    ('none', 'beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visitor_rejection_reason as enum
    ('incomplete_information', 'schedule_conflict', 'capacity_full',
     'policy_violation', 'duplicate_request', 'age_requirement_not_met', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visitor_notification_kind as enum
    ('request_approved', 'waiver_required', 'request_rejected',
     'cleared_to_train', 'request_expired');
exception when duplicate_object then null; end $$;

-- 2. Pedidos de visita --------------------------------------------------------
-- Sem coluna admin_notes: RLS filtra LINHA, não coluna, então recado interno
-- da equipe mora em tabela própria (seção 5), igual order_admin_notes /
-- promotion_admin_notes. Sem política de insert/update pra ninguém -- toda
-- mudança passa por função (seções 6-8). Uma vaga ativa por usuário é
-- garantida pelo índice único parcial abaixo, não por um SELECT count(*)
-- dentro da função (que teria corrida entre dois envios simultâneos).

create table if not exists visitor_class_requests (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid references auth.users on delete set null,

  full_name                   text not null,
  email                       text not null,
  phone                       text,
  date_of_birth               date not null,

  requested_class_name        text not null,
  requested_date               date not null,
  requested_time               text,
  experience_level             visitor_experience_level not null default 'none',
  martial_arts_experience      text,
  notes_from_visitor           text,
  acknowledged_no_guarantee    boolean not null default false
    check (acknowledged_no_guarantee = true),

  status                       visitor_request_status not null default 'submitted',

  reviewed_by                  uuid references auth.users on delete set null,
  reviewed_at                  timestamptz,
  approved_at                  timestamptz,
  rejected_at                  timestamptz,
  rejection_reason_code        visitor_rejection_reason,
  -- MOSTRADO pro visitante (mesmo raciocínio de promotion_requests.rejection_reason)
  -- -- por isso mora na linha principal, não na tabela de anotações internas.
  rejection_reason             text,
  cleared_at                   timestamptz,
  expires_at                   timestamptz,
  waiver_id                    uuid,

  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

create index if not exists visitor_class_requests_user_idx
  on visitor_class_requests (user_id, created_at desc);
create index if not exists visitor_class_requests_status_idx
  on visitor_class_requests (status, created_at desc);
create index if not exists visitor_class_requests_date_idx
  on visitor_class_requests (requested_date);

-- Uma solicitação ativa por vez. Ativo = submitted, under_review,
-- approved_pending_waiver ou cleared_to_train. Índice único parcial: dois
-- envios simultâneos do mesmo usuário nunca conseguem os dois passar --
-- submit_visitor_class_request() (seção 6) captura o unique_violation e
-- devolve uma mensagem amigável.
create unique index if not exists visitor_class_requests_one_active_per_user_idx
  on visitor_class_requests (user_id)
  where status in ('submitted', 'under_review', 'approved_pending_waiver', 'cleared_to_train');

drop trigger if exists visitor_class_requests_touch on visitor_class_requests;
create trigger visitor_class_requests_touch
  before update on visitor_class_requests
  for each row execute function public.toca_updated_at();

-- 3. Termo de responsabilidade assinado ---------------------------------------
-- Registro IMUTÁVEL: sem updated_at, sem gatilho de update, sem política de
-- update/delete pra ninguém -- só insert, só pela função
-- sign_visitor_waiver() (seção 7). content_snapshot guarda o texto EXATO
-- que foi mostrado e assinado, cópia inteira, independente de qualquer
-- edição futura no texto padrão -- é a prova do que foi combinado naquele
-- momento, não um ponteiro pro texto atual.

create table if not exists visitor_waivers (
  id                              uuid primary key default gen_random_uuid(),
  request_id                      uuid not null references visitor_class_requests on delete cascade,
  user_id                         uuid references auth.users on delete set null,

  waiver_version                  text not null,
  content_snapshot                text not null,

  signer_full_legal_name          text not null,
  signer_initials                 text not null,

  accepted_risk_acknowledgment    boolean not null default false,
  accepted_medical_fitness        boolean not null default false,
  accepted_release_of_liability   boolean not null default false,
  accepted_rules_and_conduct      boolean not null default false,
  scrolled_to_bottom              boolean not null default false
    check (scrolled_to_bottom = true),

  user_agent                      text,
  ip_address                      text,

  signed_at                       timestamptz not null default now()
);

create index if not exists visitor_waivers_request_idx on visitor_waivers (request_id);
create index if not exists visitor_waivers_user_idx on visitor_waivers (user_id, signed_at desc);

alter table visitor_class_requests
  add constraint visitor_class_requests_waiver_fk
  foreign key (waiver_id) references visitor_waivers (id) on delete set null;

-- 4. Visitor Pass ---------------------------------------------------------------
-- Tabela PRÓPRIA, separada de visitor_class_requests, pelo mesmo motivo de
-- authenticity_certificates: o QR precisa ser lido por qualquer um, sem
-- login -- e visitor_class_requests carrega DOB, telefone, motivo de
-- recusa, tudo isso nunca pode ficar público. RLS filtra linha, não coluna,
-- então o jeito certo é uma tabela à parte só com o que é seguro mostrar.

create sequence if not exists visitor_pass_code_seq start 1001;

create or replace function public.gerar_codigo_visitante()
returns text
language sql
volatile
as $$
  select 'VST-' || extract(year from now())::text || '-'
         || lpad(nextval('visitor_pass_code_seq')::text, 6, '0');
$$;

create table if not exists visitor_passes (
  id                     uuid primary key default gen_random_uuid(),
  pass_code              text unique not null default public.gerar_codigo_visitante(),
  request_id             uuid not null unique references visitor_class_requests on delete cascade,
  full_name              text not null,
  requested_class_name   text not null,
  waiver_version         text not null,
  status                 text not null default 'cleared_to_train'
    check (status in ('cleared_to_train', 'expired')),
  cleared_at             timestamptz not null,
  expires_at             timestamptz,
  created_at             timestamptz not null default now()
);

-- 5. Anotações internas ---------------------------------------------------------
-- Cópia exata de promotion_admin_notes: recado da equipe, nunca visível pro
-- visitante.

create table if not exists visitor_request_admin_notes (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references visitor_class_requests on delete cascade,
  note         text not null,
  author_id    uuid references auth.users on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists visitor_request_admin_notes_request_idx
  on visitor_request_admin_notes (request_id, created_at desc);

-- 6. Notificações ---------------------------------------------------------------
-- Cópia exata de auction_notifications -- o único precedente de notificação
-- dentro do app hoje. De propósito NÃO é uma tabela genérica pro app
-- inteiro: cada funcionalidade tem a sua, então esta segue o padrão já
-- estabelecido em vez de inventar infraestrutura nova. Só o app lê/marca
-- como lida; quem insere é sempre uma função security definer.

create table if not exists visitor_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  request_id  uuid references visitor_class_requests on delete set null,
  kind        visitor_notification_kind not null,
  message     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists visitor_notifications_user_idx
  on visitor_notifications (user_id, created_at desc);

-- 7. submit_visitor_class_request() --------------------------------------------
-- Chamada direta pelo visitante (mesmo padrão de dar_lance()). A idade
-- mínima e o checkbox "não garante aprovação" são validados AQUI, não só no
-- formulário -- checagem client-side é conveniência, esta função é o
-- portão de verdade.

create or replace function public.submit_visitor_class_request(
  p_full_name                 text,
  p_email                     text,
  p_phone                     text,
  p_date_of_birth             date,
  p_requested_class_name      text,
  p_requested_date             date,
  p_requested_time             text,
  p_experience_level           visitor_experience_level,
  p_martial_arts_experience    text,
  p_notes_from_visitor         text,
  p_acknowledged_no_guarantee  boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to request a visitor class';
  end if;

  if p_acknowledged_no_guarantee is not true then
    raise exception 'You must acknowledge that submitting a request does not guarantee approval';
  end if;

  if p_date_of_birth is null or p_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'You must be at least 18 years old to request a visitor class';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Full legal name is required';
  end if;
  if coalesce(trim(p_email), '') = '' then
    raise exception 'Email is required';
  end if;
  if coalesce(trim(p_requested_class_name), '') = '' then
    raise exception 'Preferred class is required';
  end if;
  if p_requested_date is null or p_requested_date < current_date then
    raise exception 'Requested date must be today or later';
  end if;

  begin
    insert into visitor_class_requests (
      user_id, full_name, email, phone, date_of_birth,
      requested_class_name, requested_date, requested_time,
      experience_level, martial_arts_experience, notes_from_visitor,
      acknowledged_no_guarantee
    ) values (
      v_uid, trim(p_full_name), trim(p_email), nullif(trim(p_phone), ''), p_date_of_birth,
      trim(p_requested_class_name), p_requested_date, nullif(trim(p_requested_time), ''),
      coalesce(p_experience_level, 'none'), p_martial_arts_experience, p_notes_from_visitor,
      true
    )
    returning id into v_id;
  exception when unique_violation then
    raise exception 'You already have an active visitor request. Check its status before submitting a new one.';
  end;

  return jsonb_build_object('id', v_id);
end;
$$;

revoke all on function public.submit_visitor_class_request(
  text, text, text, date, text, date, text, visitor_experience_level, text, text, boolean
) from public, anon;
grant execute on function public.submit_visitor_class_request(
  text, text, text, date, text, date, text, visitor_experience_level, text, text, boolean
) to authenticated;

-- 8. admin_transition_visitor_request() ----------------------------------------
-- Chamada pelo admin (mesmo padrão de bloquear_lance()): concedida a
-- authenticated, mas confere eh_admin() por dentro -- defesa em profundidade
-- além do RLS. Lista FECHADA de transições permitidas; qualquer outra
-- combinação é rejeitada com erro claro. "cleared_to_train" NUNCA é destino
-- válido aqui, nem pra admin -- só o gatilho da seção 9 pode setar isso.

create or replace function public.admin_transition_visitor_request(
  p_request_id             uuid,
  p_new_status             visitor_request_status,
  p_rejection_reason_code  visitor_rejection_reason default null,
  p_rejection_reason       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     visitor_class_requests%rowtype;
  v_allowed boolean := false;
  v_kind    visitor_notification_kind;
  v_message text;
begin
  if not public.eh_admin() then
    raise exception 'Only admins can review visitor requests';
  end if;

  select * into v_row from visitor_class_requests where id = p_request_id for update;
  if not found then
    raise exception 'Visitor request not found';
  end if;

  v_allowed := (
       (v_row.status = 'submitted' and p_new_status in ('under_review', 'approved_pending_waiver', 'rejected'))
    or (v_row.status = 'under_review' and p_new_status in ('approved_pending_waiver', 'rejected'))
    or (v_row.status = 'approved_pending_waiver' and p_new_status = 'cancelled')
    or (v_row.status = 'cleared_to_train' and p_new_status = 'expired')
  );

  if not v_allowed then
    raise exception 'Cannot move a visitor request from % to %', v_row.status, p_new_status;
  end if;

  if p_new_status = 'rejected' and p_rejection_reason_code is null then
    raise exception 'A decline reason is required';
  end if;

  update visitor_class_requests
  set status = p_new_status,
      reviewed_by = case when p_new_status in ('under_review', 'approved_pending_waiver', 'rejected')
                         then auth.uid() else reviewed_by end,
      reviewed_at = case when p_new_status in ('under_review', 'approved_pending_waiver', 'rejected')
                         then now() else reviewed_at end,
      approved_at = case when p_new_status = 'approved_pending_waiver' then now() else approved_at end,
      rejected_at = case when p_new_status = 'rejected' then now() else rejected_at end,
      rejection_reason_code = case when p_new_status = 'rejected' then p_rejection_reason_code else rejection_reason_code end,
      rejection_reason = case when p_new_status = 'rejected' then p_rejection_reason else rejection_reason end
  where id = p_request_id;

  v_kind := case p_new_status
    when 'approved_pending_waiver' then 'waiver_required'
    when 'rejected' then 'request_rejected'
    when 'expired' then 'request_expired'
    else null
  end;

  if v_kind is not null and v_row.user_id is not null then
    v_message := case v_kind
      when 'waiver_required' then 'Your training request was approved. Sign the liability waiver to be cleared to train.'
      when 'request_rejected' then 'Your training request was not approved.'
      when 'request_expired' then 'Your training clearance has expired.'
    end;
    insert into visitor_notifications (user_id, request_id, kind, message)
    values (v_row.user_id, v_row.id, v_kind, v_message);
  end if;

  if p_new_status = 'expired' then
    update visitor_passes set status = 'expired' where request_id = p_request_id;
  end if;

  return jsonb_build_object('status', p_new_status);
end;
$$;

revoke all on function public.admin_transition_visitor_request(
  uuid, visitor_request_status, visitor_rejection_reason, text
) from public, anon;
grant execute on function public.admin_transition_visitor_request(
  uuid, visitor_request_status, visitor_rejection_reason, text
) to authenticated;

-- 9. sign_visitor_waiver() + evaluate_visitor_clearance() -----------------------
-- Assinar é a única ação do visitante que pode levar a cleared_to_train --
-- mas quem decide isso de fato é o GATILHO depois do insert, não esta
-- função. Ao contrário do Vault (cobrança no Stripe -> webhook assíncrono),
-- aqui a assinatura em si já é o evento final observável pelo servidor, então
-- um gatilho simples basta -- sem pg_cron, sem pg_net.

create or replace function public.sign_visitor_waiver(
  p_request_id                      uuid,
  p_signer_full_legal_name          text,
  p_signer_initials                 text,
  p_accepted_risk_acknowledgment    boolean,
  p_accepted_medical_fitness        boolean,
  p_accepted_release_of_liability   boolean,
  p_accepted_rules_and_conduct      boolean,
  p_scrolled_to_bottom              boolean,
  p_content_snapshot                text,
  p_waiver_version                  text,
  p_user_agent                      text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_row       visitor_class_requests%rowtype;
  v_waiver_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to sign the waiver';
  end if;

  select * into v_row from visitor_class_requests where id = p_request_id for update;
  if not found then
    raise exception 'Visitor request not found';
  end if;

  if v_row.user_id is distinct from v_uid then
    raise exception 'This waiver does not belong to your account';
  end if;

  if v_row.status <> 'approved_pending_waiver' then
    raise exception 'This request is not ready for a waiver signature';
  end if;

  if p_accepted_risk_acknowledgment is not true
     or p_accepted_medical_fitness is not true
     or p_accepted_release_of_liability is not true
     or p_accepted_rules_and_conduct is not true then
    raise exception 'All acknowledgments must be accepted to sign the waiver';
  end if;

  if p_scrolled_to_bottom is not true then
    raise exception 'Please read the full waiver before signing';
  end if;

  if coalesce(trim(p_signer_full_legal_name), '') = '' or coalesce(trim(p_signer_initials), '') = '' then
    raise exception 'Full legal name and initials are required to sign';
  end if;

  -- Reconfere maioridade a partir do pedido -- defesa em profundidade, o
  -- mesmo dado já foi checado na submissão.
  if v_row.date_of_birth is null or v_row.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'You must be at least 18 years old to train at this academy';
  end if;

  insert into visitor_waivers (
    request_id, user_id, waiver_version, content_snapshot,
    signer_full_legal_name, signer_initials,
    accepted_risk_acknowledgment, accepted_medical_fitness,
    accepted_release_of_liability, accepted_rules_and_conduct,
    scrolled_to_bottom, user_agent, ip_address
  ) values (
    p_request_id, v_uid, p_waiver_version, p_content_snapshot,
    trim(p_signer_full_legal_name), trim(p_signer_initials),
    true, true, true, true,
    true, p_user_agent, inet_client_addr()::text
  )
  returning id into v_waiver_id;

  return jsonb_build_object('waiverId', v_waiver_id);
end;
$$;

revoke all on function public.sign_visitor_waiver(
  uuid, text, text, boolean, boolean, boolean, boolean, boolean, text, text, text
) from public, anon;
grant execute on function public.sign_visitor_waiver(
  uuid, text, text, boolean, boolean, boolean, boolean, boolean, text, text, text
) to authenticated;

-- evaluate_visitor_clearance(): gatilho só-sistema. O revoke abaixo é defesa
-- em profundidade (mesmo raciocínio de confirmar_cobranca_leilao) -- o
-- gatilho dispara de qualquer forma, ninguém precisa (nem consegue) chamar
-- isto direto com um id arbitrário.

create or replace function public.evaluate_visitor_clearance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row visitor_class_requests%rowtype;
begin
  select * into v_row from visitor_class_requests where id = new.request_id for update;

  if not found then
    raise exception 'Visitor request not found for this waiver';
  end if;

  if v_row.status <> 'approved_pending_waiver' then
    raise exception 'Visitor request is not awaiting a waiver';
  end if;

  if v_row.approved_at is null then
    raise exception 'Visitor request has not been approved by an admin';
  end if;

  if v_row.user_id is distinct from new.user_id then
    raise exception 'Waiver does not match the visitor request owner';
  end if;

  if v_row.date_of_birth is null or v_row.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'Visitor does not meet the minimum age requirement';
  end if;

  update visitor_class_requests
  set status = 'cleared_to_train',
      cleared_at = now(),
      waiver_id = new.id,
      expires_at = now() + interval '90 days'
  where id = new.request_id;

  insert into visitor_passes (
    request_id, full_name, requested_class_name, waiver_version, cleared_at, expires_at
  ) values (
    v_row.id, v_row.full_name, v_row.requested_class_name, new.waiver_version,
    now(), now() + interval '90 days'
  );

  if v_row.user_id is not null then
    insert into visitor_notifications (user_id, request_id, kind, message)
    values (v_row.user_id, v_row.id, 'cleared_to_train',
      'You''re cleared to train! Your waiver was received and your visit is confirmed.');
  end if;

  return new;
end;
$$;

revoke all on function public.evaluate_visitor_clearance() from public, anon, authenticated;

drop trigger if exists visitor_waiver_evaluates_clearance on visitor_waivers;
create trigger visitor_waiver_evaluates_clearance
  after insert on visitor_waivers
  for each row execute function public.evaluate_visitor_clearance();

-- 10. Permissões ------------------------------------------------------------------

alter table visitor_class_requests enable row level security;
alter table visitor_waivers enable row level security;
alter table visitor_passes enable row level security;
alter table visitor_request_admin_notes enable row level security;
alter table visitor_notifications enable row level security;

drop policy if exists "le o proprio pedido de visita" on visitor_class_requests;
create policy "le o proprio pedido de visita" on visitor_class_requests
  for select to authenticated
  using (user_id = auth.uid() or public.eh_admin());

drop policy if exists "le o proprio termo assinado" on visitor_waivers;
create policy "le o proprio termo assinado" on visitor_waivers
  for select to authenticated
  using (user_id = auth.uid() or public.eh_admin());

-- Propósito inteiro é alguém escanear o QR sem estar logado -- select
-- público de verdade, sem checar usuário nenhum.
drop policy if exists "visitor pass publico" on visitor_passes;
create policy "visitor pass publico" on visitor_passes
  for select
  using (true);

drop policy if exists "admin gerencia visitor pass" on visitor_passes;
create policy "admin gerencia visitor pass" on visitor_passes
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "admin le anotacoes de visitante" on visitor_request_admin_notes;
create policy "admin le anotacoes de visitante" on visitor_request_admin_notes
  for select to authenticated
  using (public.eh_admin());

drop policy if exists "admin escreve anotacoes de visitante" on visitor_request_admin_notes;
create policy "admin escreve anotacoes de visitante" on visitor_request_admin_notes
  for insert to authenticated
  with check (public.eh_admin());

drop policy if exists "notificacoes de visita proprias" on visitor_notifications;
create policy "notificacoes de visita proprias" on visitor_notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "marca notificacao de visita como lida" on visitor_notifications;
create policy "marca notificacao de visita como lida" on visitor_notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Confere o resultado
select 'visitor_class_requests' as tabela, count(*) as linhas from visitor_class_requests
union all
select 'visitor_waivers', count(*) from visitor_waivers
union all
select 'visitor_passes', count(*) from visitor_passes
union all
select 'visitor_request_admin_notes', count(*) from visitor_request_admin_notes
union all
select 'visitor_notifications', count(*) from visitor_notifications;
