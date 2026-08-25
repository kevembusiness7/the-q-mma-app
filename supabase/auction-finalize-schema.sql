-- THE Q VAULT — fase 5: encerramento automático, cobrança do vencedor e
-- repasse pro segundo colocado quando o primeiro não paga.
--
-- ANTES DE RODAR: habilite as extensões pg_cron e pg_net no painel do
-- Supabase (Database > Extensions) -- são as duas que ligam "rodar isso
-- todo minuto" e "chamar uma Edge Function de dentro do Postgres", e nenhum
-- outro arquivo deste projeto usou nenhuma das duas antes. As duas linhas
-- "create extension" abaixo tentam habilitar sozinhas; se falharem por
-- permissão, habilite pela tela antes e rode este arquivo de novo.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase, depois de já ter rodado
-- auction-bidding-schema.sql. Pode rodar mais de uma vez sem estragar nada.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

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

-- 1. Pedido do vencedor -------------------------------------------------------

do $$ begin
  create type auction_pagamento as enum ('awaiting_payment', 'paid', 'failed', 'defaulted', 'refunded');
exception when duplicate_object then null; end $$;

create sequence if not exists auction_order_number_seq start 1001;

create or replace function public.gerar_numero_leilao()
returns text
language sql
volatile
as $$
  select 'VAULT-' || extract(year from now())::text || '-'
         || lpad(nextval('auction_order_number_seq')::text, 6, '0');
$$;

create table if not exists auction_orders (
  id                        uuid primary key default gen_random_uuid(),
  order_number              text unique not null default public.gerar_numero_leilao(),
  item_id                   uuid not null references auction_items (id) on delete restrict,
  winner_id                 uuid not null references auth.users on delete restrict,
  winning_bid_cents         int not null check (winning_bid_cents > 0),
  -- Cópia do item no momento da venda -- editar o item depois não pode
  -- reescrever o que foi de fato vendido.
  item_title_snapshot       text not null,
  athlete_name_snapshot     text not null,
  payment_status            auction_pagamento not null default 'awaiting_payment',
  payment_retry_deadline    timestamptz,
  stripe_payment_intent_id  text,
  tracking_number           text,
  tracking_carrier          text,
  paid_at                   timestamptz,
  shipped_at                timestamptz,
  delivered_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

drop trigger if exists auction_orders_toca_updated_at on auction_orders;
create trigger auction_orders_toca_updated_at
  before update on auction_orders
  for each row execute function public.toca_updated_at();

create index if not exists auction_orders_winner_idx on auction_orders (winner_id, created_at desc);
create index if not exists auction_orders_item_idx on auction_orders (item_id);
create index if not exists auction_orders_status_idx on auction_orders (payment_status, payment_retry_deadline);

alter table auction_orders enable row level security;

drop policy if exists "pedido de leilao proprio" on auction_orders;
create policy "pedido de leilao proprio" on auction_orders
  for select using (winner_id = auth.uid());

drop policy if exists "admin le pedidos de leilao" on auction_orders;
create policy "admin le pedidos de leilao" on auction_orders
  for select using (public.eh_admin());

drop policy if exists "admin atualiza pedidos de leilao" on auction_orders;
create policy "admin atualiza pedidos de leilao" on auction_orders
  for update using (public.eh_admin()) with check (public.eh_admin());

-- Sem política de insert pra ninguém: só processar_leiloes() (abaixo, security
-- definer) cria pedido -- mesmo desenho de orders/promotion_requests.

-- 2. Chamada assíncrona pra Edge Function --------------------------------------
-- pg_net devolve na hora (é assíncrono de verdade), então processar_leiloes()
-- não fica esperando o Stripe responder -- só entrega o pedido pra
-- cobrar-vencedor-leilao e segue pro próximo item da fila.

create or replace function public.cobrar_leilao_async(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cobrar-vencedor-leilao',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('order_id', p_order_id)
  );
exception when others then
  -- Se pg_net ainda não tiver a URL configurada (ver passo 6 abaixo), não
  -- pode derrubar o fechamento do leilão inteiro por causa disso -- o pedido
  -- já foi criado como awaiting_payment, e dá pra cobrar à mão depois.
  raise warning 'Não consegui chamar cobrar-vencedor-leilao para %: %', p_order_id, sqlerrm;
end;
$$;

-- 3. Confirma/recusa a cobrança (chamadas pelo webhook) ------------------------

create or replace function public.confirmar_cobranca_leilao(p_order_id uuid, p_payment_intent_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido auction_orders%rowtype;
begin
  update auction_orders
  set payment_status = 'paid',
      paid_at = now(),
      stripe_payment_intent_id = p_payment_intent_id,
      payment_retry_deadline = null
  where id = p_order_id and payment_status = 'awaiting_payment'
  returning * into v_pedido;

  if not found then
    return jsonb_build_object('reivindicado', false);
  end if;

  return jsonb_build_object(
    'reivindicado', true,
    'order_number', v_pedido.order_number,
    'winner_id', v_pedido.winner_id,
    'item_id', v_pedido.item_id,
    'winning_bid_cents', v_pedido.winning_bid_cents,
    'item_title_snapshot', v_pedido.item_title_snapshot
  );
end;
$$;

revoke all on function public.confirmar_cobranca_leilao(uuid, text) from public, anon, authenticated;

create or replace function public.marcar_cobranca_falhou(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update auction_orders
  set payment_status = 'failed',
      payment_retry_deadline = now() + interval '24 hours'
  where id = p_order_id and payment_status = 'awaiting_payment';
end;
$$;

revoke all on function public.marcar_cobranca_falhou(uuid) from public, anon, authenticated;

-- 4. Encerramento, aviso de "termina logo" e repasse pro segundo colocado -----
-- Roda todo minuto (agendado no passo 5). Três passagens independentes, cada
-- uma cobrindo um pedaço do relógio do leilão -- nenhuma depende da outra ter
-- rodado no mesmo tick.

create or replace function public.processar_leiloes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item    auction_items%rowtype;
  v_maior   record;
  v_pedido  record;
  v_proximo record;
  v_novo_id uuid;
begin
  -- 4a. Avisa quem tem lance num item que termina em ~1h (janela de 10min
  -- pra não depender do cron rodar no segundo exato).
  for v_item in
    select * from auction_items
    where status = 'live'
      and ends_at between now() + interval '55 minutes' and now() + interval '65 minutes'
      and not ending_soon_notified
  loop
    insert into auction_notifications (user_id, item_id, kind, message)
    select distinct bidder_id, v_item.id, 'ending_soon', '"' || v_item.title || '" ends in about an hour.'
    from auction_bids where item_id = v_item.id and not is_blocked;

    update auction_items set ending_soon_notified = true where id = v_item.id;
  end loop;

  -- 4b. Fecha os leilões que já passaram do horário.
  for v_item in
    select * from auction_items
    where status = 'live' and ends_at <= now()
    for update skip locked
  loop
    select bidder_id, amount_cents into v_maior
    from auction_bids
    where item_id = v_item.id and not is_blocked
    order by amount_cents desc, placed_at asc
    limit 1;

    if v_maior is null then
      update auction_items set status = 'unsold' where id = v_item.id;

    elsif v_item.reserve_price_cents is not null and v_maior.amount_cents < v_item.reserve_price_cents then
      update auction_items set status = 'reserve_not_met' where id = v_item.id;

    else
      update auction_items set status = 'sold' where id = v_item.id;

      insert into auction_orders
        (item_id, winner_id, winning_bid_cents, item_title_snapshot, athlete_name_snapshot, payment_retry_deadline)
      values
        (v_item.id, v_maior.bidder_id, v_maior.amount_cents, v_item.title, v_item.athlete_name, now() + interval '24 hours')
      returning id into v_novo_id;

      insert into auction_notifications (user_id, item_id, kind, message)
      values (v_maior.bidder_id, v_item.id, 'won',
              'You won "' || v_item.title || '" for $' || to_char(v_maior.amount_cents / 100.0, 'FM999999990.00') || '!');

      insert into auction_notifications (user_id, item_id, kind, message)
      select distinct bidder_id, v_item.id, 'lost', '"' || v_item.title || '" has ended.'
      from auction_bids
      where item_id = v_item.id and not is_blocked and bidder_id <> v_maior.bidder_id;

      perform public.cobrar_leilao_async(v_novo_id);
    end if;
  end loop;

  -- 4c. Quem venceu e não pagou dentro do prazo perde a vaga: fica suspenso
  -- de licitar por 90 dias, e o item é oferecido pro próximo lance válido
  -- que ainda não tenha dado calote no MESMO item.
  for v_pedido in
    select * from auction_orders
    where payment_status = 'failed' and payment_retry_deadline <= now()
  loop
    update auction_orders set payment_status = 'defaulted' where id = v_pedido.id;

    update profiles set auction_suspended_until = now() + interval '90 days'
    where id = v_pedido.winner_id;

    select bidder_id, amount_cents into v_proximo
    from auction_bids
    where item_id = v_pedido.item_id
      and not is_blocked
      and bidder_id <> v_pedido.winner_id
      and bidder_id not in (
        select winner_id from auction_orders
        where item_id = v_pedido.item_id and payment_status = 'defaulted'
      )
    order by amount_cents desc, placed_at asc
    limit 1;

    if v_proximo is not null then
      insert into auction_orders
        (item_id, winner_id, winning_bid_cents, item_title_snapshot, athlete_name_snapshot, payment_retry_deadline)
      select id, v_proximo.bidder_id, v_proximo.amount_cents, title, athlete_name, now() + interval '24 hours'
      from auction_items where id = v_pedido.item_id
      returning id into v_novo_id;

      insert into auction_notifications (user_id, item_id, kind, message)
      values (v_proximo.bidder_id, v_pedido.item_id, 'won',
              'The previous winner did not complete payment — you won this auction!');

      perform public.cobrar_leilao_async(v_novo_id);
    end if;
  end loop;
end;
$$;

revoke all on function public.processar_leiloes() from public, anon, authenticated;

-- 5. Agendamento ----------------------------------------------------------------

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'processar-leiloes';
exception when others then null;
end $$;

select cron.schedule('processar-leiloes', '* * * * *', $$select public.processar_leiloes();$$);

-- 6. URL do projeto, pra cobrar_leilao_async saber pra onde chamar -------------
-- Sem isto a chamada à Edge Function falha silenciosamente (o warning acima
-- aparece nos logs, mas o leilão fecha normalmente -- só a cobrança
-- automática que não dispara, e dá pra cobrar à mão). Troque pela URL real
-- do seu projeto se for diferente.

alter database postgres set app.settings.supabase_url = 'https://nruokuqrmnfvidskxrus.supabase.co';

-- Confere o resultado
select jobname, schedule, active from cron.job where jobname = 'processar-leiloes';
