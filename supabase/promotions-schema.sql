-- THE Q MMA — Athlete Promotions: atletas disponíveis, pacotes de divulgação
-- e os pedidos de campanha (upload + pagamento + aprovação antes de postar).
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase. Depende de auth-schema.sql (profiles,
-- is_admin) e de pedidos-schema.sql (toca_updated_at, eh_admin — recriadas
-- aqui também, pelo mesmo motivo do comentário em pedidos-schema.sql).
--
-- Pode rodar mais de uma vez sem estragar nada.

-- 0. Funções de apoio -------------------------------------------------------

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
-- Pagamento (promo_pagamento) é um enum PRÓPRIO, não o pedido_pagamento dos
-- pedidos de loja: são domínios sem relação nenhuma, e um ALTER TYPE feito
-- pensando só em promoção não deve arriscar mexer no enum dos pedidos.
--
-- review_status é separado de payment_status de propósito — o mesmo motivo
-- de pedido_pagamento vs pedido_entrega: pago não é aprovado. O dinheiro
-- pode já ter entrado e o conteúdo ainda estar esperando alguém da equipe
-- olhar antes de virar agenda.

do $$ begin
  create type promo_content_type as enum ('story', 'feed_post', 'reel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_review_status as enum
    ('pending_review', 'under_review', 'approved', 'scheduled', 'posted',
     'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type promo_pagamento as enum
    ('awaiting_payment', 'paid', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

-- 2. Atletas disponíveis para divulgação --------------------------------------
-- Tabela própria, sem ligação com `athletes` (usada pela aba Athletes) nem
-- com o array estático de fighters.ts (usado pela ficha do lutador) -- são
-- dois modelos de atleta já divergentes entre si, e nenhum dos dois tem
-- campo de Instagram. Amarrar promoção a qualquer um dos dois acoplaria essa
-- funcionalidade nova a um problema de dado que já existe, sem necessidade:
-- o `slug` já é o padrão usado em products.owner pra ligar peça a atleta, e é
-- só o que esta tabela precisa pra se encontrar com o resto do site.

create table if not exists promotion_athletes (
  slug                 text primary key,
  name                 text not null,
  photo_url            text,
  bio                  text,
  instagram_handle     text not null,
  followers            int not null default 0 check (followers >= 0),
  engagement_rate      numeric(5,2) check (engagement_rate >= 0),
  avg_story_views      int check (avg_story_views >= 0),
  avg_reel_views       int check (avg_reel_views >= 0),
  -- Interruptor geral: com false, o atleta não aparece na vitrine nem aceita
  -- reserva nova, mesmo que já tenha pacote cadastrado.
  allow_promotions     boolean not null default false,
  -- Teto informativo só -- nada neste arquivo impede passar dele. Fica pronto
  -- pra um dia virar validação de verdade, sem precisar de coluna nova.
  max_promotions_per_week int not null default 3 check (max_promotions_per_week > 0),
  -- Quando os números de Instagram foram atualizados pela última vez -- a
  -- tela mostra "as of {essa data}" ao lado das métricas, pra nunca passar
  -- estimativa velha por dado atual sem avisar.
  stats_updated_at     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists promotion_athletes_touch on promotion_athletes;
create trigger promotion_athletes_touch
  before update on promotion_athletes
  for each row execute function public.toca_updated_at();

-- 3. Pacotes de divulgação ----------------------------------------------------

create table if not exists promotion_packages (
  id                       uuid primary key default gen_random_uuid(),
  athlete_slug             text not null references promotion_athletes(slug) on delete cascade,
  title                    text not null,
  content_type             promo_content_type not null,
  price_cents              int not null check (price_cents >= 0),
  -- Taxa de "monte o conteúdo pra mim", por pacote -- cada pacote tem seu
  -- próprio preço, então a taxa extra acompanha a mesma granularidade em vez
  -- de virar um número solto igual pra loja inteira.
  content_creation_fee_cents int not null default 0 check (content_creation_fee_cents >= 0),
  description              text,
  is_active                boolean not null default true,
  sort_order               int not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists promotion_packages_athlete_idx
  on promotion_packages (athlete_slug, sort_order);

drop trigger if exists promotion_packages_touch on promotion_packages;
create trigger promotion_packages_touch
  before update on promotion_packages
  for each row execute function public.toca_updated_at();

-- 4. Número do pedido de promoção ---------------------------------------------
-- Sequência própria, separada de order_number_seq -- promoção e pedido de
-- loja são históricos diferentes, contados à parte.

create sequence if not exists promo_request_number_seq start 1001;

create or replace function public.gerar_numero_promocao()
returns text
language sql
volatile
as $$
  select 'PROMO-' || extract(year from now())::text || '-'
         || lpad(nextval('promo_request_number_seq')::text, 6, '0');
$$;

-- 5. Pedidos de promoção -------------------------------------------------------
-- Nome do atleta e dados do pacote são COPIADOS aqui na hora da reserva, pelo
-- mesmo motivo de order_items: se o preço do pacote mudar depois, ou o
-- atleta for removido, o pedido antigo continua mostrando o que foi
-- combinado e pago de fato.

create table if not exists promotion_requests (
  id                          uuid primary key default gen_random_uuid(),
  request_number              text unique not null default public.gerar_numero_promocao(),
  user_id                     uuid references auth.users on delete set null,

  athlete_slug                text references promotion_athletes(slug) on delete set null,
  athlete_name_snapshot       text not null,

  package_id                  uuid references promotion_packages(id) on delete set null,
  package_title_snapshot      text not null,
  package_content_type        promo_content_type not null,
  package_price_cents         int not null check (package_price_cents >= 0),

  needs_content_creation      boolean not null default false,
  content_creation_fee_cents  int not null default 0 check (content_creation_fee_cents >= 0),

  requested_date               date not null,
  -- Nulo até aprovar. O admin pode confirmar a mesma data pedida ou remarcar.
  scheduled_date               date,

  review_status                promo_review_status not null default 'pending_review',
  -- Só existe quando review_status = 'rejected'. Ao contrário das anotações
  -- internas dos pedidos de loja, este texto é MOSTRADO pro cliente em My
  -- Promotions -- por isso mora na tabela principal, não numa tabela à parte.
  rejection_reason             text,

  payment_status                promo_pagamento not null default 'awaiting_payment',
  currency                      text not null default 'usd',
  total_cents                   int not null check (total_cents >= 0),
  stripe_session_id             text unique,
  stripe_payment_intent_id      text,

  -- Caminhos no bucket promotion-uploads, não URL pública -- lidos só via
  -- signed URL, gerado sob demanda pra quem for admin.
  campaign_logo_path            text,
  campaign_media_path           text not null,
  campaign_caption              text,
  campaign_website_link         text,
  campaign_business_instagram   text not null,
  campaign_cta                  text,
  campaign_notes                text,

  paid_at                        timestamptz,
  posted_at                      timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

create index if not exists promotion_requests_user_idx
  on promotion_requests (user_id, created_at desc);
create index if not exists promotion_requests_review_idx
  on promotion_requests (review_status, created_at desc);

-- Trava de agenda: substitui um calendário visual. Enquanto o pedido não for
-- cancelado ou rejeitado, ele "segura" a data daquele atleta -- inclusive
-- ainda em awaiting_payment, porque é a única forma de duas pessoas não
-- saírem as duas com checkout válido pro mesmo atleta no mesmo dia. Uma
-- sessão do Stripe abandonada expira e o webhook solta a data (ver
-- stripe-webhook/index.ts).
create unique index if not exists promotion_requests_athlete_date_open_idx
  on promotion_requests (athlete_slug, requested_date)
  where review_status not in ('cancelled', 'rejected');

drop trigger if exists promotion_requests_touch on promotion_requests;
create trigger promotion_requests_touch
  before update on promotion_requests
  for each row execute function public.toca_updated_at();

-- 6. Anotações internas ---------------------------------------------------------
-- Mesmo motivo de order_admin_notes: RLS filtra linha, não coluna. Recado da
-- equipe sobre um pedido de promoção (ex.: "estorno feito no Stripe em
-- 12/09") não pode aparecer pro cliente que só tem select na própria linha.

create table if not exists promotion_admin_notes (
  id            uuid primary key default gen_random_uuid(),
  promotion_id  uuid not null references promotion_requests on delete cascade,
  note          text not null,
  author_id     uuid references auth.users on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists promotion_admin_notes_promo_idx
  on promotion_admin_notes (promotion_id, created_at desc);

-- 7. Confirmação do pagamento -----------------------------------------------
-- Irmã mais simples de confirmar_pagamento (pedidos-schema.sql): sem baixa de
-- estoque, porque reserva de data não é peça física. Mesma reivindicação
-- atômica (`where payment_status = 'awaiting_payment'`) contra reenvio do
-- webhook do Stripe. review_status fica INTOCADO -- pagar nunca aprova.

create or replace function public.confirmar_pagamento_promocao(promo_id uuid, dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  linha promotion_requests%rowtype;
begin
  update promotion_requests
     set payment_status           = 'paid',
         paid_at                  = now(),
         stripe_payment_intent_id = coalesce(dados->>'payment_intent_id', stripe_payment_intent_id),
         total_cents              = coalesce((dados->>'total_cents')::int, total_cents)
   where id = promo_id
     and payment_status = 'awaiting_payment'
  returning * into linha;

  if not found then
    return jsonb_build_object('reivindicado', false);
  end if;

  return jsonb_build_object(
    'reivindicado', true,
    'request_number', linha.request_number,
    'total_cents', linha.total_cents
  );
end;
$$;

revoke execute on function public.confirmar_pagamento_promocao(uuid, jsonb)
  from public, anon, authenticated;

-- 8. Storage ------------------------------------------------------------------

-- Anexos da campanha (logo + foto/vídeo). Privado -- só o dono do pedido
-- sobe, só admin lê (via signed URL). Ao contrário de support-attachments,
-- não libera `anon`: reserva envolve dinheiro de verdade, precisa de conta
-- de verdade por trás pra existir disputa/reembolso.
insert into storage.buckets (id, name, public, file_size_limit)
values ('promotion-uploads', 'promotion-uploads', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "envia anexo de campanha" on storage.objects;
create policy "envia anexo de campanha" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'promotion-uploads');

drop policy if exists "admin le anexo de campanha" on storage.objects;
create policy "admin le anexo de campanha" on storage.objects
  for select to authenticated
  using (bucket_id = 'promotion-uploads' and public.eh_admin());

-- Foto de perfil do atleta na vitrine. Pública de propósito -- é material de
-- divulgação mostrado pra qualquer visitante, então exigir signed URL pra
-- cada card do grid seria custo sem ganho nenhum de privacidade.
insert into storage.buckets (id, name, public)
values ('promotion-athlete-photos', 'promotion-athlete-photos', true)
on conflict (id) do nothing;

drop policy if exists "admin sobe foto de atleta" on storage.objects;
create policy "admin sobe foto de atleta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'promotion-athlete-photos' and public.eh_admin());

drop policy if exists "admin atualiza foto de atleta" on storage.objects;
create policy "admin atualiza foto de atleta" on storage.objects
  for update to authenticated
  using (bucket_id = 'promotion-athlete-photos' and public.eh_admin())
  with check (bucket_id = 'promotion-athlete-photos' and public.eh_admin());

-- 9. Permissões -----------------------------------------------------------------
-- Atleta e pacote são vitrine: qualquer visitante lê o que está disponível
-- pra divulgação/ativo, admin lê e escreve tudo. Pedido de promoção segue o
-- mesmo desenho de orders: sem política de insert -- só a Edge Function, com
-- a service role, cria a linha (preço é validado no servidor, nunca confiado
-- do app). Cliente lê os próprios; admin lê e atualiza todos.

alter table promotion_athletes enable row level security;
alter table promotion_packages enable row level security;
alter table promotion_requests enable row level security;
alter table promotion_admin_notes enable row level security;

drop policy if exists "le atletas disponiveis" on promotion_athletes;
create policy "le atletas disponiveis" on promotion_athletes
  for select to anon, authenticated
  using (allow_promotions = true or public.eh_admin());

drop policy if exists "admin gerencia atletas" on promotion_athletes;
create policy "admin gerencia atletas" on promotion_athletes
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "le pacotes ativos" on promotion_packages;
create policy "le pacotes ativos" on promotion_packages
  for select to anon, authenticated
  using (is_active = true or public.eh_admin());

drop policy if exists "admin gerencia pacotes" on promotion_packages;
create policy "admin gerencia pacotes" on promotion_packages
  for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "le as proprias promocoes" on promotion_requests;
create policy "le as proprias promocoes" on promotion_requests
  for select to authenticated
  using (user_id = auth.uid() or public.eh_admin());

drop policy if exists "admin atualiza promocao" on promotion_requests;
create policy "admin atualiza promocao" on promotion_requests
  for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "admin le anotacoes de promocao" on promotion_admin_notes;
create policy "admin le anotacoes de promocao" on promotion_admin_notes
  for select to authenticated
  using (public.eh_admin());

drop policy if exists "admin escreve anotacoes de promocao" on promotion_admin_notes;
create policy "admin escreve anotacoes de promocao" on promotion_admin_notes
  for insert to authenticated
  with check (public.eh_admin());

-- Confere o resultado
select 'promotion_athletes' as tabela, count(*) as linhas from promotion_athletes
union all
select 'promotion_packages', count(*) from promotion_packages
union all
select 'promotion_requests', count(*) from promotion_requests
union all
select 'promotion_admin_notes', count(*) from promotion_admin_notes;
