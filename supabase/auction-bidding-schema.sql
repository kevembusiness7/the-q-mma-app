-- THE Q VAULT — fase 3: verificação de cartão e lance manual.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase, depois de já ter rodado auction-schema.sql.
-- Pode rodar mais de uma vez sem estragar nada.

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

-- 1. Colunas novas em profiles ------------------------------------------------
-- stripe_payment_method_id é preenchido só pelo webhook (SetupIntent
-- confirmado); auction_suspended_until é pra quem venceu e não pagou (ver
-- fase 5). Nenhuma das duas pode ser editada direto pelo cliente -- mesmo
-- raciocínio (e o mesmo tipo de gatilho) de stripe_customer_id em
-- pedidos-schema.sql.

alter table profiles add column if not exists stripe_payment_method_id text;
alter table profiles add column if not exists bid_verified_at timestamptz;
alter table profiles add column if not exists auction_suspended_until timestamptz;

create or replace function public.protege_pagamento_leilao()
returns trigger
language plpgsql
as $$
begin
  if (new.stripe_payment_method_id is distinct from old.stripe_payment_method_id
      or new.bid_verified_at is distinct from old.bid_verified_at
      or new.auction_suspended_until is distinct from old.auction_suspended_until)
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Campos de leilão só podem ser alterados pelo servidor';
  end if;
  return new;
end;
$$;

do $$ begin
  if to_regclass('public.profiles') is null then return; end if;
  drop trigger if exists protege_pagamento_leilao on profiles;
  create trigger protege_pagamento_leilao
    before update on profiles
    for each row execute function public.protege_pagamento_leilao();
end $$;

-- 2. Endereço de envio do licitante --------------------------------------------
-- Uma linha por usuário (upsert). Fica separado do fluxo de cobrança de
-- propósito: o prazo de 12-24h pra cobrar o vencedor não pode travar
-- esperando alguém preencher endereço -- "My Bids" pede o endereço depois
-- que o pedido já está pago, se ainda não tiver um salvo.

create table if not exists auction_shipping_addresses (
  user_id       uuid primary key references auth.users on delete cascade,
  full_name     text not null,
  address_line1 text not null,
  address_line2 text,
  city          text not null,
  state         text not null,
  postal_code   text not null,
  country       text not null default 'US',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists auction_shipping_toca_updated_at on auction_shipping_addresses;
create trigger auction_shipping_toca_updated_at
  before update on auction_shipping_addresses
  for each row execute function public.toca_updated_at();

alter table auction_shipping_addresses enable row level security;

drop policy if exists "endereco proprio" on auction_shipping_addresses;
create policy "endereco proprio" on auction_shipping_addresses
  for select using (user_id = auth.uid());

drop policy if exists "admin le enderecos" on auction_shipping_addresses;
create policy "admin le enderecos" on auction_shipping_addresses
  for select using (public.eh_admin());

drop policy if exists "salva o proprio endereco" on auction_shipping_addresses;
create policy "salva o proprio endereco" on auction_shipping_addresses
  for insert with check (user_id = auth.uid());

drop policy if exists "atualiza o proprio endereco" on auction_shipping_addresses;
create policy "atualiza o proprio endereco" on auction_shipping_addresses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Notificações ---------------------------------------------------------------
-- Só o app lê/marca como lida; quem insere é sempre uma função
-- security definer (dar_lance aqui, o encerramento do leilão na fase 5) --
-- nunca o cliente direto.

do $$ begin
  create type auction_notification_kind as enum
    ('outbid', 'won', 'lost', 'ending_soon', 'payment_failed', 'shipped');
exception when duplicate_object then null; end $$;

create table if not exists auction_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  item_id     uuid references auction_items (id) on delete set null,
  kind        auction_notification_kind not null,
  message     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists auction_notifications_user_idx on auction_notifications (user_id, created_at desc);

alter table auction_notifications enable row level security;

drop policy if exists "notificacoes proprias" on auction_notifications;
create policy "notificacoes proprias" on auction_notifications
  for select using (user_id = auth.uid());

drop policy if exists "marca notificacao como lida" on auction_notifications;
create policy "marca notificacao como lida" on auction_notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4. Lances -----------------------------------------------------------------------
-- Sem política de insert: só a função dar_lance (security definer) grava
-- aqui. Leitura é pública -- bidder_id é um uuid opaco, não identifica
-- ninguém sozinho, então expor "quem" deu o lance não é o mesmo risco que
-- expor nome/e-mail; isso evita a complicação de uma view com semântica de
-- RLS por dono, que este projeto ainda não usa em lugar nenhum.

create table if not exists auction_bids (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references auction_items (id) on delete cascade,
  bidder_id     uuid not null references auth.users on delete cascade,
  amount_cents  int not null check (amount_cents > 0),
  is_blocked    boolean not null default false,
  placed_at     timestamptz not null default now()
);

create index if not exists auction_bids_item_idx on auction_bids (item_id, amount_cents desc, placed_at);
create index if not exists auction_bids_bidder_idx on auction_bids (bidder_id, placed_at desc);

alter table auction_bids enable row level security;

drop policy if exists "lances publicos" on auction_bids;
create policy "lances publicos" on auction_bids
  for select using (not is_blocked);

drop policy if exists "admin ve todos os lances" on auction_bids;
create policy "admin ve todos os lances" on auction_bids
  for select using (public.eh_admin());

drop policy if exists "admin bloqueia lance" on auction_bids;
create policy "admin bloqueia lance" on auction_bids
  for update using (public.eh_admin()) with check (public.eh_admin());

-- 5. dar_lance() ------------------------------------------------------------------
-- Trava a linha do item (for update) antes de checar/gravar, pra dois
-- lances simultâneos no mesmo item nunca "ganharem" os dois. Mesmo
-- raciocínio de confirmar_pagamento_promocao: uma função só, que faz tudo
-- de forma atômica.

create or replace function public.dar_lance(p_item_id uuid, p_valor_centavos int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item             auction_items%rowtype;
  v_perfil           profiles%rowtype;
  v_lance_minimo     int;
  v_bidder_anterior  uuid;
  v_estendido        boolean := false;
  v_uid              uuid := auth.uid();
  v_ativos           int;
begin
  if v_uid is null then
    raise exception 'Sign in to place a bid';
  end if;

  if p_valor_centavos is null or p_valor_centavos <= 0 then
    raise exception 'Invalid bid amount';
  end if;

  select * into v_item from auction_items where id = p_item_id for update;
  if not found then
    raise exception 'This item was not found';
  end if;

  if v_item.status <> 'live' or now() < v_item.starts_at or now() >= v_item.ends_at then
    raise exception 'This auction is not open for bids right now';
  end if;

  select * into v_perfil from profiles where id = v_uid;
  if v_perfil.stripe_payment_method_id is null then
    raise exception 'Verify a card before placing a bid';
  end if;
  if v_perfil.auction_suspended_until is not null and v_perfil.auction_suspended_until > now() then
    raise exception 'Your account is temporarily suspended from bidding';
  end if;

  -- Contas com menos de 7 dias ficam limitadas a 3 leilões diferentes por
  -- vez, pra dificultar spam com conta descartável.
  if v_perfil.created_at > now() - interval '7 days' then
    select count(distinct ab.item_id) into v_ativos
    from auction_bids ab
    join auction_items ai on ai.id = ab.item_id
    where ab.bidder_id = v_uid and not ab.is_blocked and ai.status = 'live';

    if v_ativos >= 3 and not exists (
      select 1 from auction_bids where item_id = p_item_id and bidder_id = v_uid
    ) then
      raise exception 'New accounts can only bid on up to 3 live auctions at once';
    end if;
  end if;

  v_lance_minimo := case
    when v_item.current_bid_cents > 0 then v_item.current_bid_cents + v_item.min_increment_cents
    else v_item.starting_price_cents
  end;

  if p_valor_centavos < v_lance_minimo then
    raise exception 'Bid must be at least %s cents', v_lance_minimo;
  end if;

  select bidder_id into v_bidder_anterior
  from auction_bids
  where item_id = p_item_id and not is_blocked
  order by amount_cents desc, placed_at asc
  limit 1;

  insert into auction_bids (item_id, bidder_id, amount_cents)
  values (p_item_id, v_uid, p_valor_centavos);

  -- Anti-sniping: lance nos últimos 2 minutos estende o encerramento em
  -- mais 2 minutos, pra ninguém conseguir dar o lance final sem chance de
  -- resposta.
  if v_item.ends_at - now() < interval '2 minutes' then
    v_item.ends_at := now() + interval '2 minutes';
    v_estendido := true;
  end if;

  update auction_items
  set current_bid_cents = p_valor_centavos,
      bid_count = bid_count + 1,
      ends_at = v_item.ends_at,
      extended_count = extended_count + (case when v_estendido then 1 else 0 end)
  where id = p_item_id;

  if v_bidder_anterior is not null and v_bidder_anterior <> v_uid then
    insert into auction_notifications (user_id, item_id, kind, message)
    values (v_bidder_anterior, p_item_id, 'outbid', 'You''ve been outbid on "' || v_item.title || '".');
  end if;

  return jsonb_build_object(
    'currentBidCents', p_valor_centavos,
    'bidCount', v_item.bid_count + 1,
    'endsAt', v_item.ends_at,
    'extended', v_estendido
  );
end;
$$;

revoke all on function public.dar_lance(uuid, int) from public, anon;
grant execute on function public.dar_lance(uuid, int) to authenticated;

-- 6. Realtime -----------------------------------------------------------------------
-- Primeira vez que este projeto usa Realtime: a página do item assina
-- mudanças em auction_items (preço/contagem/prazo) e auction_bids (lista de
-- lances) pra atualizar sozinha, sem F5.

do $$ begin
  alter publication supabase_realtime add table auction_items;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table auction_bids;
exception when duplicate_object then null; end $$;

-- Confere o resultado
select column_name from information_schema.columns
where table_name = 'profiles' and column_name in
  ('stripe_payment_method_id', 'bid_verified_at', 'auction_suspended_until');
