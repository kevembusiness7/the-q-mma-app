-- THE Q MMA — pedidos, itens e confirmação de pagamento.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase. Depende de loja-schema.sql (product_variants).
--
-- Pode rodar mais de uma vez sem estragar nada.

-- 0. Funções de apoio -------------------------------------------------------
-- Estas duas nasceram no support-schema.sql. Recriadas aqui de propósito:
-- `create or replace` não estraga nada se já existirem, e um banco que rodou
-- só parte dos scripts antigos pode ter uma sem a outra — foi exatamente o
-- que aconteceu. Um script de schema que quebra por dependência invisível é
-- pior do que um que repete três linhas.

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
-- Pagamento e entrega são estados SEPARADOS de propósito: um pedido pago pode
-- não ter sido despachado, e misturar os dois num campo só confunde estorno
-- com devolução. Versão enxuta para o lançamento; estados de reembolso
-- parcial e retirada ficam para quando existirem de verdade.

do $$ begin
  create type pedido_pagamento as enum
    ('awaiting_payment', 'paid', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pedido_entrega as enum
    ('unfulfilled', 'processing', 'shipped', 'delivered');
exception when duplicate_object then null; end $$;

-- 2. Número do pedido -------------------------------------------------------
-- Sequência do Postgres, e não count(*)+1: a sequência é atômica, então dois
-- checkouts no mesmo instante nunca recebem o mesmo número.

create sequence if not exists order_number_seq start 1001;

create or replace function public.gerar_numero_pedido()
returns text
language sql
volatile
as $$
  select 'QMMA-' || extract(year from now())::text || '-'
         || lpad(nextval('order_number_seq')::text, 6, '0');
$$;

-- 3. Pedidos ----------------------------------------------------------------

create table if not exists orders (
  id                       uuid primary key default gen_random_uuid(),
  order_number             text unique not null default public.gerar_numero_pedido(),
  -- Nulo em compra de visitante. O e-mail é o vínculo que resta.
  user_id                  uuid references auth.users on delete set null,
  email                    text,
  payment_status           pedido_pagamento not null default 'awaiting_payment',
  fulfillment_status       pedido_entrega not null default 'unfulfilled',
  currency                 text not null default 'usd',
  -- Tudo em centavos inteiros, como no resto da loja.
  subtotal_cents           int not null check (subtotal_cents >= 0),
  shipping_cents           int not null default 0 check (shipping_cents >= 0),
  tax_cents                int not null default 0 check (tax_cents >= 0),
  discount_cents           int not null default 0 check (discount_cents >= 0),
  total_cents              int not null check (total_cents >= 0),
  stripe_session_id        text unique,
  stripe_payment_intent_id text,
  -- Cópia do endereço usado NESTA compra. O endereço do perfil pode mudar
  -- depois; o do pedido não. Preenchido pelo webhook, vindo do Stripe.
  ship_name                text,
  ship_line1               text,
  ship_line2               text,
  ship_city                text,
  ship_state               text,
  ship_postal_code         text,
  ship_country             text,
  tracking_number          text,
  tracking_carrier         text,
  paid_at                  timestamptz,
  shipped_at               timestamptz,
  delivered_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Recado interno da equipe NÃO mora aqui. RLS filtra LINHAS, não colunas: se
-- a anotação ficasse em orders, o próprio cliente leria "estoque faltou,
-- decidir se estorna" no select do pedido dele. Ver tabela order_admin_notes.
alter table orders drop column if exists internal_note;

-- Quando o aviso de "seu pedido saiu" foi mandado. Existe para o painel
-- distinguir "ainda não avisei" de "já avisei" — sem isso, um clique repetido
-- vira um segundo e-mail para o cliente e ninguém sabe quantos já foram.
alter table orders add column if not exists shipping_email_sent_at timestamptz;

create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_payment_idx on orders (payment_status, created_at desc);

drop trigger if exists orders_touch on orders;
create trigger orders_touch
  before update on orders
  for each row execute function public.toca_updated_at();

-- 4. Itens do pedido --------------------------------------------------------
-- Nome, SKU e preço são COPIADOS aqui no momento da compra. Se o produto
-- mudar de nome ou preço depois, o pedido antigo continua mostrando o que
-- foi comprado de fato. variant_id é referência com set null: apagar uma
-- variação não pode apagar o histórico de venda dela.

create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders on delete cascade,
  variant_id       uuid references product_variants on delete set null,
  product_id       uuid references products on delete set null,
  sku              text not null,
  product_name     text not null,
  color_name       text not null,
  size             text not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity         int not null check (quantity > 0),
  image_url        text
);

create index if not exists order_items_order_idx on order_items (order_id);

-- 5. Anotações internas -----------------------------------------------------
-- Tabela separada porque a política de leitura do cliente é por linha: ele lê
-- o pedido dele inteiro, colunas e tudo. O que a equipe escreve sobre o
-- pedido (estoque faltou, cliente pediu estorno, suspeita de fraude) só pode
-- existir onde o cliente não tem política nenhuma de select.

create table if not exists order_admin_notes (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders on delete cascade,
  note       text not null,
  -- Nulo quando quem escreveu foi o sistema (webhook), não uma pessoa.
  author_id  uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_admin_notes_order_idx
  on order_admin_notes (order_id, created_at desc);

-- 6. Confirmação do pagamento -----------------------------------------------
-- UMA função, UMA transação: marca como pago, grava os dados do Stripe e dá
-- baixa no estoque. Estavam separados antes — PATCH e depois RPC — e isso
-- tinha um buraco real: se a função morresse entre os dois, o pedido ficava
-- 'paid' com o estoque intacto, e o reenvio do Stripe batia na reivindicação,
-- via que já estava pago e voltava sem nunca tentar a baixa de novo. Numa
-- transação só, qualquer falha desfaz tudo e o reenvio recomeça do zero.
--
-- A reivindicação é o `where payment_status = 'awaiting_payment'`: o Stripe
-- reenvia eventos, e dois completed processados juntos passariam ambos por um
-- "buscar, checar, atualizar". Aqui só um dos dois altera a linha; o outro
-- recebe reivindicado=false e para — sem baixar estoque duas vezes.

create or replace function public.confirmar_pagamento(pedido uuid, dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  linha    orders%rowtype;
  item     record;
  alterou  int;
  faltaram text[] := '{}';
begin
  update orders
     set payment_status           = 'paid',
         fulfillment_status       = 'processing',
         paid_at                  = now(),
         email                    = coalesce(dados->>'email', email),
         stripe_payment_intent_id = coalesce(dados->>'payment_intent_id',
                                             stripe_payment_intent_id),
         subtotal_cents           = coalesce((dados->>'subtotal_cents')::int, subtotal_cents),
         shipping_cents           = coalesce((dados->>'shipping_cents')::int, shipping_cents),
         tax_cents                = coalesce((dados->>'tax_cents')::int, tax_cents),
         total_cents              = coalesce((dados->>'total_cents')::int, total_cents),
         ship_name                = coalesce(dados->>'ship_name', ship_name),
         ship_line1               = coalesce(dados->>'ship_line1', ship_line1),
         ship_line2               = coalesce(dados->>'ship_line2', ship_line2),
         ship_city                = coalesce(dados->>'ship_city', ship_city),
         ship_state               = coalesce(dados->>'ship_state', ship_state),
         ship_postal_code         = coalesce(dados->>'ship_postal_code', ship_postal_code),
         ship_country             = coalesce(dados->>'ship_country', ship_country)
   where id = pedido
     and payment_status = 'awaiting_payment'
  returning * into linha;

  if not found then
    -- Pedido inexistente, já pago ou já cancelado. Nos três casos não há
    -- nada a fazer — e principalmente nada a baixar.
    return jsonb_build_object('reivindicado', false);
  end if;

  -- O decremento é condicional (stock >= quantidade) e atômico por linha:
  -- nunca deixa estoque negativo. A ORDEM FIXA por variant_id não é enfeite:
  -- dois pedidos que compartilham as mesmas variações, confirmados no mesmo
  -- instante, travariam um ao outro se cada um pegasse as linhas em ordem
  -- diferente. Ordenados, o segundo apenas espera.
  for item in
    select variant_id, sku, quantity
      from order_items
     where order_id = pedido
     order by variant_id
  loop
    if item.variant_id is null then
      faltaram := faltaram || item.sku;
      continue;
    end if;

    update product_variants
       set stock = stock - item.quantity
     where id = item.variant_id
       and stock >= item.quantity;

    get diagnostics alterou = row_count;
    if alterou = 0 then
      faltaram := faltaram || item.sku;
    end if;
  end loop;

  -- Corrida real: duas pessoas pagaram pela última peça quase juntas. O
  -- pedido não é recusado — o dinheiro já entrou — mas fica anotado para a
  -- equipe decidir entre estornar e repor.
  if array_length(faltaram, 1) > 0 then
    insert into order_admin_notes (order_id, note)
    values (pedido, 'ATENCAO: estoque insuficiente na baixa para: '
                    || array_to_string(faltaram, ', '));
  end if;

  return jsonb_build_object(
    'reivindicado', true,
    'order_number', linha.order_number,
    'email',        linha.email,
    'total_cents',  linha.total_cents,
    'faltaram',     to_jsonb(faltaram)
  );
end;
$$;

-- Só o backend (service role) confirma pagamento. Sem isto, qualquer usuário
-- autenticado marcaria o próprio pedido como pago chamando a RPC.
revoke execute on function public.confirmar_pagamento(uuid, jsonb)
  from public, anon, authenticated;

-- A baixa isolada não existe mais: virou parte da transação acima.
drop function if exists public.baixar_estoque(uuid);

-- 7. Permissões -------------------------------------------------------------
-- Não existe política de INSERT nem de pagamento: pedido é criado e marcado
-- como pago apenas pelas Edge Functions, com a service role — que ignora RLS.
-- O cliente lê os próprios pedidos; o admin lê e atualiza todos (rastreio,
-- status de entrega). Visitante não lê nada: a confirmação dele é o e-mail.

alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_admin_notes enable row level security;

drop policy if exists "le os proprios pedidos" on orders;
create policy "le os proprios pedidos" on orders
  for select to authenticated
  using (user_id = auth.uid() or public.eh_admin());

drop policy if exists "admin atualiza pedido" on orders;
create policy "admin atualiza pedido" on orders
  for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "le itens dos proprios pedidos" on order_items;
create policy "le itens dos proprios pedidos" on order_items
  for select to authenticated
  using (exists (
    select 1 from orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.eh_admin())
  ));

-- Nenhuma política para o cliente aqui, de propósito: sem política, sem
-- leitura. É o ponto inteiro de a anotação morar numa tabela separada.
drop policy if exists "admin le anotacoes" on order_admin_notes;
create policy "admin le anotacoes" on order_admin_notes
  for select to authenticated
  using (public.eh_admin());

drop policy if exists "admin escreve anotacoes" on order_admin_notes;
create policy "admin escreve anotacoes" on order_admin_notes
  for insert to authenticated
  with check (public.eh_admin());

-- 8. Chamado ligado ao pedido ------------------------------------------------
-- O botão "Get help with this order" abre o suporte já sabendo de qual pedido
-- se trata. Sem isto o cliente escreve "meu pedido não chegou" e a equipe
-- gasta uma ida e volta só para descobrir qual é.
--
-- Guardado por to_regclass porque `support_tickets` nasce em
-- support-schema.sql: se aquele script ainda não rodou, este pula o trecho em
-- vez de quebrar no meio.

-- Categoria própria para chamado de pedido. Sem ela o assunto cai em
-- "Payment" ou "Other" e some no meio da caixa de entrada.
--
-- Fica solta, fora de qualquer DO: o Postgres não deixa ALTER TYPE ADD VALUE
-- rodar dentro de bloco de transação, e um DO é um.
alter type ticket_category add value if not exists 'order';

do $$ begin
  if to_regclass('public.support_tickets') is null then
    raise notice 'support_tickets ainda não existe — rode support-schema.sql e depois este arquivo de novo.';
    return;
  end if;

  alter table support_tickets
    add column if not exists order_id uuid references orders on delete set null;

  create index if not exists support_tickets_order_idx
    on support_tickets (order_id) where order_id is not null;
end $$;

-- Abrir chamado citando um pedido: só o dono do pedido pode.
--
-- O order_id vem do app, e o app é do usuário — sem esta trava, alguém
-- anexaria o chamado ao pedido de outra pessoa e a equipe abriria a ficha
-- errada. Visitante sem conta (auth.uid() nulo) só consegue abrir chamado
-- sem vínculo, e é o certo: ele não tem como provar que o pedido é dele.
do $$ begin
  if to_regclass('public.support_tickets') is null then return; end if;

  drop policy if exists "abre chamado" on support_tickets;
  create policy "abre chamado" on support_tickets
    for insert to anon, authenticated
    with check (
      (user_id is null or user_id = auth.uid())
      and (
        order_id is null
        or exists (
          select 1 from orders o where o.id = order_id and o.user_id = auth.uid()
        )
      )
    );
end $$;

-- Confere o resultado
select 'orders' as tabela, count(*) as linhas from orders
union all
select 'order_items', count(*) from order_items
union all
select 'order_admin_notes', count(*) from order_admin_notes;
