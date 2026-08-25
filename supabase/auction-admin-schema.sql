-- THE Q VAULT — fase 8: bloquear lance suspeito.
--
-- COMO USAR: copie o conteúdo DESTE arquivo (não o caminho) e cole no SQL
-- Editor do painel do Supabase, depois de já ter rodado
-- auction-bidding-schema.sql. Pode rodar mais de uma vez sem estragar nada.
--
-- (Pausar/cancelar leilão, confirmar pagamento e marcar enviado/entregue já
-- dão pra fazer com o que existe desde as fases 1 e 5 -- admin tem UPDATE
-- liberado em auction_items e auction_orders pelo RLS. O que faltava era só
-- isto: bloquear um lance sem deixar o preço/contagem do item errados.)

create or replace function public.eh_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.bloquear_lance(p_bid_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id        uuid;
  v_novo_maior     int;
  v_nova_contagem  int;
begin
  if not public.eh_admin() then
    raise exception 'Only admins can block a bid';
  end if;

  update auction_bids set is_blocked = true where id = p_bid_id
  returning item_id into v_item_id;

  if v_item_id is null then
    raise exception 'Bid not found';
  end if;

  select amount_cents into v_novo_maior
  from auction_bids
  where item_id = v_item_id and not is_blocked
  order by amount_cents desc, placed_at asc
  limit 1;

  select count(*) into v_nova_contagem
  from auction_bids where item_id = v_item_id and not is_blocked;

  update auction_items
  set current_bid_cents = coalesce(v_novo_maior, 0),
      bid_count = v_nova_contagem
  where id = v_item_id;
end;
$$;

revoke all on function public.bloquear_lance(uuid) from public, anon;
grant execute on function public.bloquear_lance(uuid) to authenticated;
