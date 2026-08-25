-- THE Q VAULT — fase 7: certificado digital de autenticidade.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase, depois de já ter rodado
-- auction-finalize-schema.sql. Pode rodar mais de uma vez sem estragar nada.

-- 1. Certificados -----------------------------------------------------------------

create sequence if not exists auction_certificate_number_seq start 1001;

create or replace function public.gerar_numero_certificado()
returns text
language sql
volatile
as $$
  select 'QMMA-CERT-' || extract(year from now())::text || '-'
         || lpad(nextval('auction_certificate_number_seq')::text, 6, '0');
$$;

create table if not exists authenticity_certificates (
  id                      uuid primary key default gen_random_uuid(),
  cert_number             text unique not null default public.gerar_numero_certificado(),
  order_id                uuid not null references auction_orders (id) on delete cascade,
  athlete_name            text not null,
  item_title              text not null,
  event_name              text,
  fight_date              date,
  photo_url               text,
  fight_worn              boolean not null default false,
  autographed             boolean not null default false,
  autograph_location      text,
  buyer_name_snapshot     text,
  issued_at               timestamptz not null default now()
);

create unique index if not exists authenticity_certificates_order_idx on authenticity_certificates (order_id);

alter table authenticity_certificates enable row level security;

-- O propósito inteiro é alguém escanear o QR sem estar logado e ver que o
-- item é autêntico -- select público de verdade, sem checar usuário nenhum.
drop policy if exists "certificado publico" on authenticity_certificates;
create policy "certificado publico" on authenticity_certificates
  for select using (true);

drop policy if exists "admin gerencia certificados" on authenticity_certificates;
create policy "admin gerencia certificados" on authenticity_certificates
  for all using (public.eh_admin()) with check (public.eh_admin());

-- 2. confirmar_cobranca_leilao ganha a emissão do certificado -------------------
-- Mesma função da fase 5, substituída aqui: emite o certificado no mesmo
-- instante em que reivindica o pagamento -- não dois passos separados, que
-- deixariam uma janela onde o pedido está pago mas sem certificado nenhum se
-- algo falhar no meio.

create or replace function public.confirmar_cobranca_leilao(p_order_id uuid, p_payment_intent_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido      auction_orders%rowtype;
  v_item        auction_items%rowtype;
  v_foto        text;
  v_comprador   text;
  v_cert_numero text;
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

  select * into v_item from auction_items where id = v_pedido.item_id;

  select url into v_foto
  from auction_media
  where item_id = v_pedido.item_id and kind = 'photo'
  order by sort_order
  limit 1;

  select coalesce(full_name, email) into v_comprador from profiles where id = v_pedido.winner_id;

  insert into authenticity_certificates
    (order_id, athlete_name, item_title, event_name, fight_date, photo_url,
     fight_worn, autographed, autograph_location, buyer_name_snapshot)
  values
    (v_pedido.id, v_pedido.athlete_name_snapshot, v_pedido.item_title_snapshot,
     v_item.event_name, v_item.fight_date, v_foto,
     coalesce(v_item.fight_worn, false), coalesce(v_item.autographed, false),
     v_item.autograph_location, v_comprador)
  returning cert_number into v_cert_numero;

  return jsonb_build_object(
    'reivindicado', true,
    'order_number', v_pedido.order_number,
    'winner_id', v_pedido.winner_id,
    'item_id', v_pedido.item_id,
    'winning_bid_cents', v_pedido.winning_bid_cents,
    'item_title_snapshot', v_pedido.item_title_snapshot,
    'cert_number', v_cert_numero
  );
end;
$$;

revoke all on function public.confirmar_cobranca_leilao(uuid, text) from public, anon, authenticated;

-- Confere o resultado
select cert_number, athlete_name, item_title, issued_at from authenticity_certificates order by issued_at desc;
