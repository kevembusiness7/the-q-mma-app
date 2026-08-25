-- THE Q VAULT — leilão de itens de memorabilia dos atletas.
-- Fase 1: os itens do leilão e a mídia deles (bidding vem em
-- auction-bidding-schema.sql, encerramento/cobrança em
-- auction-finalize-schema.sql — cada fase tem o próprio arquivo, pra rodar
-- só o que já foi implementado em vez de um arquivo gigante de uma vez).
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase. Pode rodar mais de uma vez sem estragar nada.

-- 0. Funções de apoio ---------------------------------------------------------
-- Recriadas aqui pelo mesmo motivo de sempre (ver promotions-schema.sql):
-- cada schema-file é independente e pode ser a primeira coisa que alguém
-- roda num banco novo.

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

-- 1. Tipos ----------------------------------------------------------------------

do $$ begin
  create type auction_status as enum
    ('scheduled', 'live', 'sold', 'reserve_not_met', 'unsold', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type auction_media_kind as enum ('photo', 'video');
exception when duplicate_object then null; end $$;

-- 2. Itens do leilão --------------------------------------------------------------
-- Preço sempre em centavos inteiros, mesmo motivo de sempre (loja/promoções):
-- float em dinheiro perde centavo no arredondamento.

create table if not exists auction_items (
  id                          uuid primary key default gen_random_uuid(),
  slug                        text unique not null,
  title                       text not null,
  -- Nome/slug do atleta são cópia (snapshot), não FK de verdade -- mesmo
  -- raciocínio de order_items copiando dados do produto: um item já
  -- vendido não pode ter a história reescrita por uma edição posterior no
  -- cadastro do atleta. athlete_slug é só pra montar o link "ver perfil".
  athlete_name                text not null,
  athlete_slug                text,
  event_name                  text,
  opponent_name               text,
  fight_date                  date,
  fight_result                text,
  -- A frase do atleta ("usei estas luvas..."), quando tiver.
  athlete_quote               text,
  description                 text not null default '',
  story                       text not null default '',
  condition                   text not null default '',
  autograph_location          text,
  authenticity_note           text,
  starting_price_cents        int not null default 0 check (starting_price_cents >= 0),
  -- Confidencial -- nunca sai pro cliente, só o "bateu ou não bateu a
  -- reserva" (ver RLS abaixo: sem policy pública nesta coluna específica
  -- não dá pra fazer no Postgres, então quem NUNCA deve selecionar esta
  -- coluna pro público é o código do app, não o banco).
  reserve_price_cents         int check (reserve_price_cents >= 0),
  min_increment_cents         int not null default 2500 check (min_increment_cents > 0),
  -- Desnormalizado de propósito: a grade pública nunca precisa consultar
  -- auction_bids pra mostrar "Current Bid" e "N bids" de cada card.
  current_bid_cents           int not null default 0,
  bid_count                   int not null default 0,
  starts_at                   timestamptz not null,
  ends_at                     timestamptz not null,
  -- Preserva o horário original de encerramento mesmo depois de estender
  -- por anti-sniping, só pra UI poder mostrar "estendido".
  original_ends_at            timestamptz not null,
  extended_count              int not null default 0,
  ending_soon_notified        boolean not null default false,
  status                      auction_status not null default 'scheduled',
  fight_worn                  boolean not null default false,
  autographed                 boolean not null default false,
  one_of_one                  boolean not null default false,
  ships_domestic_cents        int not null default 0,
  -- Nulo = não envia pra fora dos EUA.
  ships_international_cents   int,
  is_active                   boolean not null default true,
  sort_order                  int not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

drop trigger if exists auction_items_toca_updated_at on auction_items;
create trigger auction_items_toca_updated_at
  before update on auction_items
  for each row execute function public.toca_updated_at();

create index if not exists auction_items_status_idx on auction_items (status, ends_at);
create index if not exists auction_items_sort_idx on auction_items (sort_order, created_at);

-- 3. Mídia (fotos e vídeo) --------------------------------------------------------

create table if not exists auction_media (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid not null references auction_items (id) on delete cascade,
  kind                auction_media_kind not null default 'photo',
  url                 text not null,
  -- Marca a foto "atleta usando o item" pra destacar na galeria.
  is_athlete_wearing  boolean not null default false,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);

create index if not exists auction_media_item_idx on auction_media (item_id, sort_order);

-- 4. Bucket de mídia ----------------------------------------------------------------
-- Mesmo desenho de promotion-athlete-photos: é vitrine pública, então não
-- há por que exigir signed URL pra cada foto/vídeo do grid.

insert into storage.buckets (id, name, public)
values ('auction-media', 'auction-media', true)
on conflict (id) do nothing;

drop policy if exists "admin sobe midia de leilao" on storage.objects;
create policy "admin sobe midia de leilao" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'auction-media' and public.eh_admin());

drop policy if exists "admin atualiza midia de leilao" on storage.objects;
create policy "admin atualiza midia de leilao" on storage.objects
  for update to authenticated
  using (bucket_id = 'auction-media' and public.eh_admin())
  with check (bucket_id = 'auction-media' and public.eh_admin());

drop policy if exists "admin apaga midia de leilao" on storage.objects;
create policy "admin apaga midia de leilao" on storage.objects
  for delete to authenticated
  using (bucket_id = 'auction-media' and public.eh_admin());

-- 5. Permissões -----------------------------------------------------------------
-- Vitrine é pública (qualquer visitante navega o Vault sem login), escrita
-- é só de admin -- preço/reserva/incremento são a base do leilão, nenhum
-- cliente pode encostar neles.

alter table auction_items enable row level security;
alter table auction_media enable row level security;

drop policy if exists "vault publico" on auction_items;
create policy "vault publico" on auction_items
  for select to anon, authenticated using (is_active);

drop policy if exists "admin gerencia itens do leilao" on auction_items;
create policy "admin gerencia itens do leilao" on auction_items
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "midia publica" on auction_media;
create policy "midia publica" on auction_media
  for select to anon, authenticated using (true);

drop policy if exists "admin gerencia midia do leilao" on auction_media;
create policy "admin gerencia midia do leilao" on auction_media
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- Confere o resultado
select slug, title, status, current_bid_cents, bid_count, starts_at, ends_at
from auction_items
order by sort_order, created_at;
